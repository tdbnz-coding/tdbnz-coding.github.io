const apiKey = '5b3ce3597851110001cf624811dd78dbd4994e6397bee9c030419272';

let startCoords = null;
let endCoords = null;
let debounceTimers = {};
let map = null;
let routeLine = null;
let startMarker = null;
let endMarker = null;

function autoDetectLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      startCoords = [lon, lat];
      const res = await fetch(`https://api.openrouteservice.org/geocode/reverse?api_key=${apiKey}&point.lat=${lat}&point.lon=${lon}`);
      const data = await res.json();
      const label = data.features[0]?.properties?.label || 'Detected Location';
      document.getElementById('start').value = label;
      getEstimate();
    });
  }
}

function debouncedSearch(field) {
  const value = document.getElementById(field).value;
  const fallbackBtn = document.getElementById(`${field}-fallback`);
  if (value.length < 3) {
    document.getElementById(`${field}-suggestions`).innerHTML = '';
    fallbackBtn.style.display = 'none';
    return;
  }
  fallbackBtn.style.display = 'none';
  clearTimeout(debounceTimers[field]);
  debounceTimers[field] = setTimeout(() => {
    searchAddress(value, field);
  }, 1000);
}

async function searchAddress(query, field) {
  try {
    const res = await fetch(`https://api.openrouteservice.org/geocode/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(query)}&boundary.country=NZ`);
    const data = await res.json();
    showSuggestions(data.features, field);
  } catch {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
    const data = await res.json();
    const features = data.features.map(f => ({
      geometry: f.geometry,
      properties: { label: f.properties.name + (f.properties.city ? ', ' + f.properties.city : '') }
    }));
    showSuggestions(features, field);
  }
}

function showSuggestions(features, field) {
  const suggestionsDiv = document.getElementById(`${field}-suggestions`);
  suggestionsDiv.innerHTML = '';
  features.forEach(feature => {
    const div = document.createElement('div');
    div.textContent = feature.properties.label;
    div.onclick = () => {
      document.getElementById(field).value = feature.properties.label;
      suggestionsDiv.innerHTML = '';
      if (field === 'start') startCoords = feature.geometry.coordinates;
      if (field === 'end') {
        endCoords = feature.geometry.coordinates;
        const isAirport = feature.properties.label.toLowerCase().includes('airport');
        document.getElementById('airport').checked = isAirport;
      }
      getEstimate();
    };
    suggestionsDiv.appendChild(div);
  });
}

async function manualSearch(field) {
  const query = document.getElementById(field).value;
  try {
    const res = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(query)}&boundary.country=NZ`);
    const data = await res.json();
    applyManualSearch(data.features[0], field);
  } catch {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
    const data = await res.json();
    applyManualSearch(data.features[0], field);
  }
}

function applyManualSearch(feature, field) {
  const coords = feature.geometry.coordinates;
  if (field === 'start') startCoords = coords;
  if (field === 'end') {
    endCoords = coords;
    const isAirport = (feature.properties.name || '').toLowerCase().includes('airport');
    document.getElementById('airport').checked = isAirport;
  }
  getEstimate();
}

async function getEstimate() {
  if (!startCoords || !endCoords) {
    document.getElementById('output').innerHTML = 'Please enter both start and end addresses.';
    return;
  }

  try {
    const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordinates: [startCoords, endCoords]
      })
    });

    const data = await res.json();
    const summary = data.features[0].properties.summary;
    const coords = data.features[0].geometry.coordinates;
    const distanceKm = summary.distance / 1000;
    const durationSec = summary.duration;
    const durationMin = Math.round(durationSec / 60);
    const formattedTime = durationMin < 60
      ? `${durationMin} min`
      : `${Math.floor(durationMin / 60)} hr ${durationMin % 60} min`;

    // Fare calculation
    const baseFare = 3.00;
    const perKmRate = 3.20;
    const distanceFare = distanceKm * perKmRate;
    const bikeFee = document.getElementById('bike').checked ? 5.50 : 0;
    const airportFee = document.getElementById('airport').checked ? 5.50 : 0;

    let rawFare = baseFare + distanceFare + bikeFee + airportFee;
    const lowEstimate = rawFare * 0.95;
    const highEstimate = rawFare * 1.10;

    let finalFare = rawFare;
    let discountNote = '';

    if (document.getElementById('tm').checked) {
      const discountCap = 52.50;
      const discounted = rawFare * 0.25;
      const userPays = Math.max(rawFare - discountCap * 0.75, discounted);
      discountNote = `
        <div class="discount">
          <strong>Total Mobility Discount Applied</strong><br>
          Fare before discount: $${rawFare.toFixed(2)}<br>
          Discounted fare: <strong>$${userPays.toFixed(2)}</strong>
        </div>
      `;
      finalFare = userPays;
    }

    document.getElementById('output').innerHTML = `
      <div class="fare-card">
        <strong>Estimated Fare Range:</strong> $${lowEstimate.toFixed(2)} – $${highEstimate.toFixed(2)}<br>
        <strong>Estimated Travel Time:</strong> ${formattedTime}<br><br>

        <span class="label">Base Fare:</span> $${baseFare.toFixed(2)}<br>
        <span class="label">Distance (${distanceKm.toFixed(2)} km @ $${perKmRate.toFixed(2)}):</span> $${distanceFare.toFixed(2)}<br>
        <span class="label">Bike Fee:</span> $${bikeFee.toFixed(2)}<br>
        <span class="label">Airport Fee:</span> $${airportFee.toFixed(2)}<br><br>

        <strong>Total Before Discount:</strong> $${rawFare.toFixed(2)}<br>
        ${discountNote}
      </div>
    `;

    // Setup map
    if (!map) {
      map = L.map('map').setView([startCoords[1], startCoords[0]], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }

    // Clear old route
    if (routeLine) map.removeLayer(routeLine);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);

    const latlngs = coords.map(c => [c[1], c[0]]);
    routeLine = L.polyline(latlngs, { color: 'blue', weight: 5 }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

    // Add markers with ETA
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + durationSec * 1000);
    const arrivalStr = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    startMarker = L.marker(latlngs[0]).addTo(map).bindPopup("Start").openPopup();
    endMarker = L.marker(latlngs[latlngs.length - 1]).addTo(map).bindPopup(
      `End<br>Travel Time: ${formattedTime}<br>ETA: ${arrivalStr}`
    ).openPopup();

  } catch (err) {
    console.error(err);
    document.getElementById('output').innerHTML = 'Error fetching route or calculating fare.';
  }
}
