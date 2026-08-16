const API_BASE = "https://flightboard.thomasnz.workers.dev/";

let direction = "A";
let flightType = "All";
let flights = [];

const flightDate = document.getElementById("flightDate");
const flightTypeSelect = document.getElementById("flightType");
const searchBox = document.getElementById("searchBox");
const refreshBtn = document.getElementById("refreshBtn");

function nzDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

// Default to today's NZ date
flightDate.value = nzDateString();

document.querySelectorAll("[data-direction]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-direction]").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    direction = button.dataset.direction;
    updateHeadings();
    loadFlights();
  });
});

flightDate.addEventListener("change", loadFlights);

flightTypeSelect.addEventListener("change", e => {
  flightType = e.target.value;
  updateHeadings();
  renderFlights();
});

searchBox.addEventListener("input", renderFlights);
refreshBtn.addEventListener("click", loadFlights);

function endpoint() {
  const p = new URLSearchParams({
    airport: "WLG",
    flightDirection: direction,
    day: flightDate.value || nzDateString()
  });

  return `${API_BASE}?${p.toString()}`;
}

async function loadFlights() {
  showLoading(true);
  setRefreshStatus("Updating…");

  try {
    const response = await fetch(endpoint(), { cache: "no-store" });
    const data = await response.json().catch(() => null);

    // A 502/empty Wellington response can simply mean there are no
    // flights for the selected direction/date. Show the friendly
    // "No arrivals/departures" message instead of an HTTP error.
    if (!response.ok) {
      if (response.status === 502 && direction === "D") {
        flights = [];
        renderFlights();
        showLoading(false);
        setRefreshStatus("No departures");
        return;
      }

      if (response.status === 502 && direction === "A") {
        flights = [];
        renderFlights();
        showLoading(false);
        setRefreshStatus("No arrivals");
        return;
      }

      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    flights = Array.isArray(data?.flights) ? data.flights : [];

    const now = new Date();
    const updated = now.toLocaleTimeString("en-NZ", {
      timeZone: "Pacific/Auckland",
      hour: "numeric",
      minute: "2-digit"
    });

    document.getElementById("lastUpdated").textContent = updated;
    setRefreshStatus("Updated " + updated);

    renderFlights();
    showLoading(false);

  } catch (error) {
    console.error(error);
    showLoading(false);
    showError(error.message);
  }
}

function renderFlights() {
  const q = searchBox.value.trim().toLowerCase();

  const filtered = flights.filter(f => {
    if (flightType !== "All" && f.zone !== flightType) return false;

    const hay = [
      f.place,
      f.carrier_name,
      f.carrier_code,
      f.flight_number,
      f.gate,
      f.status_text,
      f.scheduled,
      f.estimated,
      f.zone
    ].join(" ").toLowerCase();

    return hay.includes(q);
  });

  document.getElementById("flightCount").textContent = filtered.length;
  document.getElementById("flightRows").innerHTML = filtered.map(desktopRow).join("");
  document.getElementById("mobileBoard").innerHTML = filtered.map(mobileCard).join("");

  const noFlights = filtered.length === 0;
  document.getElementById("emptyState").classList.toggle("d-none", !noFlights);
  document.getElementById("desktopBoard")
    .style.setProperty("display", noFlights ? "none" : "block", "important");

  if (noFlights) {
    updateEmptyState();
  }
}

function updateEmptyState() {
  const arrivals = direction === "A";
  const selected = flightDate.value || nzDateString();
  const [y, m, d] = selected.split("-").map(Number);

  const readable = new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(y, m - 1, d));

  document.getElementById("emptyTitle").textContent =
    arrivals ? "No arrivals found" : "No departures found";

  document.getElementById("emptyMessage").textContent =
    `There are no ${arrivals ? "arrivals" : "departures"} to show for ${readable}. Select another date.`;
}

function desktopRow(f) {
  return `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-3">
          ${f.carrier_tail_icon ? `<img class="airline-logo" src="${esc(f.carrier_tail_icon)}" alt="">` : ""}
          <div>
            <div class="fw-bold">${esc(f.carrier_name || f.carrier_code || "Airline")}</div>
            <div class="small muted">${f.zone === "I" ? "International" : "Domestic"}</div>
          </div>
        </div>
      </td>
      <td class="flight-no">${esc(f.flight_number || "—")}</td>
      <td class="airport">${esc(f.place || "—")}</td>
      <td>${esc(f.scheduled || "—")}</td>
      <td>${esc(f.estimated || "—")}</td>
      <td class="fw-bold">${esc(f.gate || "—")}</td>
      <td>${statusHtml(f.status_text)}</td>
    </tr>`;
}

function mobileCard(f) {
  return `
    <article class="mobile-card">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div class="d-flex align-items-center gap-3">
          ${f.carrier_tail_icon ? `<img class="airline-logo" src="${esc(f.carrier_tail_icon)}" alt="">` : ""}
          <div>
            <div class="flight-no">${esc(f.flight_number || "—")}</div>
            <div class="small muted">${esc(f.carrier_name || "")}</div>
          </div>
        </div>
        ${statusHtml(f.status_text)}
      </div>

      <div class="airport mt-3">${esc(f.place || "—")}</div>

      <div class="mobile-meta">
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Scheduled</div>
          <div class="mobile-meta-value">${esc(f.scheduled || "—")}</div>
        </div>
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Estimated</div>
          <div class="mobile-meta-value">${esc(f.estimated || "—")}</div>
        </div>
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Gate</div>
          <div class="mobile-meta-value">${esc(f.gate || "—")}</div>
        </div>
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Flight type</div>
          <div class="mobile-meta-value">${f.zone === "I" ? "International" : "Domestic"}</div>
        </div>
      </div>
    </article>`;
}

function statusHtml(status) {
  if (!status) return `<span class="empty-status">—</span>`;

  const s = status.toLowerCase();
  let cls = "status-default";

  if (s.includes("landed") || s.includes("arrived")) cls = "status-landed";
  else if (s.includes("delay")) cls = "status-delayed";
  else if (s.includes("cancel")) cls = "status-cancelled";

  return `<span class="status-badge ${cls}">${esc(status)}</span>`;
}

function updateHeadings() {
  const arrivals = direction === "A";

  document.getElementById("boardTitle").textContent =
    arrivals ? "Arrivals" : "Departures";

  document.getElementById("placeHeading").textContent =
    arrivals ? "From" : "To";

  document.getElementById("boardSubtitle").textContent =
    flightType === "All"
      ? "Domestic + International"
      : flightType === "I"
        ? "International"
        : "Domestic";
}

function showLoading(v) {
  document.getElementById("loading").classList.toggle("d-none", !v);
  document.getElementById("errorState").classList.add("d-none");

  if (v) {
    document.getElementById("desktopBoard").style.setProperty("display", "none", "important");
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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

updateHeadings();
loadFlights();
setInterval(loadFlights, 10 * 60 * 1000);
