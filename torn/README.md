# Torn Status Site (Fancy) + Worker

## What this is
- Fancy mobile + desktop Torn status page.
- Public shows: status, travel, arrival, basic work stats, avatar.
- Private mode shows: bars, cooldowns, work, networth.

## Update frequency
- The page refreshes about every 30 seconds.
- The Worker caches Torn calls for about 20 seconds, so multiple viewers do not spam the Torn API.

## Setup
1) GitHub Pages
- Upload these files to a repo (root of repo)
- Enable Pages: Settings -> Pages -> Deploy from branch -> main -> /root

2) Cloudflare Worker
- Create a Worker, paste worker.js contents into the editor
- Add secrets:
  - TORN_API_KEY
  - DASH_PASSWORD
- Deploy
- Test: https://YOUR-WORKER.workers.dev/public

3) config.js
- Ensure API_BASE is set to your Worker URL.
