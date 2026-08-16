AUCKLAND AIRPORT LIVE FLIGHT BOARD
==================================

Website:
- index.html
- css/style.css
- js/app.js

Cloudflare:
- cloudflare/worker.js

The Auckland board uses the shared Worker:
https://flightboard.thomasnz.workers.dev/

Auckland:
- Arrivals:   ?airport=AKL&flightDirection=A
- Departures: ?airport=AKL&flightDirection=D

The included Worker also continues to support Christchurch:
- airport=CHC
- flightDirection=Arrive or Depart
- flightType=Domestic or International

INSTALL
1. Replace your Cloudflare Worker code with cloudflare/worker.js and deploy.
2. Upload index.html, css/ and js/ to the Auckland flight-board site.
3. Open the page and press Refresh now.

The Auckland frontend provides:
- Arrivals / Departures
- Domestic / International / All
- Flight/city/airline search
- Scheduled, Estimated and Actual times
- Gate
- Bag claim
- Terminal
- Status
- Codeshares
- Mobile responsive cards
- Manual refresh
- Automatic refresh every 10 minutes
