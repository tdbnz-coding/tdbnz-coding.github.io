Christchurch Airport Live Flight Board

Configured Cloudflare Worker:
https://flightboard.thomasnz.workers.dev/

Files:
- index.html
- css/style.css
- js/app.js

Important about GitHub Secrets:
GitHub Secrets cannot hide an API/Worker URL that the browser itself must call.
Even if a GitHub Action injects the URL during deployment, the final JavaScript
downloaded by visitors will still contain that URL and it can be seen in DevTools.

The secure part is that the Christchurch Airport upstream endpoint and any private
credentials can stay inside the Cloudflare Worker. The public Worker URL itself
should be treated as public.

This version removes the flight-data footer attribution text and improves mobile
readability, spacing, controls, cards, status badges, and very-small-screen layout.
