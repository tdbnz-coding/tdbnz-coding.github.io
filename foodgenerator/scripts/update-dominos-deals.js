const fs = require("fs");
const path = require("path");

const SOURCE_URL = "https://www.dominos.co.nz/coupon-vouchers";
const OUTPUT_FILE = path.join(process.cwd(), "deals.json");
const DOMINOS_BASE = "https://www.dominos.co.nz";

function normaliseHtmlText(str) {
  return String(str || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absolutiseImage(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${DOMINOS_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function main() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch source page: ${res.status}`);
  }

  const html = await res.text();

  const nationalMatch = html.match(/nationalDeals:\s*\[(.*?)\],\s*localOffers:/s);
  const localMatch = html.match(/localOffers:\s*\[(.*?)\]\s*[\},]/s);

  if (!nationalMatch || !localMatch) {
    throw new Error("Could not find nationalDeals or localOffers in source.");
  }

  const nationalArraySource = `[${nationalMatch[1]}]`;
  const localArraySource = `[${localMatch[1]}]`;

  const nationalDeals = Function(`"use strict"; return (${nationalArraySource});`)();
  const localOffers = Function(`"use strict"; return (${localArraySource});`)();

  const cleanedNationalDeals = nationalDeals.map(deal => ({
    image: absolutiseImage(deal.image),
    title: normaliseHtmlText(deal.title),
    desc: normaliseHtmlText(deal.desc),
    cta_copy: normaliseHtmlText(deal.cta_copy || "ORDER NOW"),
    cta_link: deal.cta_link,
    voucherCode: new URL(deal.cta_link).searchParams.get("vc") || null
  }));

  const cleanedLocalOffers = localOffers.map(deal => ({
    tag: normaliseHtmlText(deal.tag),
    serviceMethodType: normaliseHtmlText(deal.serviceMethodType),
    title: normaliseHtmlText(deal.title),
    desc: normaliseHtmlText(deal.desc),
    cta_copy: normaliseHtmlText(deal.cta_copy || "ORDER NOW"),
    cta_link: deal.cta_link,
    voucherCode: deal.voucherCode || new URL(deal.cta_link).searchParams.get("vc") || null
  }));

  const out = {
    updatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    nationalDeals: cleanedNationalDeals,
    localOffers: cleanedLocalOffers
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2));
  console.log(`Saved ${cleanedNationalDeals.length} national deals and ${cleanedLocalOffers.length} local offers to deals.json`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});