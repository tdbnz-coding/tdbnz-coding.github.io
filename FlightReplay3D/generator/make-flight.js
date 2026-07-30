function generate() {
  const f = document.getElementById("flight").value.trim();
  const d = document.getElementById("date").value.trim();

  if (!f || !d) {
    document.getElementById("output").textContent = "Please enter both flight number and date.";
    return;
  }

  const cleanDate = d.replace(/-/g, "");
  const folder = `${f}-${cleanDate}`;

  const output = `
flights/${folder}/
   track.csv
   track.json
   track.kml
   photo.jpg
   weather.txt

Paste this folder into your FlightReplay3D/flights/ directory.
Then fill in the files with your FlightRadar24 data.
`;

  document.getElementById("output").textContent = output;
}
