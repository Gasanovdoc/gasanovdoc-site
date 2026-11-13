#!/usr/bin/env bash
# Однократная установка автообновления. Запуск под root:
#   bash /var/www/gasanovdoc/deploy/install-autoupdate.sh
set -euo pipefail
cat >/etc/systemd/system/gasanovdoc-autoupdate.service <<'UNIT'
[Unit]
Description=gasanovdoc.ru: обновить сайт, если в GitHub есть изменения
After=network-online.target
[Service]
Type=oneshot
ExecStart=/bin/bash /var/www/gasanovdoc/deploy/autoupdate.sh
UNIT
cat >/etc/systemd/system/gasanovdoc-autoupdate.timer <<'UNIT'
[Unit]
Description=gasanovdoc.ru: проверка обновлений каждые 2 минуты
[Timer]
OnBootSec=2min
OnUnitActiveSec=2min
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now gasanovdoc-autoupdate.timer
echo "Автообновление включено. Журнал: journalctl -u gasanovdoc-autoupdate -n 20 --no-pager"
echo "Выключить: systemctl disable --now gasanovdoc-autoupdate.timer"
