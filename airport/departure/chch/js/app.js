const API_BASE = "https://www.christchurchairport.co.nz/api/flights";

  let direction = "Arrive";
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
    loadFlights();
  });

  searchBox.addEventListener("input", renderFlights);
  refreshBtn.addEventListener("click", loadFlights);

  function endpoint(dir, type) {
    return `${API_BASE}?maxFlights=&flightDirection=${encodeURIComponent(dir)}&flightType=${encodeURIComponent(type)}`;
  }

  async function loadFlights() {
    showLoading(true);
    setRefreshStatus("Updating…");

    try {
      let responses;

      if (flightType === "All") {
        responses = await Promise.all([
          fetch(endpoint(direction, "Domestic"), { cache: "no-store" }),
          fetch(endpoint(direction, "International"), { cache: "no-store" })
        ]);
      } else {
        responses = [
          await fetch(endpoint(direction, flightType), { cache: "no-store" })
        ];
      }

      for (const response of responses) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from Christchurch Airport`);
        }
      }

      const payloads = await Promise.all(responses.map(r => r.json()));

      flights = payloads.flatMap((payload, i) =>
        (payload.flights || []).map(f => ({
          ...f,
          flightType:
            flightType === "All"
              ? (i === 0 ? "Domestic" : "International")
              : flightType
        }))
      );

      const lastUpdated = payloads
        .map(p => p.lastUpdated)
        .filter(Boolean)
        .pop();

      document.getElementById("lastUpdated").textContent = lastUpdated || "Just now";
      setRefreshStatus("Updated " + (lastUpdated || "just now"));

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
      const haystack = [
        flight.airlineName,
        flight.airlineCode,
        ...(flight.flightNumbers || []),
        ...(flight.airports || []),
        flight.status,
        flight.gate,
        flight.flightType
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });

    document.getElementById("flightCount").textContent = filtered.length;

    const rows = document.getElementById("flightRows");
    const mobile = document.getElementById("mobileBoard");

    rows.innerHTML = "";
    mobile.innerHTML = "";

    document.getElementById("emptyState").classList.toggle("d-none", filtered.length !== 0);
    document.getElementById("desktopBoard").style.setProperty("display", filtered.length ? "block" : "none", "important");

    filtered.forEach(flight => {
      rows.insertAdjacentHTML("beforeend", desktopRow(flight));
      mobile.insertAdjacentHTML("beforeend", mobileCard(flight));
    });
  }

  function desktopRow(flight) {
    const numbers = flight.flightNumbers || [];
    const primary = numbers[0] || "—";
    const codeshares = numbers.slice(1).join(" / ");
    const airport = (flight.airports || []).join(", ") || "—";

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            ${flight.imageUrl ? `<img class="airline-logo" src="${escapeHtml(flight.imageUrl)}" alt="${escapeHtml(flight.airlineName || "Airline")}">` : ""}
            <div>
              <div class="fw-bold">${escapeHtml(flight.airlineName || flight.airlineCode || "Airline")}</div>
              <div class="small muted">${escapeHtml(flight.flightType || "")}</div>
            </div>
          </div>
        </td>

        <td>
          <div class="flight-no">${escapeHtml(primary)}</div>
          ${codeshares ? `<div class="codeshare">${escapeHtml(codeshares)}</div>` : ""}
        </td>

        <td class="airport">${escapeHtml(airport)}</td>
        <td>${escapeHtml(flight.scheduled || "—")}</td>
        <td>${escapeHtml(flight.estimateActual || "—")}</td>
        <td><span class="fw-bold">${escapeHtml(flight.gate || "—")}</span></td>
        <td>${statusHtml(flight.status)}</td>
      </tr>
    `;
  }

  function mobileCard(flight) {
    const numbers = flight.flightNumbers || [];
    const airport = (flight.airports || []).join(", ") || "—";

    return `
      <div class="mobile-card">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div class="d-flex gap-3 align-items-center">
            ${flight.imageUrl ? `<img class="airline-logo" src="${escapeHtml(flight.imageUrl)}" alt="">` : ""}
            <div>
              <div class="flight-no fs-5">${escapeHtml(numbers[0] || "—")}</div>
              <div class="small muted">${escapeHtml(flight.airlineName || "")}</div>
            </div>
          </div>
          ${statusHtml(flight.status)}
        </div>

        <div class="airport fs-5 mb-3">${escapeHtml(airport)}</div>

        <div class="row g-3 small">
          <div class="col-4">
            <div class="muted">Scheduled</div>
            <div class="fw-bold mt-1">${escapeHtml(flight.scheduled || "—")}</div>
          </div>
          <div class="col-4">
            <div class="muted">Est / Act</div>
            <div class="fw-bold mt-1">${escapeHtml(flight.estimateActual || "—")}</div>
          </div>
          <div class="col-4">
            <div class="muted">Gate</div>
            <div class="fw-bold mt-1">${escapeHtml(flight.gate || "—")}</div>
          </div>
        </div>

        ${numbers.length > 1 ? `<div class="small muted mt-3">Codeshare: ${escapeHtml(numbers.slice(1).join(" / "))}</div>` : ""}
      </div>
    `;
  }

  function statusHtml(status) {
    if (!status) {
      return `<span class="empty-status">—</span>`;
    }

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
    const arrivals = direction === "Arrive";

    document.getElementById("boardTitle").textContent = arrivals ? "Arrivals" : "Departures";
    document.getElementById("airportHeading").textContent = arrivals ? "Arriving From" : "Departing For";

    document.getElementById("boardSubtitle").textContent =
      flightType === "All" ? "Domestic + International" : flightType;
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
    document.getElementById("errorMessage").textContent =
      message + ". If this page is hosted on another domain, Christchurch Airport may block browser requests with CORS.";
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

  // Optional automatic refresh every 10 minutes.
  setInterval(loadFlights, 10 * 60 * 1000);
