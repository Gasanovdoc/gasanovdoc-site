import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-'));
process.env.DATA_DIR = dir;
const { server } = await import('./index.mjs');
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (b, ip = '1.1.1.1') => fetch(base + '/api/zayavka', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Real-IP': ip }, body: JSON.stringify(b) });

test('сохраняет корректную заявку', async () => {
  const r = await post({ name: 'Иван', contact: '@ivan', text: 'Болит спина', consent: true });
  assert.equal(r.status, 200);
  const j = await r.json(); assert.equal(j.id, 1);
  const line = JSON.parse(fs.readFileSync(path.join(dir, 'zayavki.jsonl'), 'utf8').trim());
  assert.equal(line.name, 'Иван'); assert.equal(line.consent, true);
  assert.equal((fs.statSync(path.join(dir, 'zayavki.jsonl')).mode & 0o777), 0o600);
});
test('без согласия — 422', async () => {
  const r = await post({ name: 'Иван', contact: '@ivan' }, '2.2.2.2'); assert.equal(r.status, 422);
});
test('без контактов — 422', async () => {
  const r = await post({ name: 'Иван', consent: true }, '3.3.3.3'); assert.equal(r.status, 422);
});
test('ловушка для ботов не сохраняет', async () => {
  const before = fs.readFileSync(path.join(dir, 'zayavki.jsonl'), 'utf8');
  const r = await post({ name: 'bot', contact: 'x', consent: true, website: 'spam' }, '4.4.4.4');
  assert.equal(r.status, 200);
  assert.equal(fs.readFileSync(path.join(dir, 'zayavki.jsonl'), 'utf8'), before);
});
test('ограничение частоты', async () => {
  let last;
  for (let i = 0; i < 6; i++) last = await post({ name: 'A', contact: 'b', consent: true }, '5.5.5.5');
  assert.equal(last.status, 429);
});
test('длинные поля обрезаются', async () => {
  await post({ name: 'x'.repeat(500), contact: 'c', consent: true }, '6.6.6.6');
  const lines = fs.readFileSync(path.join(dir, 'zayavki.jsonl'), 'utf8').trim().split('\n');
  assert.equal(JSON.parse(lines.at(-1)).name.length, 100);
});
test.after(() => server.close());
