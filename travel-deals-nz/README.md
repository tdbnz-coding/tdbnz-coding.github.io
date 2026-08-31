# Travel Deals NZ

A polished, mobile-friendly static travel affiliate website designed for GitHub Pages. It includes flights, hotels, car hire, tours, travel insurance, airport transfers and holiday rentals.

## Important: connect your affiliate tracking

The site currently uses normal provider links as safe fallbacks. Those fallback links do **not** earn commission.

Before promoting the website:

1. Join the relevant programmes in your Travelpayouts account.
2. Copy the full affiliate link for each programme.
3. Open `affiliate-config.js`.
4. Replace each fallback URL with the matching Travelpayouts affiliate link.
5. Confirm the resulting links contain your Partner ID/marker, or use the short links supplied by Travelpayouts.

Your Partner ID and generated affiliate links may be used in public pages. Your **API token is secret** and must never be committed to GitHub or placed in this website.

For a full Travelpayouts flight/hotel search widget, create the widget in your Travelpayouts dashboard and replace the fallback form in `index.html` with the code Travelpayouts supplies. The dashboard-generated widget code automatically contains the correct Partner ID.

## Publish with GitHub Pages

1. Create a public GitHub repository named `travel-deals-nz`.
2. Upload every file in this folder to the repository's main branch.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then save.
6. The site will be available at `https://tdbnz-coding.github.io/travel-deals-nz/`.

If you use a different GitHub username or repository name, update the canonical and Open Graph URLs in `index.html`, plus the URL in `sitemap.xml` and `robots.txt`.

## Files

- `index.html` — website content and SEO metadata
- `styles.css` — responsive design
- `app.js` — service tabs, form validation and interactions
- `affiliate-config.js` — the only file normally needed for Travelpayouts links
- `robots.txt` and `sitemap.xml` — search-engine discovery
- `.nojekyll` — tells GitHub Pages to serve the files directly

## Image credit

The Lake Tekapo photograph is by Bernard Spragg. NZ and is dedicated to the public domain under CC0 via Wikimedia Commons.
