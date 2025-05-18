import React, { useState } from 'react';

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;

export default function App() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [output, setOutput] = useState('');
  const [bike, setBike] = useState(false);
  const [airport, setAirport] = useState(false);
  const [tm, setTM] = useState(false);

  async function searchAddress(query, setter, coordSetter) {
    if (query.length < 3) return;
    const res = await fetch(`https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_API_KEY}&text=${encodeURIComponent(query)}&boundary.country=NZ`);
    const data = await res.json();
    if (data.features.length > 0) {
      setter(data.features[0].properties.label);
      coordSetter(data.features[0].geometry.coordinates);
    }
  }

  async function getEstimate() {
    if (!startCoords || !endCoords) {
      setOutput("Please enter valid start and end addresses.");
      return;
    }

    const res = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: [startCoords, endCoords],
        metrics: ['distance', 'duration']
      })
    });

    const data = await res.json();
    const distanceKm = data.distances[0][1] / 1000;
    const durationMin = data.durations[0][1] / 60;
    const waitMin = durationMin * 0.2;

    const flagfall = 3.40;
    const ratePerKm = 3.40;
    const waitPerMin = 1.40;
    const serviceFee = 2.30;
    const bikeFee = bike ? 5.50 : 0;
    const airportFee = airport ? 5.50 : 0;

    const distanceCost = distanceKm * ratePerKm;
    const waitCost = waitMin * waitPerMin;
    const rawTotal = flagfall + distanceCost + waitCost + bikeFee + airportFee + serviceFee;

    let tmNote = '';
    let finalFare = rawTotal;
    if (tm) {
      const cap = 52.50;
      const discount = Math.min(rawTotal, cap) * 0.75;
      finalFare = rawTotal - discount;
      tmNote = `\nTM Discount (75% up to $52.50): -$${discount.toFixed(2)}\nFinal Fare: $${finalFare.toFixed(2)}`;
    }

    setOutput(
      `Distance: ${distanceKm.toFixed(2)} km\nETA: ${durationMin.toFixed(0)} min\nWait Est: ${waitMin.toFixed(1)} min\n` +
      `Fare: $${rawTotal.toFixed(2)}\n` + tmNote
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>Taxi Fare Estimator (NZ)</h2>
      <input value={start} onChange={(e) => setStart(e.target.value)} onBlur={() => searchAddress(start, setStart, setStartCoords)} placeholder="Start address" />
      <input value={end} onChange={(e) => setEnd(e.target.value)} onBlur={() => searchAddress(end, setEnd, setEndCoords)} placeholder="End address" />
      <label><input type="checkbox" checked={bike} onChange={() => setBike(!bike)} /> Include Bike ($5.50)</label>
      <label><input type="checkbox" checked={airport} onChange={() => setAirport(!airport)} /> Airport Barrier ($5.50)</label>
      <label><input type="checkbox" checked={tm} onChange={() => setTM(!tm)} /> Total Mobility (75% off up to $52.50)</label>
      <button onClick={getEstimate}>Estimate Fare</button>
      <pre style={{ marginTop: 20, background: '#fff', padding: 10 }}>{output}</pre>
    </div>
  );
}
