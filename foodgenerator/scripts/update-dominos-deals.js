const fs = require("fs");
const path = require("path");

const SOURCE_URL = "https://www.dominos.co.nz/coupon-vouchers";
const DOMINOS_BASE = "https://www.dominos.co.nz";
const OUTPUT_FILE = path.join(process.cwd(), "foodgenerator", "deals.json");

function normaliseHtmlText(str) {
  return String(str || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absolutiseImage(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${DOMINOS_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function extractVoucherCode(url, fallback = null) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("vc") || fallback;
  } catch {
    return fallback;
  }
}

function ensureOutputDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

async function fetchSourceHtml() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ThomasCouponsBot/1.0; +https://tdbnz-coding.github.io/foodgenerator/dominos.html)",
      "accept": "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Domino's source page: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractDealsFromHtml(html) {
  const nationalMatch = html.match(/nationalDeals:\s*\[(.*?)\],\s*localOffers:/s);
  const localMatch = html.match(/localOffers:\s*\[(.*?)\]\s*[\},]/s);

  if (!nationalMatch) {
    throw new Error("Could not find nationalDeals in the Domino's source.");
  }

  if (!localMatch) {
    throw new Error("Could not find localOffers in the Domino's source.");
  }

  const nationalArraySource = `[${nationalMatch[1]}]`;
  const localArraySource = `[${localMatch[1]}]`;

  let nationalDeals;
  let localOffers;

  try {
    nationalDeals = Function(`"use strict"; return (${nationalArraySource});`)();
  } catch (error) {
    throw new Error(`Failed to parse nationalDeals: ${error.message}`);
  }

  try {
    localOffers = Function(`"use strict"; return (${localArraySource});`)();
  } catch (error) {
    throw new Error(`Failed to parse localOffers: ${error.message}`);
  }

  return { nationalDeals, localOffers };
}

function cleanNationalDeals(nationalDeals) {
  return nationalDeals.map((deal) => ({
    image: absolutiseImage(deal.image),
    title: normaliseHtmlText(deal.title),
    desc: normaliseHtmlText(deal.desc),
    cta_copy: normaliseHtmlText(deal.cta_copy || "ORDER NOW"),
    cta_link: deal.cta_link || "",
    voucherCode: extractVoucherCode(deal.cta_link || "", deal.voucherCode || null)
  }));
}

function cleanLocalOffers(localOffers) {
  return localOffers.map((deal) => ({
    tag: normaliseHtmlText(deal.tag),
    serviceMethodType: normaliseHtmlText(deal.serviceMethodType),
    title: normaliseHtmlText(deal.title),
    desc: normaliseHtmlText(deal.desc),
    cta_copy: normaliseHtmlText(deal.cta_copy || "ORDER NOW"),
    cta_link: deal.cta_link || "",
    voucherCode: extractVoucherCode(deal.cta_link || "", deal.voucherCode || null)
  }));
}

function saveDealsFile(data) {
  ensureOutputDirectoryExists(OUTPUT_FILE);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function main() {
  console.log(`Fetching deals from ${SOURCE_URL}`);
  console.log(`Output path: ${OUTPUT_FILE}`);

  const html = await fetchSourceHtml();
  const { nationalDeals, localOffers } = extractDealsFromHtml(html);

  const cleanedNationalDeals = cleanNationalDeals(nationalDeals);
  const cleanedLocalOffers = cleanLocalOffers(localOffers);

  const output = {
    updatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    nationalDeals: cleanedNationalDeals,
    localOffers: cleanedLocalOffers
  };

  saveDealsFile(output);

  console.log(`Saved ${cleanedNationalDeals.length} national deals and ${cleanedLocalOffers.length} local offers to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("Update failed:");
  console.error(error);
  process.exit(1);
});