# Thomas Imgur Album Downloader (2026)

Static site, no build step.

## Run locally
Open `index.html` in a browser, or serve the folder:

- Python: `python -m http.server 8000`
- Then visit `http://localhost:8000`

## Notes
- Uses an unofficial Imgur endpoint to list album images.
- If that fails due to CORS or endpoint changes, use the `/zip` fallback link shown on the page.
