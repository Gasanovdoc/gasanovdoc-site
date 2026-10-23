// Узнать chat_id для сигналов: напишите боту /start, затем запустите
//   TG_TOKEN=... node tg-chat-id.mjs
const t = process.env.TG_TOKEN;
if (!t) { console.error('Нужен TG_TOKEN'); process.exit(1); }
const r = await (await fetch(`https://api.telegram.org/bot${t}/getUpdates`)).json();
const chats = new Map();
for (const u of r.result || []) { const c = (u.message || u.my_chat_member || {}).chat; if (c) chats.set(c.id, c.username || c.first_name || ''); }
if (!chats.size) console.log('Сообщений нет. Напишите боту /start и запустите ещё раз.');
for (const [id, who] of chats) console.log(`chat_id: ${id}  (${who})`);
