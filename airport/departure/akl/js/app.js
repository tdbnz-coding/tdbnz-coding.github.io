const API_BASE = "https://flightboard.thomasnz.workers.dev/";

let direction = "A";
let flightType = "All";
let flights = [];

const directionTabs = document.querySelectorAll("[data-direction]");
const flightTypeSelect = document.getElementById("flightType");
const searchBox = document.getElementById("searchBox");
const refreshBtn = document.getElementById("refreshBtn");

directionTabs.forEach(button => {
  button.addEventListener("click", () => {
    directionTabs.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    direction = button.dataset.direction;
    updateHeadings();
    loadFlights();
  });
});

flightTypeSelect.addEventListener("change", () => {
  flightType = flightTypeSelect.value;
  updateHeadings();
  renderFlights();
});

searchBox.addEventListener("input", renderFlights);
refreshBtn.addEventListener("click", loadFlights);

function endpoint() {
  const params = new URLSearchParams({
    airport: "AKL",
    flightDirection: direction
  });
  return `${API_BASE}?${params.toString()}`;
}

async function loadFlights() {
  showLoading(true);
  setRefreshStatus("Updating…");

  try {
    const response = await fetch(endpoint(), { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response from flight service");
    }

    flights = data;
    const now = new Date();
    document.getElementById("lastUpdated").textContent =
      now.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });

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
  const query = searchBox.value.trim().toLowerCase();

  const filtered = flights.filter(flight => {
    if (flightType !== "All" && flight.InternationalStatus !== flightType) return false;

    const airports = (flight.Airport || []).flatMap(a => [a.Code, a.Name]);
    const codeshares = (flight.CodeShare || []).flatMap(c => [c.Airline, c.FlightNumber]);

    const haystack = [
      flight.Airline,
      flight.FlightNumber,
      flight.Terminal,
      flight.PassengerGate,
      flight.FlightStatus,
      flight.FlightStatusComment,
      flight.InternationalStatus,
      ...airports,
      ...codeshares
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });

  document.getElementById("flightCount").textContent = filtered.length;

  const rows = document.getElementById("flightRows");
  const mobile = document.getElementById("mobileBoard");

  rows.innerHTML = "";
  mobile.innerHTML = "";

  document.getElementById("emptyState").classList.toggle("d-none", filtered.length !== 0);
  document.getElementById("desktopBoard")
    .style.setProperty("display", filtered.length ? "block" : "none", "important");

  filtered.forEach(flight => {
    rows.insertAdjacentHTML("beforeend", desktopRow(flight));
    mobile.insertAdjacentHTML("beforeend", mobileCard(flight));
  });
}

function desktopRow(flight) {
  const airport = airportText(flight);
  const scheduled = timeOf(flight, "Scheduled");
  const estimated = timeOf(flight, "Estimated");
  const actual = timeOf(flight, "Actual");
  const estAct = actual || estimated || "—";
  const baggage = baggageText(flight);
  const codeshare = codeshareText(flight);

  return `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <span class="airline-pill">${escapeHtml(flight.Airline || "—")}</span>
          <span class="small muted">${flight.InternationalStatus === "I" ? "International" : "Domestic"}</span>
        </div>
      </td>
      <td>
        <div class="flight-no">${escapeHtml((flight.Airline || "") + (flight.FlightNumber || ""))}</div>
        ${codeshare ? `<div class="codeshare">${escapeHtml(codeshare)}</div>` : ""}
      </td>
      <td class="airport">${escapeHtml(airport)}</td>
      <td>${escapeHtml(scheduled)}</td>
      <td>${escapeHtml(estAct)}</td>
      <td>${escapeHtml(direction === "A" ? baggage : "—")}</td>
      <td><span class="fw-bold">${escapeHtml(flight.PassengerGate || "—")}</span></td>
      <td>${statusHtml(flight.FlightStatusComment)}</td>
    </tr>
  `;
}

function mobileCard(flight) {
  const airport = airportText(flight);
  const scheduled = timeOf(flight, "Scheduled");
  const estimated = timeOf(flight, "Estimated");
  const actual = timeOf(flight, "Actual");
  const baggage = baggageText(flight);
  const codeshare = codeshareText(flight);

  return `
    <article class="mobile-card">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <span class="airline-pill">${escapeHtml(flight.Airline || "—")}</span>
            <span class="small muted">${flight.InternationalStatus === "I" ? "International" : "Domestic"}</span>
          </div>
          <div class="flight-no mt-2">${escapeHtml((flight.Airline || "") + (flight.FlightNumber || ""))}</div>
          ${codeshare ? `<div class="codeshare">${escapeHtml(codeshare)}</div>` : ""}
        </div>
        ${statusHtml(flight.FlightStatusComment)}
      </div>

      <div class="airport fs-5 mt-3">${escapeHtml(airport)}</div>

      <div class="mobile-meta">
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Scheduled</div>
          <div class="mobile-meta-value">${escapeHtml(scheduled)}</div>
        </div>

        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Estimated</div>
          <div class="mobile-meta-value">${escapeHtml(estimated)}</div>
        </div>

        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Actual</div>
          <div class="mobile-meta-value">${escapeHtml(actual)}</div>
        </div>

        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Gate</div>
          <div class="mobile-meta-value">${escapeHtml(flight.PassengerGate || "—")}</div>
        </div>

        ${direction === "A" ? `
        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Bag claim</div>
          <div class="mobile-meta-value">${escapeHtml(baggage)}</div>
        </div>` : ""}

        <div class="mobile-meta-item">
          <div class="mobile-meta-label">Terminal</div>
          <div class="mobile-meta-value">${escapeHtml(flight.Terminal || "—")}</div>
        </div>
      </div>
    </article>
  `;
}

function airportText(flight) {
  const items = (flight.Airport || []).map(a => a.Name || a.Code).filter(Boolean);
  return items.join(", ") || "—";
}

function baggageText(flight) {
  const items = (flight.BaggageClaim || [])
    .map(b => b.BaggageClaimUnit)
    .filter(Boolean);
  return items.join(", ") || "—";
}

function codeshareText(flight) {
  const items = (flight.CodeShare || [])
    .map(c => `${c.Airline || ""}${c.FlightNumber || ""}`)
    .filter(Boolean);
  return items.length ? "Codeshare: " + items.join(" / ") : "";
}

function timeOf(flight, type) {
  const found = (flight.OperationTime || []).find(item => item.Type === type);
  if (!found || !found.DateTime) return "—";

  const d = new Date(found.DateTime);
  if (Number.isNaN(d.getTime())) return found.DateTime;

  return d.toLocaleTimeString("en-NZ", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function statusHtml(status) {
  if (!status) return `<span class="empty-status">—</span>`;

  const value = status.toLowerCase();
  let cls = "status-default";

  if (value.includes("landed") || value.includes("arrived")) cls = "status-landed";
  else if (value.includes("delay")) cls = "status-delayed";
  else if (value.includes("cancel")) cls = "status-cancelled";
  else if (value.includes("board")) cls = "status-boarding";
  else if (value.includes("depart")) cls = "status-departed";

  return `<span class="status-badge ${cls}">${escapeHtml(status)}</span>`;
}

function updateHeadings() {
  const arrivals = direction === "A";
  document.getElementById("boardTitle").textContent = arrivals ? "Arrivals" : "Departures";
  document.getElementById("airportHeading").textContent = arrivals ? "Origin" : "Destination";
  document.getElementById("claimHeading").textContent = arrivals ? "Bag claim" : "Bag claim";

  const label = flightType === "All"
    ? "Domestic + International"
    : flightType === "I" ? "International" : "Domestic";

  document.getElementById("boardSubtitle").textContent = label;
}

function showLoading(isLoading) {
  document.getElementById("loading").classList.toggle("d-none", !isLoading);
  document.getElementById("errorState").classList.add("d-none");

  if (isLoading) {
    document.getElementById("desktopBoard").style.setProperty("display", "none", "important");
    document.getElementById("mobileBoard").innerHTML = "";
    document.getElementById("emptyState").classList.add("d-none");
  }
}

function showError(message) {
  document.getElementById("errorState").classList.remove("d-none");
  document.getElementById("errorMessage").textContent = message;
  document.getElementById("desktopBoard").style.setProperty("display", "none", "important");
  document.getElementById("mobileBoard").innerHTML = "";
  document.getElementById("flightCount").textContent = "0";
  setRefreshStatus("Update failed");
}

function setRefreshStatus(text) {
  document.getElementById("refreshStatus").textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

updateHeadings();
loadFlights();
setInterval(loadFlights, 10 * 60 * 1000);
