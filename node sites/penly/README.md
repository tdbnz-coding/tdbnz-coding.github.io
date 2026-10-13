# Penly v0.4 — Local Windows 11 demo

A Node.js/Express prototype with permanent collectible stamps, a stamp shop, recommendations, friend requests, letters, profiles, drafts, achievements and admin overview.

## Start in VS Code (Windows 11)

1. Install Node.js LTS from https://nodejs.org/ if not already installed.
2. Extract the ZIP. Open the **penly-site** folder in VS Code (File > Open Folder).
3. Choose Terminal > New Terminal. Run:

   npm install
   npm start

4. Open http://localhost:3000 in your browser.
5. Sign in with `admin` / `admin123!` or one of the other demo accounts in DEMO-ACCOUNTS.txt.

If PowerShell blocks npm, open a **Command Prompt** terminal in VS Code and run the commands there.

## Try the stamp system

1. Sign in as `emma` (password `emma123!`) and request to be pen pals with `alex`.
2. Sign out and sign in as `alex` (password `alex123!`). Accept the request in **Friends**.
3. Sign back in as `emma`. Visit **Stamp Shop** and unlock stamps using your 100 demo coins.
4. Visit **My Stamp Album** to see owned, locked and achievement stamps.
5. Open **Friends**, choose **Write letter** to Alex. Penly suggests stamps based on Alex's interests and stamps he hasn't received.
6. Pick a stamp and send. Wait **30 seconds**, then sign in as Alex and visit **Letters** and **My Stamp Album**. Alex receives his own copy of the stamp, while Emma keeps hers.
7. Try the same stamp again — it is reusable indefinitely.

## Notes

- 30-second delivery is **testing only**. The mailbox refreshes every 5 seconds.
- Demo coins are not money. Every account starts with 100 coins, gets 10 coins per sent letter and 5 per received letter. Stamp purchases are permanent.
- Stamp designs use emoji placeholders, not final illustrated artwork.
- Recommendations are simple, explainable interest/collection matching, not AI and not guaranteed to be ideal.
- Data is saved locally to `data/db.json` (automatically created on first run). **Do not overwrite or delete it if you want to keep your progress.**
- This prototype is **not production-ready**: demo passwords, development session handling, JSON-file storage, missing CSRF/rate limiting and limited moderation make it unsuitable for public deployment.
- To stop the server press Ctrl+C in the terminal.
