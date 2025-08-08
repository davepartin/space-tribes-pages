import { getSession } from "./utils/auth";

export const onRequestPost = async ({ env, request }) => {
  const session = await getSession(env, request);
  if(!session) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401 });

  const db = env.DB;
  const bodyText = await request.text();
  let body;
  try { body = JSON.parse(bodyText || "{}"); } catch { body = { raw: bodyText }; }

  const current = await db.prepare("SELECT value FROM state WHERE key='current_day'").first();
  const current_day = current ? Number(current.value) : 1;

  await db.batch([
    db.prepare(`
      INSERT INTO decisions (player_id, day, payload, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(player_id, day) DO UPDATE SET payload=excluded.payload, updated_at=datetime('now')
    `).bind(session.id, current_day, JSON.stringify(body))
  ]);

  return new Response(JSON.stringify({ ok:true }));
};
