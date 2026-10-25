#!/usr/bin/env bash
# Исправление медленной загрузки через мобильные сети.
# Частая причина на облачных серверах: крупные пакеты теряются по пути (проблема MTU),
# маленькие страницы открываются, большие — зависают. Через VPN всё работает, потому что VPN режет пакеты мельче.
# Запуск под root:  bash /var/www/gasanovdoc/deploy/net-fix.sh
set -euo pipefail
echo "== Текущий MTU сетевых интерфейсов"
ip -o link | awk '{print "  " $2, $4, $5}'

echo "== Включаю автоподбор размера пакетов (TCP MTU probing)"
cat > /etc/sysctl.d/99-gasanovdoc-net.conf <<'CONF'
net.ipv4.tcp_mtu_probing = 1
net.ipv4.tcp_base_mss = 1024
CONF
sysctl -q --system

echo "== Ограничиваю размер TCP-сегмента (MSS 1360) — постоянно, после перезагрузки тоже"
cat > /etc/systemd/system/gasanovdoc-mss.service <<'UNIT'
[Unit]
Description=Clamp TCP MSS for mobile networks
After=network-online.target ufw.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/sh -c 'iptables -t mangle -C OUTPUT -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360 2>/dev/null || iptables -t mangle -A OUTPUT -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360'
ExecStart=/bin/sh -c 'iptables -t mangle -C INPUT -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360 2>/dev/null || iptables -t mangle -A INPUT -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360'

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now gasanovdoc-mss.service
iptables -t mangle -S | grep TCPMSS | sed 's/^/  /'

echo "== Включаю HTTP/2 для HTTPS (быстрее на мобильных)"
CONF=/etc/nginx/sites-available/gasanovdoc
if grep -q 'listen 443 ssl;' "$CONF" && ! grep -q 'http2 on' "$CONF"; then
  sed -i 's/listen 443 ssl;/listen 443 ssl;\n    http2 on;/' "$CONF"
fi
nginx -t && systemctl reload nginx

echo "Готово. Проверьте сайт с телефона без VPN."
