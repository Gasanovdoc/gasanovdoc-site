// Проверка перед запуском: на сайте не должно остаться пометок для автора и незаполненных реквизитов.
import fs from 'node:fs';
import path from 'node:path';
const bad = [/class="chk"/, /ПРОВЕРИТЬ/, /заполнить до запуска/];
const hits = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) { const s = fs.readFileSync(p, 'utf8'); for (const re of bad) if (re.test(s)) hits.push(`${p}: ${re}`); }
  }
})('dist');
if (hits.length) { console.error('Перед запуском исправить:\n' + hits.join('\n')); process.exit(1); }
console.log('Пометок нет — можно публиковать.');
