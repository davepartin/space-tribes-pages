import { setAuthCookie } from "./utils/auth";

export const onRequestPost = async ({ env, request }) => {
  const headers = { "Content-Type": "application/json" };
  try {
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ ok:false, error:"DB binding not found (check Pages → Settings → Functions → D1 Bindings: DB)" }), { status:500, headers });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.name || !body.pin || !/^\d{4}$/.test(body.pin)) {
      return new Response(JSON.stringify({ ok:false, error:"Name and 4-digit PIN required." }), { status:400, headers });
    }
    const name = body.name.trim();
    const pin  = body.pin.trim();
    const mode = (body.mode || "login").toLowerCase();

    const existing = await db.prepare("SELECT id, name, pin FROM players WHERE name = ?").bind(name).first();

    if (mode === "create") {
      if (existing) {
        return new Response(JSON.stringify({ ok:false, error:"Name already exists. Try logging in." }), { status:409, headers });
      }
      // INSERT without RETURNING, then fetch the row
      await db.prepare("INSERT INTO players (name, pin, created_at) VALUES (?, ?, datetime('now'))").bind(name, pin).run();
      const created = await db.prepare("SELECT id, name FROM players WHERE name = ?").bind(name).first();
      if (!created) {
        return new Response(JSON.stringify({ ok:false, error:"Failed to create user." }), { status:500, headers });
      }
      const h = new Headers(headers);
      await setAuthCookie(env, created, h);
      return new Response(JSON.stringify({ ok:true, user:created }), { headers: h });
    } else {
      if (!existing || existing.pin !== pin) {
        return new Response(JSON.stringify({ ok:false, error:"Invalid name or PIN." }), { status:401, headers });
      }
      const h = new Headers(headers);
      await setAuthCookie(env, existing, h);
      return new Response(JSON.stringify({ ok:true, user:{ id: existing.id, name: existing.name } }), { headers: h });
    }
  } catch (err) {
    // Always return JSON so the client doesn't choke
    return new Response(JSON.stringify({ ok:false, error:`Server error: ${err?.message || err}` }), { status:500, headers:{ "Content-Type":"application/json" } });
  }
};
