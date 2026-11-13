#!/usr/bin/env bash
# Автообновление: если в GitHub (ветка main) появились новые изменения — обновить сайт.
# Запускается таймером systemd gasanovdoc-autoupdate.timer каждые 2 минуты.
set -euo pipefail
cd /var/www/gasanovdoc
exec 9>/run/gasanovdoc-autoupdate.lock
flock -n 9 || exit 0
git fetch -q origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
[ "$LOCAL" = "$REMOTE" ] && exit 0
echo "$(date '+%F %T') обновление ${LOCAL:0:7} -> ${REMOTE:0:7}"
if bash /var/www/gasanovdoc/deploy/update.sh; then
  echo "$(date '+%F %T') готово"
else
  echo "$(date '+%F %T') ОШИБКА обновления, сайт остался на прежней версии сборки" >&2
  exit 1
fi
