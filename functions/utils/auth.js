export async function sign(value, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${value}.${b64}`;
}
export async function verify(signed, secret) {
  if (!signed || !signed.includes(".")) return null;
  const [value, mac] = signed.split(".");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  const calc = btoa(String.fromCharCode(...new Uint8Array(sig)));
  if (mac !== calc) return null;
  try { return JSON.parse(value); } catch { return null; }
}
export async function setAuthCookie(env, user, headers) {
  const cookieName = env.COOKIE_NAME || "st_auth";
  const signed = await sign(JSON.stringify({ id:user.id, name:user.name }), env.COOKIE_SECRET);
  headers.append("Set-Cookie", `${cookieName}=${signed}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`);
}
export async function getSession(env, request) {
  const cookieName = env.COOKIE_NAME || "st_auth";
  const cookie = (request.headers.get("Cookie")||"").split(/;\s*/).find(c=>c.startsWith(cookieName+"="));
  if(!cookie) return null;
  const token = cookie.substring(cookie.indexOf("=")+1);
  return await verify(token, env.COOKIE_SECRET);
}
export function requireAdmin(env, user){
  return user && user.name === (env.ADMIN_NAME || "Dave");
}
