function extract() {
  const html = document.getElementById("htmlInput").value;

  if (!html.trim()) {
    document.getElementById("output").textContent = "Please paste FR24 HTML source.";
    return;
  }

  // Helper function
  function grab(regex) {
    const match = html.match(regex);
    return match ? match[1].trim() : null;
  }

  // ---------------------------
  // MODE 1: JSON FLIGHT PAGE
  // ---------------------------
  const flightNumberJSON = grab(/"flight":"([^"]+)"/);
  const airlineJSON = grab(/"airline":"([^"]+)"/);
  const originJSON = grab(/"airport":\{"name":"([^"]+)"/);
  const destinationJSON = grab(/"destination":\{"name":"([^"]+)"/);
  const aircraftTypeJSON = grab(/"model":"([^"]+)"/);
  const registrationJSON = grab(/"registration":"([^"]+)"/);

  // ---------------------------
  // MODE 2: AIRCRAFT PAGE (HTML)
  // ---------------------------
  const aircraftTypeHTML = grab(/id="txt-aircraft-model">([^<]+)/);
  const registrationHTML = grab(/id="txt-aircraft-reg">([^<]+)/);
  const serialHTML = grab(/id="txt-aircraft-serial">([^<]+)/);

  // ---------------------------
  // MODE 3: PLAYBACK PAGE (HTML)
  // ---------------------------
  const flightNumberPB = grab(/Playback of flight\s*<small>\s*([^<]+)/);
  const originPB = grab(/id="txt-airport-origin"[^>]*>([^<]+)/);
  const destinationPB = grab(/id="txt-airport-dest"[^>]*>([^<]+)/);
  const aircraftTypePB = grab(/id="txt-aircraft-model">([^<]+)/);
  const registrationPB = grab(/id="txt-aircraft-reg">([^<]+)/);
  const serialPB = grab(/id="txt-aircraft-serial">([^<]+)/);

  // Determine mode
  let mode = "UNKNOWN";

  if (flightNumberJSON) mode = "FLIGHT_JSON";
  else if (flightNumberPB) mode = "PLAYBACK";
  else if (aircraftTypeHTML || registrationHTML) mode = "AIRCRAFT";

  const json = {
    mode,
    flightNumber: flightNumberJSON || flightNumberPB || "UNKNOWN",
    airline: airlineJSON || "UNKNOWN",
    aircraftType: aircraftTypeJSON || aircraftTypePB || aircraftTypeHTML || "UNKNOWN",
    registration: registrationJSON || registrationPB || registrationHTML || "UNKNOWN",
    serialNumber: serialPB || serialHTML || "UNKNOWN",
    origin: originJSON || originPB || "UNKNOWN",
    destination: destinationJSON || destinationPB || "UNKNOWN",
    photo: "photo.jpg"
  };

  document.getElementById("output").textContent =
    JSON.stringify(json, null, 2);
}
