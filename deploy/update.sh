#!/usr/bin/env bash
# Обновить сайт до последней версии из GitHub. Запуск под root: bash /var/www/gasanovdoc/deploy/update.sh
set -euo pipefail
cd /var/www/gasanovdoc
git pull --ff-only
npm ci && npm run build
cd server && npm ci --omit=dev
systemctl restart gasanovdoc-api
echo "Сайт обновлён: $(git log -1 --format='%h %s')"
