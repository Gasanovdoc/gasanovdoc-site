#!/usr/bin/env bash
# Первичная настройка сервера Ubuntu 24.04 для gasanovdoc.ru.
# Запуск под root:  bash setup.sh
# Скрипт спросит пароль приложения Яндекс Почты и токен бота — они сохраняются только на сервере.
set -euo pipefail
REPO="https://github.com/Gasanovdoc/gasanovdoc-site.git"
APP=/var/www/gasanovdoc
DOMAIN=gasanovdoc.ru

echo "== Обновление системы и установка пакетов"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y nginx certbot python3-certbot-nginx git ufw fail2ban unattended-upgrades curl ca-certificates
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "== Межсетевой экран: открыты только SSH, HTTP, HTTPS"
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== Пользователь и каталоги"
id gasanovdoc >/dev/null 2>&1 || useradd --system --home /var/lib/gasanovdoc --shell /usr/sbin/nologin gasanovdoc
install -d -o gasanovdoc -g gasanovdoc -m 700 /var/lib/gasanovdoc
install -d -m 750 /etc/gasanovdoc

echo "== Код сайта"
if [ ! -d "$APP/.git" ]; then git clone "$REPO" "$APP"; else git -C "$APP" pull --ff-only; fi
cd "$APP" && npm ci && npm run build
cd "$APP/server" && npm ci --omit=dev

echo "== Секреты (вводятся с клавиатуры, на экране не отображаются)"
if [ ! -f /etc/gasanovdoc/api.env ]; then
  read -rp  "Почта Яндекса для отправки (например gasanov.ns@yandex.ru): " SMTP_USER
  read -rsp "Пароль приложения Яндекс Почты: " SMTP_PASS; echo
  read -rp  "Куда присылать заявки [${SMTP_USER}]: " MAIL_TO; MAIL_TO=${MAIL_TO:-$SMTP_USER}
  read -rsp "Токен Telegram-бота (Enter — пропустить): " TG_TOKEN; echo
  TG_CHAT_ID=""
  if [ -n "$TG_TOKEN" ]; then
    echo "Напишите своему боту /start в Telegram и нажмите Enter"; read -r
    TG_TOKEN="$TG_TOKEN" node "$APP/server/tg-chat-id.mjs" || true
    read -rp "Введите chat_id из строки выше: " TG_CHAT_ID
  fi
  umask 077
  cat > /etc/gasanovdoc/api.env <<ENV
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
MAIL_TO=$MAIL_TO
TG_TOKEN=$TG_TOKEN
TG_CHAT_ID=$TG_CHAT_ID
DATA_DIR=/var/lib/gasanovdoc
ENV
  chown root:gasanovdoc /etc/gasanovdoc/api.env && chmod 640 /etc/gasanovdoc/api.env
fi

echo "== Служба приёма заявок"
cp "$APP/deploy/gasanovdoc-api.service" /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now gasanovdoc-api

echo "== Nginx"
grep -q "zone=api" /etc/nginx/nginx.conf || sed -i 's/^http {/http {\n\tlimit_req_zone $binary_remote_addr zone=api:1m rate=6r\/m;/' /etc/nginx/nginx.conf
cp "$APP/deploy/nginx-gasanovdoc.conf" /etc/nginx/sites-available/gasanovdoc
ln -sf /etc/nginx/sites-available/gasanovdoc /etc/nginx/sites-enabled/gasanovdoc
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "== Резервная копия заявок каждую ночь (хранится 30 дней)"
cat > /etc/cron.daily/gasanovdoc-backup <<'CRON'
#!/bin/sh
install -d -m 700 /var/backups/gasanovdoc
tar -czf /var/backups/gasanovdoc/zayavki-$(date +%F).tgz -C /var/lib gasanovdoc 2>/dev/null
find /var/backups/gasanovdoc -name 'zayavki-*.tgz' -mtime +30 -delete
CRON
chmod 755 /etc/cron.daily/gasanovdoc-backup

echo "== HTTPS-сертификат Let's Encrypt"
read -rp "Почта для уведомлений Let's Encrypt: " LE_MAIL
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect --agree-tos -m "$LE_MAIL" -n

echo "Готово: https://$DOMAIN"
curl -fsS "https://$DOMAIN/api/health" && echo " — приём заявок работает"
