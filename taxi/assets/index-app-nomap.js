
const ORS_API_KEY = "5b3ce3597851110001cf624811dd78dbd4994e6397bee9c030419272";
let startCoords = null;
let endCoords = null;

async function autocomplete(inputId, setter) {
  const value = document.getElementById(inputId).value;
  if (value.length < 3) return;
  const res = await fetch(`https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_API_KEY}&text=${encodeURIComponent(value)}&boundary.country=NZ`);
  const data = await res.json();
  if (data.features.length > 0) {
    const coords = data.features[0].geometry.coordinates;
    setter(coords);
  }
}

document.getElementById('start').addEventListener('blur', () => autocomplete('start', c => startCoords = c));
document.getElementById('end').addEventListener('blur', () => autocomplete('end', c => endCoords = c));

document.getElementById('estimate').addEventListener('click', async () => {
  if (!startCoords || !endCoords) {
    document.getElementById('output').textContent = 'Please enter valid start and end addresses.';
    return;
  }

  const matrixRes = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      locations: [startCoords, endCoords],
      metrics: ['distance', 'duration']
    })
  });
  const data = await matrixRes.json();
  const distanceKm = data.distances[0][1] / 1000;
  const durationMin = data.durations[0][1] / 60;
  const waitMin = durationMin * 0.2;

  const flagfall = 3.40;
  const ratePerKm = 3.40;
  const waitPerMin = 1.40;
  const serviceFee = 2.30;
  const bikeFee = document.getElementById("bike").checked ? 5.50 : 0;
  const airportFee = document.getElementById("airport").checked ? 5.50 : 0;
  const tm = document.getElementById("tm").checked;

  const distanceCost = distanceKm * ratePerKm;
  const waitCost = waitMin * waitPerMin;
  const rawTotal = flagfall + distanceCost + waitCost + bikeFee + airportFee + serviceFee;

  let finalFare = rawTotal;
  let tmText = '';
  if (tm) {
    const cap = 52.50;
    const discount = Math.min(rawTotal, cap) * 0.75;
    finalFare = rawTotal - discount;
    tmText = `\nTM Discount (75% up to $52.50): -$${discount.toFixed(2)}\nFinal Fare: $${finalFare.toFixed(2)}`;
  }

  document.getElementById("output").textContent =
    `Distance: ${distanceKm.toFixed(2)} km\nETA: ${durationMin.toFixed(0)} min\nWait Est: ${waitMin.toFixed(1)} min\n` +
    `Fare: $${rawTotal.toFixed(2)}\n` + tmText;
});
