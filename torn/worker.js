// Cloudflare Worker (paste into your Worker code editor)
//
// Fixes for missing fields:
// Torn sometimes returns data either nested by selection (raw.basic.level)
// or at the top level (raw.level). This Worker supports both.
//
// Endpoints:
// - /public  (safe public dashboard data, includes avatar_url + workstats)
// - /private (password protected)
//
// Secrets required:
// - TORN_API_KEY
// - DASH_PASSWORD

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response("", { headers: cors });
    }

    if (url.pathname === "/public") {
      const raw = await fetchTorn(env.TORN_API_KEY, "basic,profile,travel,workstats");
      return json(makePublic(raw), cors);
    }

    if (url.pathname === "/private") {
      const auth = request.headers.get("Authorization") || "";
      if (auth !== `Bearer ${env.DASH_PASSWORD}`) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }

      const raw = await fetchTorn(
        env.TORN_API_KEY,
        "basic,profile,travel,workstats,bars,cooldowns,jobpoints,gym,personalstats,networth,stocks"
      );

      return json({ generated_at: now(), data: raw }, cors);
    }

    return new Response("Not found", { status: 404, headers: cors });
  }
};

function now() {
  return Math.floor(Date.now() / 1000);
}

async function fetchTorn(key, selections) {
  const api = `https://api.torn.com/user/?selections=${encodeURIComponent(selections)}&key=${encodeURIComponent(key)}`;
  const res = await fetch(api, { cf: { cacheTtl: 20, cacheEverything: true } });
  return await res.json();
}

function firstString(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickAvatar(raw) {
  const p = raw.profile || {};
  const b = raw.basic || {};

  return firstString(
    raw.avatar_url,
    raw.avatar,
    raw.image,
    raw.profile_image,
    p.avatar_url, p.avatar, p.image, p.profile_image, p.picture, p.user_image,
    b.avatar_url, b.avatar, b.image, b.profile_image
  );
}

function makePublic(raw) {
  if (raw && raw.error) return raw;

  const b = raw.basic || {};
  const p = raw.profile || {};
  const s = (p.status || raw.status || {});
  const t = raw.travel || {};
  const w = raw.workstats || {};

  const name = b.name ?? raw.name;
  const level = b.level ?? raw.level;
  const rank = b.rank ?? raw.rank;

  const statusObj = (typeof s === "string")
    ? { state: s, description: "", until: null }
    : {
        state: s.state ?? s.status ?? "",
        description: s.description ?? "",
        until: s.until ?? null
      };

  const landingTs = t.timestamp || t.landing_timestamp || t.until || t.landing || raw.timestamp || null;

  const workstats = {
    manual_labor: w.manual_labor ?? w.manual ?? raw.manual_labor ?? raw.workstat_manual_labor,
    intelligence: w.intelligence ?? w.int ?? raw.intelligence ?? raw.workstat_intelligence,
    endurance: w.endurance ?? w.end ?? raw.endurance ?? raw.workstat_endurance
  };

  return {
    generated_at: now(),
    avatar_url: pickAvatar(raw),
    name,
    level,
    rank,
    status: statusObj,
    travel: {
      destination: t.destination ?? raw.destination,
      time_left: t.time_left ?? t.timeleft ?? raw.time_left ?? raw.timeleft ?? null,
      landing_timestamp: landingTs
    },
    workstats
  };
}

function json(obj, headers = {}) {
  return new Response(JSON.stringify(obj, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", ...headers }
  });
}
