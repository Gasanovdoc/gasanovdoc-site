#!/usr/bin/env bash
# Доводка настройки: проверяет, что уже работает, и заново проходит шаги Telegram и HTTPS.
# Запуск под root:  bash /var/www/gasanovdoc/deploy/finish.sh
set -uo pipefail
APP=/var/www/gasanovdoc
ENVF=/etc/gasanovdoc/api.env
DOMAIN=gasanovdoc.ru
IP=$(curl -4 -fsS -m 10 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
ok(){ echo "  [OK] $*"; }
bad(){ echo "  [!!] $*"; }

echo "== 1. Проверка того, что уже настроено"
systemctl is-active --quiet nginx && ok "веб-сервер nginx работает" || bad "nginx не запущен"
systemctl is-active --quiet gasanovdoc-api && ok "служба заявок работает" || { bad "служба заявок не запущена"; journalctl -u gasanovdoc-api -n 15 --no-pager; }
curl -fsS -m 5 http://127.0.0.1:3001/api/health >/dev/null && ok "приём заявок отвечает" || bad "приём заявок не отвечает"
[ -f "$ENVF" ] && ok "файл настроек есть" || bad "файла настроек нет — запустите setup.sh ещё раз"
grep -q '^SMTP_PASS=.\+' "$ENVF" 2>/dev/null && ok "пароль почты сохранён" || bad "пароль почты не сохранён"

echo "== 2. Telegram"
if curl -fsS -m 10 -o /dev/null https://api.telegram.org; then
  ok "сервер видит api.telegram.org"
  TOKEN=$(grep '^TG_TOKEN=' "$ENVF" | cut -d= -f2-)
  CHAT=$(grep '^TG_CHAT_ID=' "$ENVF" | cut -d= -f2-)
  if [ -z "$TOKEN" ]; then read -rsp "  Вставьте токен бота и нажмите Enter: " TOKEN; echo; fi
  if [ -z "$CHAT" ]; then
    echo "  Откройте бота в Telegram, отправьте ему /start, затем вернитесь сюда и нажмите Enter"; read -r
    TG_TOKEN="$TOKEN" node "$APP/server/tg-chat-id.mjs"
    read -rp "  Введите число chat_id из строки выше (Enter — пропустить): " CHAT
  fi
  sed -i "s|^TG_TOKEN=.*|TG_TOKEN=$TOKEN|; s|^TG_CHAT_ID=.*|TG_CHAT_ID=$CHAT|" "$ENVF"
  systemctl restart gasanovdoc-api
  if [ -n "$CHAT" ]; then
    curl -fsS -m 10 -o /dev/null "https://api.telegram.org/bot$TOKEN/sendMessage" -d chat_id="$CHAT" -d text="Проверка: сигналы о заявках с сайта будут приходить сюда." \
      && ok "тестовое сообщение отправлено — проверьте Telegram" || bad "сообщение не отправилось — проверьте токен и chat_id"
  fi
else
  bad "сервер не может достучаться до Telegram (вероятно, ограничения доступа из РФ). Сайт и почта работают без этого; сигнал в Telegram настроим позже."
fi

echo "== 3. Домен и HTTPS"
DNS=$(getent ahostsv4 $DOMAIN | awk 'NR==1{print $1}')
if [ "$DNS" = "$IP" ]; then
  ok "домен $DOMAIN указывает на этот сервер ($IP)"
  if [ -d /etc/letsencrypt/live/$DOMAIN ]; then ok "сертификат уже выпущен"
  else
    read -rp "  Почта для уведомлений Let's Encrypt: " LE_MAIL
    W=""; [ "$(getent ahostsv4 www.$DOMAIN | awk 'NR==1{print $1}')" = "$IP" ] && W="-d www.$DOMAIN"
    certbot --nginx -d $DOMAIN $W --redirect --agree-tos -m "$LE_MAIL" -n && ok "HTTPS включён" || bad "сертификат не выпущен — пришлите текст ошибки выше"
  fi
else
  bad "домен пока указывает на '${DNS:-ничего}', а сервер — $IP. DNS ещё обновляется: подождите 30–60 минут и запустите этот скрипт снова."
fi

echo "== Итог"
curl -fsS -m 10 -o /dev/null "http://$IP/" && ok "сайт открывается по IP: http://$IP/" || bad "сайт по IP не открывается"
