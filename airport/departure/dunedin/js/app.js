const API_BASE = "https://flightboard.thomasnz.workers.dev/";

let direction = "arrivals";
let data = { arrivals: [], departures: [] };

document.querySelectorAll("[data-direction]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-direction]").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    direction = button.dataset.direction;
    updateHeadings();
    renderFlights();
  });
});

document.getElementById("searchBox").addEventListener("input", renderFlights);
document.getElementById("refreshBtn").addEventListener("click", loadFlights);

function endpoint() {
  return `${API_BASE}?airport=DUD`;
}

async function loadFlights() {
  showLoading(true);
  setRefreshStatus("Updating…");

  try {
    const response = await fetch(endpoint(), { cache: "no-store" });
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(json?.error || `HTTP ${response.status}`);
    }

    data = {
      arrivals: Array.isArray(json.arrivals) ? json.arrivals : [],
      departures: Array.isArray(json.departures) ? json.departures : []
    };

    const produced = json.produced || "";
    document.getElementById("lastUpdated").textContent =
      produced ? produced.slice(11,16) : "Just now";

    setRefreshStatus("Updated " + document.getElementById("lastUpdated").textContent);

    renderFlights();
    showLoading(false);
  } catch (error) {
    console.error(error);
    showLoading(false);
    showError(error.message);
  }
}

function renderFlights() {
  const query = document.getElementById("searchBox").value.trim().toLowerCase();
  const flights = data[direction] || [];

  const filtered = flights.filter(f => {
    const hay = [
      f.airline,
      f.flight_no,
      ...(f.codeshares || []),
      f.city,
      ...(f.cities || []),
      f.aircraft_type,
      f.gate,
      f.status,
      f.source_status
    ].join(" ").toLowerCase();

    return hay.includes(query);
  });

  document.getElementById("flightCount").textContent = filtered.length;
  document.getElementById("flightRows").innerHTML = filtered.map(desktopRow).join("");
  document.getElementById("mobileBoard").innerHTML = filtered.map(mobileCard).join("");

  const empty = filtered.length === 0;
  document.getElementById("emptyState").classList.toggle("d-none", !empty);
  document.getElementById("desktopBoard")
    .style.setProperty("display", empty ? "none" : "block", "important");

  if (empty) updateEmptyState();
}

function desktopRow(f) {
  const img = f.airline_img_svg || f.airline_img;
  const imgUrl = img ? `https://webfids.symbiant.co.nz/resources/images/${encodeURIComponent(img)}` : "";

  return `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-3">
          ${imgUrl ? `<img class="airline-logo" src="${esc(imgUrl)}" alt="">` : ""}
          <div>
            <div class="fw-bold">${esc(f.airline || "Airline")}</div>
            ${f.codeshares?.length ? `<div class="small muted">${esc(f.codeshares.join(" / "))}</div>` : ""}
          </div>
        </div>
      </td>
      <td class="flight-no">${esc(f.flight_no || "—")}</td>
      <td class="city">${esc(f.city || "—")}</td>
      <td>${esc(f.sched_time || "—")}</td>
      <td class="fw-bold">${esc(f.gate || "—")}</td>
      <td>${esc(f.aircraft_type || "—")}</td>
      <td>${statusHtml(f)}</td>
    </tr>`;
}

function mobileCard(f) {
  const img = f.airline_img_svg || f.airline_img;
  const imgUrl = img ? `https://webfids.symbiant.co.nz/resources/images/${encodeURIComponent(img)}` : "";

  return `
    <article class="mobile-card">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div class="d-flex align-items-center gap-3">
          ${imgUrl ? `<img class="airline-logo" src="${esc(imgUrl)}" alt="">` : ""}
          <div>
            <div class="flight-no">${esc(f.flight_no || "—")}</div>
            <div class="small muted">${esc(f.airline || "")}</div>
          </div>
        </div>
        ${statusHtml(f)}
      </div>

      <div class="city fs-5 mt-3">${esc(f.city || "—")}</div>

      <div class="mobile-meta">
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Scheduled</div>
          <div class="mobile-meta-value">${esc(f.sched_time || "—")}</div>
        </div>
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Gate</div>
          <div class="mobile-meta-value">${esc(f.gate || "—")}</div>
        </div>
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Aircraft</div>
          <div class="mobile-meta-value">${esc(f.aircraft_type || "—")}</div>
        </div>
        ${direction === "departures" ? `
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Boarding</div>
          <div class="mobile-meta-value">${esc(f.boarding_time || "—")}</div>
        </div>` : ""}
      </div>

      ${f.codeshares?.length ? `<div class="small muted mt-3">Codeshares: ${esc(f.codeshares.join(" / "))}</div>` : ""}
    </article>`;
}

function statusHtml(f) {
  const raw = String(f.source_status || f.status || "").replace(/[<>]/g,"").trim();
  if (!raw) return `<span class="status-badge status-default">—</span>`;

  const s = raw.toLowerCase();
  let cls = "status-default";

  if (s.includes("on time") || s.includes("landed") || s.includes("arrived")) cls = "status-good";
  else if (s.includes("delay") || s.includes("boarding") || s.includes("final")) cls = "status-warn";
  else if (s.includes("cancel")) cls = "status-bad";

  return `<span class="status-badge ${cls}">${esc(raw)}</span>`;
}

function updateHeadings() {
  const arrivals = direction === "arrivals";
  document.getElementById("boardTitle").textContent = arrivals ? "Arrivals" : "Departures";
  document.getElementById("cityHeading").textContent = arrivals ? "From" : "To";
}

function updateEmptyState() {
  const arrivals = direction === "arrivals";
  document.getElementById("emptyTitle").textContent =
    arrivals ? "No arrivals found" : "No departures found";
  document.getElementById("emptyMessage").textContent =
    arrivals
      ? "There are no arrivals to show right now."
      : "There are no departures to show right now.";
}

function showLoading(v) {
  document.getElementById("loading").classList.toggle("d-none", !v);
  document.getElementById("errorState").classList.add("d-none");

  if (v) {
    document.getElementById("desktopBoard").style.setProperty("display","none","important");
    document.getElementById("mobileBoard").innerHTML = "";
    document.getElementById("emptyState").classList.add("d-none");
  }
}

function showError(msg) {
  document.getElementById("errorState").classList.remove("d-none");
  document.getElementById("errorMessage").textContent = msg;
  document.getElementById("flightCount").textContent = "0";
  setRefreshStatus("Update failed");
}

function setRefreshStatus(t) {
  document.getElementById("refreshStatus").textContent = t;
}

function esc(v) {
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

updateHeadings();
loadFlights();
setInterval(loadFlights, 5 * 60 * 1000);
