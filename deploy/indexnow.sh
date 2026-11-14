#!/usr/bin/env bash
# Сообщить Яндексу (IndexNow) обо всех страницах сайта после обновления.
# Ключ не секретный: он лежит на сайте в открытом файле /57a2f2a9828b1851c359a2fcf14a75ea.txt
set -euo pipefail
KEY=57a2f2a9828b1851c359a2fcf14a75ea
cd /var/www/gasanovdoc
URLS=$(grep -oh '<loc>[^<]*</loc>' dist/sitemap-*.xml | sed 's/<[^>]*>//g' | grep -v 'sitemap' | sed 's/.*/"&"/' | paste -sd, -)
curl -sS -m 20 -o /dev/null -w 'IndexNow: ответ Яндекса %{http_code}\n' -X POST 'https://yandex.com/indexnow' \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"gasanovdoc.ru\",\"key\":\"$KEY\",\"keyLocation\":\"https://gasanovdoc.ru/$KEY.txt\",\"urlList\":[$URLS]}"
