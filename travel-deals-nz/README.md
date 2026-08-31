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

This folder belongs inside the existing `tdbnz-coding.github.io` repository. GitHub Pages will publish it automatically at `https://tdbnz-coding.github.io/travel-deals-nz/` after the change reaches the main branch.

If you use a different GitHub username or repository name, update the canonical and Open Graph URLs in `index.html`, plus the URL in `sitemap.xml` and `robots.txt`.

## Files

- `index.html` — website content and SEO metadata
- `styles.css` — responsive design
- `app.js` — service tabs, form validation and interactions
- `affiliate-config.js` — the only file normally needed for Travelpayouts links
- `robots.txt` and `sitemap.xml` — search-engine discovery
- `.nojekyll` — tells GitHub Pages to serve the files directly

## Help Google find the site

The page includes a canonical URL, crawler metadata, Open Graph and Twitter metadata, descriptive headings, original New Zealand travel content, FAQ structured data, a sitemap and a local social/hero image.

After publishing:

1. Open Google Search Console and verify the `https://tdbnz-coding.github.io/` property.
2. Submit `https://tdbnz-coding.github.io/travel-deals-nz/sitemap.xml` in the Sitemaps report.
3. Inspect `https://tdbnz-coding.github.io/travel-deals-nz/` with URL Inspection.
4. Run **Test live URL**, then choose **Request indexing**.
5. Add a normal link to this travel page from the main `tdbnz-coding.github.io` homepage or another relevant indexed page.

Indexing and ranking are controlled by Google and are not guaranteed. Keep the content accurate, useful and updated, and avoid copying destination articles from other websites.

## Image credit

The Lake Tekapo photograph is by Bernard Spragg. NZ and is dedicated to the public domain under CC0 via Wikimedia Commons.
