const apiKey = '5b3ce3597851110001cf624811dd78dbd4994e6397bee9c030419272';
let startCoords = null;
let endCoords = null;
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
    const distanceMeters = data.features[0].properties.summary.distance;
    const distanceKm = distanceMeters / 1000;

    let fare = 3.00 + distanceKm * 3.20;

    if (document.getElementById('bike').checked) fare += 5.50;
    if (document.getElementById('airport').checked) fare += 5.50;

    let discountNote = '';
    if (document.getElementById('tm').checked) {
      const discounted = fare * 0.25;
      const cap = 52.50;
      const userPays = Math.max(fare - cap * 0.75, discounted);
      discountNote = `<br>Total Mobility Applied: <strong>$${userPays.toFixed(2)}</strong> (Fare before discount: $${fare.toFixed(2)})`;
      fare = userPays;
    }

    document.getElementById('output').innerHTML = `
      Estimated Fare: <strong>$${fare.toFixed(2)}</strong>${discountNote}
    `;

  } catch (err) {
    console.error(err);
    document.getElementById('output').innerHTML = 'Error fetching route or calculating fare.';
  }
}
