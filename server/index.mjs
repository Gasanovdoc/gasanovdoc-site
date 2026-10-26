// Заявки с сайта gasanovdoc.ru.
// 1) сохраняет заявку в файл на сервере (РФ), 2) отправляет полное письмо на почту через SMTP Яндекса,
// 3) шлёт в Telegram только сигнал «Новая заявка №…» — без персональных данных.
// Все секреты — в переменных окружения (файл /etc/gasanovdoc/api.env), в репозитории их нет.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

const env = process.env;
const PORT = Number(env.PORT || 3001);
const HOST = env.HOST || '127.0.0.1';
const DATA_DIR = env.DATA_DIR || '/var/lib/gasanovdoc';
const FILE = path.join(DATA_DIR, 'zayavki.jsonl');
const COUNTER = path.join(DATA_DIR, 'counter');
const RETENTION_DAYS = Number(env.RETENTION_DAYS || 365 * 3);
const LIMITS = { name: 100, contact: 200, phone: 40, link: 500, text: 2000 };

fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });

const mailer = env.SMTP_PASS
  ? nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.yandex.ru', port: Number(env.SMTP_PORT || 465), secure: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : nodemailer.createTransport({ jsonTransport: true }); // режим проверки без отправки

// --- простая защита от спама: не больше 5 заявок с одного адреса за 10 минут
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 5;
}

function nextId() {
  let n = 0;
  try { n = Number(fs.readFileSync(COUNTER, 'utf8')) || 0; } catch {}
  n += 1;
  fs.writeFileSync(COUNTER, String(n), { mode: 0o600 });
  return n;
}

function clean(v, max) {
  return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const reTg = /^(@|https?:\/\/t\.me\/|t\.me\/)?[A-Za-z][A-Za-z0-9_]{4,31}$/;
export function phoneOk(x) {
  const d = x.replace(/\D/g, '');
  if (!/^[+\d\s()\-.]+$/.test(x) || d.length < 10 || d.length > 15) return false;
  if (/^[78]/.test(d) && d.length !== 11 && !x.startsWith('+')) return false;
  return true;
}
export function contactOk(x) { return reEmail.test(x) || reTg.test(x) || phoneOk(x); }

function validate(body) {
  const d = {};
  for (const [k, max] of Object.entries(LIMITS)) d[k] = clean(body[k], max);
  d.lang = body.lang === 'en' ? 'en' : 'ru';
  if (!d.name) return [null, 'name'];
  if (!d.contact && !d.phone) return [null, 'contact'];
  if (d.contact && !contactOk(d.contact)) return [null, 'contact'];
  if (d.phone && !phoneOk(d.phone)) return [null, 'phone'];
  if (body.consent !== true) return [null, 'consent'];
  return [d, null];
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sendMail(rec) {
  const rows = [
    ['Имя', rec.name], ['Почта / Telegram', rec.contact], ['Телефон', rec.phone],
    ['Ссылка на снимки', rec.link], ['Что беспокоит', rec.text], ['Язык сайта', rec.lang],
    ['Получена', new Date(rec.received_at).toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg' })],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v || '—'}`).join('\n') + '\n\nСогласие на обработку ПДн: дано (версия ' + rec.consent_version + ')';
  const html = '<table cellpadding="6" style="font:14px/1.5 Arial,sans-serif;border-collapse:collapse">' +
    rows.map(([k, v]) => `<tr><td style="color:#777;vertical-align:top">${k}</td><td>${esc(v || '—').replace(/\n/g, '<br>')}</td></tr>`).join('') +
    `</table><p style="font:12px Arial;color:#999">Согласие на обработку ПДн: дано (версия ${rec.consent_version})</p>`;
  await mailer.sendMail({
    from: `"Сайт gasanovdoc.ru" <${env.SMTP_USER || 'site@gasanovdoc.ru'}>`,
    to: env.MAIL_TO || env.SMTP_USER,
    subject: `Заявка №${rec.id} с сайта`,
    text, html,
  });
}

async function signalTelegram(id) {
  if (!env.TG_TOKEN || !env.TG_CHAT_ID) return;
  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: `Новая заявка №${id} с сайта. Подробности — в почте.` }),
  });
  if (!r.ok) throw new Error('telegram ' + r.status);
}

// удаляем заявки старше срока хранения (политика: не дольше 3 лет)
function prune() {
  try {
    if (!fs.existsSync(FILE)) return;
    const border = Date.now() - RETENTION_DAYS * 864e5;
    const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean);
    const keep = lines.filter((l) => { try { return Date.parse(JSON.parse(l).received_at) >= border; } catch { return false; } });
    if (keep.length !== lines.length) fs.writeFileSync(FILE, keep.map((l) => l + '\n').join(''), { mode: 0o600 });
  } catch (e) { console.error('prune', e.message); }
}
prune();
setInterval(prune, 864e5).unref();

function reply(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

export const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') return reply(res, 200, { ok: true });
  if (req.url !== '/api/zayavka') return reply(res, 404, { ok: false });
  if (req.method !== 'POST') return reply(res, 405, { ok: false });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return reply(res, 415, { ok: false });

  let size = 0; const chunks = [];
  req.on('data', (c) => { size += c.length; if (size > 20000) req.destroy(); else chunks.push(c); });
  req.on('end', async () => {
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(res, 400, { ok: false, error: 'json' }); }
    if (body && body.website) return reply(res, 200, { ok: true }); // ловушка для ботов: молча игнорируем
    const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress || '');
    if (limited(ip)) return reply(res, 429, { ok: false, error: 'rate' });
    const [d, err] = validate(body || {});
    if (err) return reply(res, 422, { ok: false, error: err });

    const rec = { id: nextId(), received_at: new Date().toISOString(), consent: true, consent_version: env.CONSENT_VERSION || '2026-10-24', ...d };
    try {
      fs.appendFileSync(FILE, JSON.stringify(rec) + '\n', { mode: 0o600 });
    } catch (e) {
      console.error('save failed', e.message);
      return reply(res, 500, { ok: false });
    }
    reply(res, 200, { ok: true, id: rec.id });
    // письмо и сигнал — после ответа, чтобы посетитель не ждал; ошибки только в журнал
    sendMail(rec).catch((e) => console.error(`mail #${rec.id} failed:`, e.message));
    signalTelegram(rec.id).catch((e) => console.error(`telegram #${rec.id} failed:`, e.message));
  });
});

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  server.listen(PORT, HOST, () => console.log(`gasanovdoc-api: http://${HOST}:${PORT}`));
}
