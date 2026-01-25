const el = (id) => document.getElementById(id);

function nowSec(){ return Math.floor(Date.now() / 1000); }

function fmtTime(ts){
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function fmtLeft(sec){
  if (sec == null) return "—";
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function leftUntil(ts){
  if (!ts) return null;
  return Math.max(0, ts - nowSec());
}

function pickNextEvent(pub){
  const st = normalizeStatus(pub.status);
  const tr = pub.travel || {};

  const statusUntil = st.until || null;
  const landingTs = tr.landing_timestamp || null;

  const statusLeft = leftUntil(statusUntil);
  const travelLeft = tr.time_left ?? (landingTs ? leftUntil(landingTs) : null);

  const traveling = !!(tr.destination && (travelLeft != null && travelLeft > 0));
  if (traveling) {
    const until = landingTs || (travelLeft != null ? nowSec() + travelLeft : null);
    return { type: "travel", until, left: travelLeft, label: "Arrival" };
  }

  const state = (st.state || "").toLowerCase();
  const blocked = statusLeft != null && statusLeft > 0 && state && state !== "okay";
  if (blocked) return { type: "status", until: statusUntil, left: statusLeft, label: "Status ends" };

  return { type: "none", until: null, left: null, label: "No timer" };
}

function normalizeStatus(st){
  // Worker should return an object, but handle older/odd formats safely
  if (!st) return { state: "", description: "", until: null };
  if (typeof st === "string") return { state: st, description: "", until: null };
  return {
    state: st.state ?? st.status ?? "",
    description: st.description ?? "",
    until: st.until ?? null
  };
}

function setAvailability(pub){
  const st = normalizeStatus(pub.status);
  const tr = pub.travel || {};

  const state = (st.state || "").toLowerCase();
  const statusBlocked = (st.until && st.until > nowSec() && state && state !== "okay");

  const landingTs = tr.landing_timestamp || null;
  const travelLeft = tr.time_left ?? (landingTs ? leftUntil(landingTs) : null);
  const traveling = !!(tr.destination && (travelLeft != null && travelLeft > 0));

  let label = "Available";
  let dot = "var(--good)";
  let ring = "rgba(45,212,191,0.20)";
  let sub = "Good to go";

  if (traveling) {
    label = "Not available";
    dot = "var(--info)";
    ring = "rgba(96,165,250,0.22)";
    sub = landingTs ? `Landing at ${fmtTime(landingTs)}` : `Back in ${fmtLeft(travelLeft)}`;
  } else if (statusBlocked) {
    label = "Not available";
    dot = "var(--bad)";
    ring = "rgba(251,113,133,0.22)";
    sub = `Free at ${fmtTime(st.until)}`;
  }

  el("availabilityText").textContent = `${label}, ${sub}`;
  el("availabilityDot").style.background = dot;
  el("availabilityDot").style.boxShadow = `0 0 0 4px ${ring}`;
}

function setProgress(left, until){
  const bar = el("progressBar");
  if (!left || !until) { bar.style.width = "0%"; return; }

  const mins = left / 60;
  let pct = 100 - Math.min(95, Math.max(5, (mins / 180) * 100));
  if (!isFinite(pct)) pct = 0;
  bar.style.width = `${pct.toFixed(0)}%`;
}

async function fetchPublic(){
  const res = await fetch(`${API_BASE}/public`, { cache: "no-store" });
  return res.json();
}

async function fetchPrivate(password){
  const res = await fetch(`${API_BASE}/private`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${password}` }
  });
  if (res.status === 401) throw new Error("Unauthorized");
  return res.json();
}

function setAvatar(pub){
  const img = el("avatarImg");
  const fb = el("avatarFallback");

  const initial = (pub.name || "T").trim().slice(0,1).toUpperCase();
  fb.textContent = initial;

  const candidate = (window.AVATAR_URL && window.AVATAR_URL.trim()) || pub.avatar_url || "";
  if (!candidate) {
    img.style.display = "none";
    fb.style.display = "grid";
    return;
  }

  img.onload = () => {
    img.style.display = "block";
    fb.style.display = "none";
  };
  img.onerror = () => {
    img.style.display = "none";
    fb.style.display = "grid";
  };
  img.src = candidate;
}

function renderWorkstats(pub){
  const ws = pub.workstats || {};
  const a = ws.manual_labor ?? ws.manual ?? ws.man ?? null;
  const i = ws.intelligence ?? ws.int ?? null;
  const e = ws.endurance ?? ws.end ?? null;

  el("workManual").textContent = (a == null ? "—" : a);
  el("workIntel").textContent = (i == null ? "—" : i);
  el("workEnd").textContent = (e == null ? "—" : e);
}

function renderPublic(pub){
  if (pub.error) {
    el("subtitle").textContent = `Worker error: ${pub.error.error || "Unknown"}`;
    return;
  }

  setAvatar(pub);

  const st = normalizeStatus(pub.status);
  const tr = pub.travel || {};

  const name = pub.name || "Torn Status";
  const lvl = (pub.level == null ? "?" : pub.level);
  el("title").textContent = `${name} [Lvl ${lvl}]`;

  el("subtitle").textContent = pub.rank ? `Rank: ${pub.rank}` : "Live status, travel, and timers";

  const updated = pub.generated_at ? fmtTime(pub.generated_at) : "—";
  el("chipUpdated").textContent = `Updated: ${updated}`;

  const statusState = st.state || "OK";
  el("statusState").textContent = statusState;
  el("statusDesc").textContent = st.description || "—";
  el("statusUntil").textContent = fmtTime(st.until);
  el("statusLeft").textContent = fmtLeft(leftUntil(st.until));

  const landingTs = tr.landing_timestamp || null;
  const travelLeft = tr.time_left ?? (landingTs ? leftUntil(landingTs) : null);
  const traveling = !!(tr.destination && (travelLeft != null && travelLeft > 0));

  el("travelHeadline").textContent = traveling ? `Flying to ${tr.destination}` : "Not traveling";
  el("travelSub").textContent = traveling ? "Travel timer is based on your latest update" : "—";
  el("travelArrives").textContent = traveling ? (landingTs ? fmtTime(landingTs) : "—") : "—";
  el("travelLeft").textContent = traveling ? fmtLeft(travelLeft) : "—";

  if (traveling) {
    el("overviewLine").textContent = `Flying to ${tr.destination}`;
    el("overviewSub").textContent = landingTs ? `Arrives at ${fmtTime(landingTs)}` : `Back in ${fmtLeft(travelLeft)}`;
  } else {
    el("overviewLine").textContent = `Status: ${statusState}`;
    el("overviewSub").textContent = st.until ? `Ends at ${fmtTime(st.until)}` : "—";
  }

  const next = pickNextEvent(pub);
  if (next.type === "none") {
    el("countdownMain").textContent = "—";
    el("countdownSub").textContent = "No active countdown";
    setProgress(null, null);
  } else {
    el("countdownMain").textContent = fmtLeft(next.left);
    el("countdownSub").textContent = `${next.label}, ${fmtTime(next.until)}`;
    setProgress(next.left, next.until);
  }

  setAvailability(pub);
  renderWorkstats(pub);

  el("footerLine").textContent = "Updates about every 30 seconds. Public shows safe info, private mode shows extra details for you.";
}

function money(n){
  if (n == null || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n/1e12).toFixed(2)}t`;
  if (abs >= 1e9) return `$${(n/1e9).toFixed(2)}b`;
  if (abs >= 1e6) return `$${(n/1e6).toFixed(2)}m`;
  if (abs >= 1e3) return `$${(n/1e3).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function setRows(containerId, rows){
  const box = document.getElementById(containerId);
  box.innerHTML = rows.map(r =>
    `<div class="pRow"><div class="pK">${escapeHtml(r.k)}</div><div class="pV">${escapeHtml(r.v)}</div></div>`
  ).join("");
}

function renderPrivateCards(data){
  const bars = data.bars || {};
  const cooldowns = data.cooldowns || {};
  const workstats = data.workstats || {};
  const networth = data.networth || {};

  setRows("pBars", [
    { k: "Energy", v: bars.energy != null ? `${bars.energy.current}/${bars.energy.maximum}` : "—" },
    { k: "Nerve", v: bars.nerve != null ? `${bars.nerve.current}/${bars.nerve.maximum}` : "—" },
    { k: "Happy", v: bars.happy != null ? `${bars.happy.current}/${bars.happy.maximum}` : "—" },
    { k: "Life", v: bars.life != null ? `${bars.life.current}/${bars.life.maximum}` : "—" }
  ]);

  setRows("pCooldowns", [
    { k: "Drug", v: cooldowns.drug != null ? fmtLeft(cooldowns.drug) : "—" },
    { k: "Medical", v: cooldowns.medical != null ? fmtLeft(cooldowns.medical) : "—" },
    { k: "Booster", v: cooldowns.booster != null ? fmtLeft(cooldowns.booster) : "—" }
  ]);

  setRows("pWork", [
    { k: "Manual labor", v: workstats.manual_labor ?? "—" },
    { k: "Intelligence", v: workstats.intelligence ?? "—" },
    { k: "Endurance", v: workstats.endurance ?? "—" }
  ]);

  setRows("pNetworth", [
    { k: "Total", v: networth.total != null ? money(networth.total) : "—" },
    { k: "Wallet", v: networth.cash != null ? money(networth.cash) : "—" },
    { k: "Bank", v: networth.bank != null ? money(networth.bank) : "—" }
  ]);
}

function setupButtons(){
  el("copyLinkBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      const old = el("chipUpdated").textContent;
      el("chipUpdated").textContent = "Link copied";
      setTimeout(() => { el("chipUpdated").textContent = old; }, 1200);
    } catch {
      // ignore
    }
  });

  el("privateBtn").addEventListener("click", async () => {
    const pw = prompt("Private password");
    if (!pw) return;

    try {
      const priv = await fetchPrivate(pw);
      const data = priv.data || priv;
      el("chipMode").textContent = "Private";
      el("privateCard").style.display = "block";
      renderPrivateCards(data);
    } catch {
      alert("Private mode failed");
    }
  });
}

async function tick(){
  try {
    const pub = await fetchPublic();
    renderPublic(pub);
  } catch {
    el("subtitle").textContent = "Could not load data. Check config.js Worker URL, and that Worker /public works.";
  }
}

setupButtons();
tick();
setInterval(tick, 30000);
