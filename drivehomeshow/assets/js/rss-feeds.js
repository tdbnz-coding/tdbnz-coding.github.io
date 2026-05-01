// Drive Home Show automatic RSS feed loader
// These are your live Substack feeds. Update them here only if your feed URLs change.
const DHS_POSTS_FEED = "https://drivehomeshow.substack.com/feed";
const DHS_PODCAST_FEED = "https://api.substack.com/feed/podcast/2976961.rss";

const CORS_PROXY = "https://api.allorigins.win/raw?url=";

async function fetchFeed(feedUrl) {
  // Static websites often cannot read RSS directly because of browser CORS rules.
  // This tries direct RSS first, then falls back to a free public CORS proxy.
  try {
    const direct = await fetch(feedUrl, { cache: "no-store" });
    if (direct.ok) return await direct.text();
  } catch (error) {
    console.warn("Direct RSS fetch failed, using proxy", error);
  }

  const proxied = await fetch(CORS_PROXY + encodeURIComponent(feedUrl), { cache: "no-store" });
  if (!proxied.ok) throw new Error("RSS proxy request failed");
  return await proxied.text();
}

function stripHtml(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

function getFirst(item, selectors) {
  for (const selector of selectors) {
    const value = item.querySelector(selector)?.textContent?.trim();
    if (value) return value;
  }
  return "";
}

function getImage(item) {
  const enclosure = item.querySelector("enclosure[type^='image']")?.getAttribute("url");
  const media = item.querySelector("media\\:thumbnail, thumbnail, media\\:content")?.getAttribute("url");
  return enclosure || media || "assets/img/photo-placeholder.svg";
}

function getAudio(item) {
  const enclosure = item.querySelector("enclosure[type^='audio']")?.getAttribute("url");
  return enclosure || "";
}

function parseRss(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  const items = [...xml.querySelectorAll("item")];

  return items.map((item) => {
    const title = getFirst(item, ["title"]);
    const link = getFirst(item, ["link"]);
    const pubDateRaw = getFirst(item, ["pubDate", "published"]);
    const description = stripHtml(getFirst(item, ["description", "content\\:encoded", "encoded"]));
    const image = getImage(item);
    const audio = getAudio(item);

    return {
      title,
      link,
      description,
      image,
      audio,
      pubDate: pubDateRaw ? new Date(pubDateRaw) : null,
    };
  });
}

function formatDate(date) {
  if (!date || Number.isNaN(date.getTime())) return "Latest update";
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function feedCard(item, type = "post") {
  const isPodcast = type === "podcast";
  const intro = item.description.length > 170 ? item.description.slice(0, 170).trim() + "..." : item.description;

  return `
    <article class="rss-card premium-card overflow-hidden h-100">
      <div class="rss-thumb" style="background-image:url('${item.image}')"></div>
      <div class="p-4">
        <div class="d-flex justify-content-between gap-3 align-items-center mb-2">
          <span class="rss-badge">${isPodcast ? "Podcast" : "Post"}</span>
          <span class="small text-secondary">${formatDate(item.pubDate)}</span>
        </div>
        <h3 class="h5 fw-bold mb-2">${item.title}</h3>
        <p class="text-secondary mb-3">${intro || "Open this item on Substack to read or listen."}</p>
        ${item.audio ? `<audio controls preload="none" class="w-100 mb-3"><source src="${item.audio}"></audio>` : ""}
        <a class="btn btn-dark-premium btn-sm" href="${item.link}" target="_blank" rel="noopener">${isPodcast ? "Open episode" : "Read post"}</a>
      </div>
    </article>
  `;
}

async function loadFeed(target, feedUrl, type, limit = 6) {
  target.innerHTML = `
    <div class="rss-loading premium-card p-4 text-center">
      <div class="spinner-border text-pink" role="status" aria-hidden="true"></div>
      <p class="text-secondary mt-3 mb-0">Loading latest ${type === "podcast" ? "episodes" : "posts"}...</p>
    </div>
  `;

  try {
    const xml = await fetchFeed(feedUrl);
    const items = parseRss(xml).slice(0, limit);

    if (!items.length) throw new Error("No RSS items found");

    target.innerHTML = `<div class="row g-4">${items.map((item) => `<div class="col-md-6 col-xl-4">${feedCard(item, type)}</div>`).join("")}</div>`;
  } catch (error) {
    console.error(error);
    target.innerHTML = `
      <div class="substack-fallback">
        <h3 class="h5 fw-bold">Could not load the live RSS feed</h3>
        <p class="text-secondary mb-3">Some static hosts block browser RSS loading. The direct Substack links still work.</p>
        <a class="btn btn-gold" href="${type === "podcast" ? "https://drivehomeshow.substack.com/podcast" : "https://drivehomeshow.substack.com"}" target="_blank" rel="noopener">Open on Substack</a>
      </div>
    `;
  }
}

function initRssFeeds() {
  document.querySelectorAll("[data-rss-posts]").forEach((target) => loadFeed(target, DHS_POSTS_FEED, "post", Number(target.dataset.limit || 6)));
  document.querySelectorAll("[data-rss-podcasts]").forEach((target) => loadFeed(target, DHS_PODCAST_FEED, "podcast", Number(target.dataset.limit || 6)));
}

document.addEventListener("DOMContentLoaded", initRssFeeds);
