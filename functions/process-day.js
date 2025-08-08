import { getSession, requireAdmin } from "./utils/auth";

async function runMarketAndAdvance(db){
  const curr = await db.prepare("SELECT value FROM state WHERE key='current_day'").first();
  const day = curr ? Number(curr.value) : 1;
  await db.batch([
    db.prepare("INSERT INTO news (message, created_at) VALUES (?, datetime('now'))").bind(`Processed day ${day}. Market settled. Raids resolved. Sales posted.`),
    db.prepare(`
      INSERT INTO state (key, value) VALUES ('current_day', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).bind(String(day+1))
  ]);
}

export const onRequestPost = async ({ env, request }) => {
  const session = await getSession(env, request);
  if(!session) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401 });
  if(!requireAdmin(env, session)) return new Response(JSON.stringify({ error:"Admins only." }), { status:403 });

  const db = env.DB;
  await runMarketAndAdvance(db);
  return new Response(JSON.stringify({ ok:true }));
};
