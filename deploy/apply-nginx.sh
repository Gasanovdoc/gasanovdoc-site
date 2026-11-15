#!/usr/bin/env bash
# Настройки nginx, которые сервер применяет сам при обновлении сайта (вызывается из update.sh).
# Сейчас: HTML-страницы всегда сверяются с сервером (Cache-Control: no-cache),
# чтобы на телефоне изменения были видны сразу. Фото, видео и стили кэшируются как раньше.
# Повторный запуск ничего не меняет. При ошибке возвращает прежние настройки.
set -uo pipefail
CONF="${1:-/etc/nginx/sites-available/gasanovdoc}"
BAK=/root/gasanovdoc-nginx-cache.bak

[ -f "$CONF" ] || { echo "nginx: файл настроек не найден, пропускаю"; exit 0; }
if grep -q 'location / { expires -1;' "$CONF"; then exit 0; fi
if ! grep -q 'location / { try_files' "$CONF"; then
  echo "nginx: строка 'location / { try_files' не найдена, кэш страниц не настроен" >&2
  exit 1
fi

cp "$CONF" "$BAK"
sed -i 's|location / { try_files|location / { expires -1; try_files|' "$CONF"
if nginx -t 2>/dev/null; then
  systemctl reload nginx
  echo "nginx: кэш страниц настроен (Cache-Control: no-cache для HTML)"
else
  cp "$BAK" "$CONF"
  echo "nginx: проверка не прошла, прежние настройки возвращены" >&2
  exit 1
fi
