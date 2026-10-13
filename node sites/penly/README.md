# Penly v0.6 — local development demo

## Windows 11 + VS Code
1. Install Node.js LTS from the official Node.js website.
2. Extract this ZIP to a new folder (do not mix it with v0.5).
3. Open the `penly-v06` folder in VS Code (the folder containing `package.json`).
4. Terminal > New Terminal. Run `npm.cmd install` then `npm.cmd start`.
5. Visit http://localhost:3000.
6. Log in with `emma` / `emma123!`, or `admin` / `admin123!`. Other demo logins are in DEMO-ACCOUNTS.txt.

## New in v0.6
- Animated envelope visual and open-letter effect; reply button.
- Stationery selection: cream, rose, sky, mint.
- Delivery countdown (30 seconds for local testing).
- Pen pal discovery by name/country/language/interests, plus Surprise Me.
- Penly Travel Journal country tiles, country milestones and stamp counts.
- Monthly letter challenges and writing level.
- Profile contact controls: everyone, accepted pen pals, or nobody.
- Basic outgoing first-contact rate limit (3 letters to one recipient per hour).
- Notifications for accepted friend requests.
- Mobile navigation, responsive layouts and reduced-motion support.
- Existing stamp shop, permanent stamp collection, smart stamp suggestions, bell notifications, reports, blocks, drafts and demo admin.

## Test
1. Sign in as Emma, discover Alex, write without friending, choose stationery/stamp, send.
2. Check travelling countdown; after 30 seconds sign in as Alex and check the bell/mailbox.
3. Open the envelope, reply, check Travel Journal and Challenges.
4. Under Profile, set contact policy to Friends or Nobody and test sender restrictions.

## Important limitations
Local prototype only. Data is stored in `data/db.json`. This is not production-ready. No actual photo attachments, interactive geographic map, PWA installation, browser push notifications, email verification, password reset, anti-abuse service, or real-money purchases. Sessions are in memory, no HTTPS, and demo passwords are public. Do not deploy publicly or store real personal letters.
