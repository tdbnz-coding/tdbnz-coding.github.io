# ClueDrop Daily

A mobile-first daily general-knowledge game. Players get five progressively easier clues and one guess per clue. The earlier they solve the mystery, the more points they earn.

## Included

- A fresh daily puzzle chosen by the player's local date
- 64 built-in general-knowledge mysteries
- Five-clue scoring from 5 points down to 1
- Daily streak, win rate and best-streak statistics
- Browser storage so progress survives refreshes
- Spoiler-free result sharing
- Responsive phone, tablet and desktop design
- Keyboard and screen-reader-friendly controls

## Run locally

You need Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the local address shown in the terminal.

## Upload without building

The ZIP includes a ready-to-upload website inside `dist/client`. Upload the **contents** of that folder to GitHub Pages, Cloudflare Pages or another static web host.

## Build for production

```bash
npm run build
npm run start
```

After a new production build, the refreshed static files are in `dist/client`.

The game has no database or external API. Its puzzle library is in `app/page.tsx`, so you can add new puzzles by copying an existing puzzle object and changing the answer, aliases, category, five clues and fact.

## Game rules

1. Read the first clue and enter one answer.
2. A wrong guess or skip reveals the next, easier clue.
3. Solving on clue one earns 5 points; solving on clue five earns 1 point.
4. Share results without revealing the mystery answer.

Created for Thomas Bernard.
