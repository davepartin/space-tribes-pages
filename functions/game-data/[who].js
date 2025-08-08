// GET /game-data/:who  where :who can be "me" or a numeric playerId
import { getSession } from "../utils/auth";

export const onRequestGet = async ({ env, request, params }) => {
  const session = await getSession(env, request);
  if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const db = env.DB;
  const who = params?.who;
  let targetId = session.id;
  if (who && who !== "me" && /^\d+$/.test(who)) targetId = Number(who);

  const dayRow = await db.prepare("SELECT value FROM state WHERE key='current_day'").first();
  const currentDay = dayRow ? Number(dayRow.value) : 1;

  const player = await db.prepare("SELECT id, name FROM players WHERE id = ?").bind(targetId).first();
  if (!player) return new Response(JSON.stringify({ error: "Player not found" }), { status: 404 });

  const decision = await db.prepare("SELECT id, payload FROM decisions WHERE player_id = ? AND day = ?").bind(player.id, currentDay).first();

  let parsed; try { parsed = decision?.payload ? JSON.parse(decision.payload) : null; } catch { parsed = null; }
  const efforts = parsed?.efforts || { whiteDiamonds:0, redRubies:0, blueGems:0, greenPoison:0 };
  const sales   = parsed?.sales   || { whiteDiamonds:0, redRubies:0, blueGems:0, greenPoison:0 };

  const stockpiles = parsed?.stockpiles || { whiteDiamonds:0, redRubies:0, blueGems:0, greenPoison:0 };
  const protectedResources = { whiteDiamonds:0, redRubies:0, blueGems:0, greenPoison:0 };
  const totalStockpiles = {
    whiteDiamonds: (stockpiles.whiteDiamonds||0) + (protectedResources.whiteDiamonds||0),
    redRubies:     (stockpiles.redRubies||0)     + (protectedResources.redRubies||0),
    blueGems:      (stockpiles.blueGems||0)      + (protectedResources.blueGems||0),
    greenPoison:   (stockpiles.greenPoison||0)   + (protectedResources.greenPoison||0),
  };
  const lastEfforts = efforts;
  const prices = { whiteDiamonds:20, redRubies:15, blueGems:12, greenPoison:10 };
  const needs  = { whiteDiamonds:0, redRubies:0, blueGems:0, greenPoison:0 };
  const lastSupply = { whiteDiamonds:0, redRubies:0, blueGems:0, greenPoison:0 };

  const players = await db.prepare("SELECT id, name FROM players ORDER BY name").all();
  const leaderboard = players.results.map(p => ({
    id: p.id, name: p.name, credits: 0,
    stockpiles: { whiteDiamonds:0, redRubies:0, blueGems:0, greenPoison:0 }
  }));

  const submittedToday = await db.prepare(
    `SELECT p.id, p.name, CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END as submitted
     FROM players p LEFT JOIN decisions d
       ON p.id = d.player_id AND d.day = ?
     ORDER BY p.name`
  ).bind(currentDay).all();

  const newsRows = await db.prepare("SELECT message FROM news ORDER BY created_at DESC LIMIT 10").all();
  const news = newsRows.results.map(r => r.message);

  const payload = {
    ok: true, currentDay,
    playerName: player.name, credits: 0, activePlayers: players.results.length,
    stockpiles, protectedResources, totalStockpiles,
    lastEfforts, prices, needs, lastSupply,
    efforts, sales, lastNightSales: [], hasSubmitted: !!decision,
    leaderboard, news,
    submissionsToday: submittedToday.results.map(r => ({ id: r.id, name: r.name, submitted: !!r.submitted }))
  };

  return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } });
};
