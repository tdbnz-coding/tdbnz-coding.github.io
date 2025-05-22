const apiKey = '5b3ce3597851110001cf624811dd78dbd4994e6397bee9c030419272';

let startCoords = null;
let endCoords = null;
let map = null;
let routeLine = null;
let startMarker = null;
let endMarker = null;
let debounceTimers = {};

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

function roundToNearest5Min(date) {
  const minutes = date.getMinutes();
  const rounded = Math.round(minutes / 5) * 5;
  date.setMinutes(rounded);
  date.setSeconds(0);
  return date;
}

function estimateWaitTime(distanceKm, hour, isUrban = true) {
  let waitBase = 0;
  if (distanceKm < 3) waitBase = 1;
  else if (distanceKm < 7) waitBase = 3;
  else if (distanceKm < 15) waitBase = 5;
  else waitBase = 7;

  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 15 && hour <= 18);
  const peakBoost = isPeak ? 1.5 : 1.0;
  const zoneBoost = isUrban ? 1.0 : 1.2;

  return Math.round(waitBase * peakBoost * zoneBoost);
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
    const durationMin = Math.round(summary.duration / 60);
    const durationSec = summary.duration;

    const now = new Date();
    const hour = now.getHours();
    const estimatedWaitMin = estimateWaitTime(distanceKm, hour);

    const baseFare = 3.40;
    const perKmRate = 3.40;
    const waitRate = 1.40;
    const waitCost = estimatedWaitMin * waitRate;
    const bikeFee = document.getElementById('bike').checked ? 5.50 : 0;
    const airportFee = document.getElementById('airport').checked ? 5.50 : 0;
    const cardUsed = document.getElementById('cardFee')?.checked || false;
    const cardFee = cardUsed ? 2.30 : 0;
    const tmCap = 52.50;

    let rawFare = baseFare + distanceKm * perKmRate + waitCost + bikeFee + airportFee + cardFee;

    const isTM = document.getElementById('tm').checked;
    let tmFare = rawFare;
    let discountNote = '';

    if (isTM) {
      const discounted = Math.min(rawFare, tmCap) * 0.25;
      const overCap = Math.max(rawFare - tmCap, 0);
      tmFare = discounted + overCap;
      discountNote = `
        <div class="discount">
          <strong>Total Mobility Fare:</strong> $${tmFare.toFixed(2)}<br>
          (75% discount on first $52.50, then full price)
        </div>
      `;
    }

    const arrivalInput = document.getElementById('arrival').value;
    let leaveNote = '';
    if (arrivalInput) {
      const [h, m] = arrivalInput.split(':');
      const arriveBy = new Date();
      arriveBy.setHours(parseInt(h), parseInt(m), 0);
      const totalTravelTimeMin = durationMin + estimatedWaitMin;
      const leaveBy = roundToNearest5Min(new Date(arriveBy.getTime() - totalTravelTimeMin * 60000));
      leaveNote = `<strong>To arrive by ${arriveBy.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},<br>
                   book your taxi for: ${leaveBy.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><br>`;
    }

    document.getElementById('output').innerHTML = `
      <div class="fare-card">
        <strong>Distance:</strong> ${distanceKm.toFixed(2)} km<br>
        <strong>Estimated Travel Time:</strong> ${durationMin} min<br>
        ${leaveNote}
        <br>
        <span class="label">Base Fare:</span> $${baseFare.toFixed(2)}<br>
        <span class="label">Distance Fare:</span> $${(distanceKm * perKmRate).toFixed(2)}<br>
        <span class="label">Estimated Waiting Time (${estimatedWaitMin} min):</span> $${waitCost.toFixed(2)}<br>
        <span class="label">Bike Fee:</span> $${bikeFee.toFixed(2)}<br>
        <span class="label">Airport Fee:</span> $${airportFee.toFixed(2)}<br>
        <span class="label">Card Payment Fee:</span> $${cardFee.toFixed(2)}<br><br>
        <strong>Total Fare:</strong> $${rawFare.toFixed(2)}<br>
        ${discountNote}
      </div>
    `;

    if (!map) {
      map = L.map('map').setView([startCoords[1], startCoords[0]], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }

    if (routeLine) map.removeLayer(routeLine);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);

    const latlngs = coords.map(c => [c[1], c[0]]);
    routeLine = L.polyline(latlngs, { color: 'blue', weight: 5 }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

    const eta = new Date(now.getTime() + durationSec * 1000);
    const etaStr = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    startMarker = L.marker(latlngs[0]).addTo(map).bindPopup("Start").openPopup();
    endMarker = L.marker(latlngs[latlngs.length - 1]).addTo(map).bindPopup(`End<br>ETA: ${etaStr}`).openPopup();

  } catch (err) {
    console.error(err);
    document.getElementById('output').innerHTML = 'Error fetching route or calculating fare.';
  }
}
