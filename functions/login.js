import { setAuthCookie } from "./utils/auth";

export const onRequestPost = async ({ env, request }) => {
  const db = env.DB;
  const body = await request.json().catch(()=>null);
  if(!body || !body.name || !body.pin || !/^\d{4}$/.test(body.pin)){
    return new Response(JSON.stringify({ ok:false, error:"Name and 4-digit PIN required." }), { status:400 });
  }
  const name = body.name.trim();
  const pin  = body.pin.trim();
  const mode = (body.mode||"login").toLowerCase();

  const existing = await db.prepare("SELECT id, name, pin FROM players WHERE name = ?").bind(name).first();

  if(mode === "create"){
    if(existing){
      return new Response(JSON.stringify({ ok:false, error:"Name already exists. Try logging in." }), { status:409 });
    }
    const res = await db.prepare("INSERT INTO players (name, pin, created_at) VALUES (?, ?, datetime('now')) RETURNING id, name").bind(name, pin).first();
    const headers = new Headers({ "Content-Type":"application/json" });
    await setAuthCookie(env, res, headers);
    return new Response(JSON.stringify({ ok:true, user:res }), { headers });
  } else {
    if(!existing || existing.pin !== pin){
      return new Response(JSON.stringify({ ok:false, error:"Invalid name or PIN." }), { status:401 });
    }
    const headers = new Headers({ "Content-Type":"application/json" });
    await setAuthCookie(env, existing, headers);
    return new Response(JSON.stringify({ ok:true, user:{ id: existing.id, name: existing.name } }), { headers });
  }
};
