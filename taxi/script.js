
const apiKey = '5b3ce3597851110001cf624811dd78dbd4994e6397bee9c030419272';
let startCoords = null;
let endCoords = null;
let map = null;
let startMarker = null;
let endMarker = null;
let routeLine = null;
let debounceTimers = {};
let autocompleteQuotaExceeded = false;

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
  if (value.length < 3 || autocompleteQuotaExceeded) {
    document.getElementById(`${field}-suggestions`).innerHTML = '';
    fallbackBtn.style.display = 'block';
    return;
  } else {
    fallbackBtn.style.display = 'none';
  }
  clearTimeout(debounceTimers[field]);
  debounceTimers[field] = setTimeout(() => {
    searchAddress(value, field);
  }, 1000);
}

async function searchAddress(query, field) {
  try {
    const res = await fetch(`https://api.openrouteservice.org/geocode/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(query)}&boundary.country=NZ`);
    if (!res.ok) throw new Error('Quota exceeded or blocked');
    const data = await res.json();
    const suggestionsDiv = document.getElementById(`${field}-suggestions`);
    suggestionsDiv.innerHTML = '';
    data.features.forEach(feature => {
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
        updateMap();
        getEstimate();
      };
      suggestionsDiv.appendChild(div);
    });
  } catch (err) {
    autocompleteQuotaExceeded = true;
    document.getElementById(`${field}-fallback`).style.display = 'block';
  }
}

async function manualSearch(field) {
  const query = document.getElementById(field).value;
  const res = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(query)}&boundary.country=NZ`);
  const data = await res.json();
  if (data.features.length === 0) {
    alert('Address not found. Try being more specific.');
    return;
  }
  const coords = data.features[0].geometry.coordinates;
  document.getElementById(`${field}-suggestions`).innerHTML = '';
  if (field === 'start') startCoords = coords;
  if (field === 'end') {
    endCoords = coords;
    const isAirport = data.features[0].properties.label.toLowerCase().includes('airport');
    document.getElementById('airport').checked = isAirport;
  }
  updateMap();
  getEstimate();
}
