// GET /game-data/me
import { getSession } from "../utils/auth";

export const onRequestGet = async ({ env, request }) => {
  const session = await getSession(env, request);
  if(!session) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401 });

  const db = env.DB;

  const current = await db.prepare("SELECT value FROM state WHERE key='current_day'").first();
  const current_day = current ? Number(current.value) : 1;

  const user = await db.prepare("SELECT id, name FROM players WHERE id = ?").bind(session.id).first();
  if(!user) return new Response(JSON.stringify({ error:"User missing" }), { status:401 });

  // Everyone can see submission status for today (no payloads, just yes/no)
  const submissions = await db.prepare(`
    SELECT p.id, p.name,
           CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END AS submitted
    FROM players p
    LEFT JOIN decisions d
      ON p.id = d.player_id
     AND d.day = ?
    ORDER BY p.name
  `).bind(current_day).all();

  const news = await db.prepare(`
    SELECT created_at, message
    FROM news
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  const payload = {
    ok: true,
    currentDay: current_day,
    currentUser: user,
    submissionsToday: submissions.results.map(r => ({
      id: r.id, name: r.name, submitted: !!r.submitted
    })),
    news: news.results
  };

  return new Response(JSON.stringify(payload), { headers: { "Content-Type":"application/json" } });
};
