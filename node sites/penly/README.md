# Penly v0.7.0 — local Admin Update Manager

This is a **local-only prototype**, not safe for public hosting.

## First-time upgrade from v0.6.1

1. Stop Penly (Ctrl+C in VS Code).
2. Copy your entire Penly folder to a safe backup location, including `data/db.json`.
3. From this v0.7.0 ZIP, copy `server.js`, `public/app.js`, `public/index.html`, `package.json`, `update-worker.js`, `update-zip.js` into your EXISTING Penly folder, preserving the relative paths.
4. **Do not replace `data` or `node_modules`.** Create empty `updates` and `backups` folders if missing.
5. Run `npm.cmd start` from your existing Penly folder. No new dependencies are required.
6. Sign in as `admin` and visit More → Admin → System updates.

## Later updates

1. Stop no services: put a **trusted** `penly-update-vX.Y.Z.zip` in your `updates` folder **without extracting it**.
2. Sign in as admin, open More → Admin → System updates, and select Install.
3. Penly checks the version, ZIP paths, allowlisted files and SHA-256 checksums, backs up code and `data/db.json`, then restarts itself.
4. Wait about 10 seconds and refresh. Your letters and achievements are in `data/db.json`, which the updater never overwrites.

The first example update ZIP included in the separate download is **v0.7.1**, which changes a small visible welcome heading so you can test the update manager. It is not an additional feature release.

### Limitations

- The updater is for **local Windows VS Code testing only**. Do NOT expose it on the public internet.
- Update checksums detect corruption but **do not authenticate the publisher**. Only use update ZIPs you trust.
- The updater does not handle dependency changes, database migrations or a production process manager.
- If a restart fails, review `updates/updater.log`, `updates/server.log` and the backups folder.
- Use a fresh demo environment for your first test, and keep independent backups.
