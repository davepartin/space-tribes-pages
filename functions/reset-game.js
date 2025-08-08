import { getSession, requireAdmin } from "./utils/auth";

export const onRequestPost = async ({ env, request }) => {
  const session = await getSession(env, request);
  if(!session) return new Response(JSON.stringify({ error:"Unauthorized" }), { status:401 });
  if(!requireAdmin(env, session)) return new Response(JSON.stringify({ error:"Admins only." }), { status:403 });

  const db = env.DB;
  await db.batch([
    db.prepare("DELETE FROM decisions"),
    db.prepare("DELETE FROM news"),
    db.prepare("""
      INSERT INTO state (key, value) VALUES ('current_day', '1')
      ON CONFLICT(key) DO UPDATE SET value = '1'
    """ )
  ]);

  return new Response(JSON.stringify({ ok:true }));
};
