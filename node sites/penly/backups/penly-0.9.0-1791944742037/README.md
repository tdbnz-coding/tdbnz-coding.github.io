# Penly v0.9.0 local preview

Requires Node.js 22.13+ (Node 24 LTS recommended). From your Penly folder run `npm.cmd install` then `npm.cmd start`. Open http://localhost:3000.

SQLite is created automatically at data/penly.sqlite. Existing data/db.json is imported on first launch and copied to a timestamped backup. Keep your entire data folder safe.

Install update ZIP from the existing admin page after placing it in updates/. This update supports v0.7.1 and v0.8.0. Do not overwrite the data folder.

Penly Plus is a local test membership only; no billing or payment processing. Admins may grant test memberships. 150 monthly coins require a manual claim once per calendar month. Postcards are illustrated themes, not photo uploads. World Explorer remains country tiles rather than a geographic map. Do not expose this local preview publicly: sessions, rate limiting, verification, moderation and security need production work.
