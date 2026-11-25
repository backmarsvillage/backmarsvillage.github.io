// Ergänzt die Merch-Favoriten (content/favorites.json) automatisch um Bild, Name und Preis.
// Im CMS wird nur der Produkt-Link aus dem Spreadshop eingetragen – den Rest holt dieses Skript von der Produktseite.
import { readFile, writeFile } from "node:fs/promises";

const FILE = "content/favorites.json";
const favs = JSON.parse(await readFile(FILE, "utf8") || "[]");

const decode = s => String(s || "")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

let changed = 0;
for (const f of favs) {
  const link = String(f.link || "").trim();
  if (!/^https?:\/\/[^/]*myspreadshop\./i.test(link)) { console.warn("Kein Spreadshop-Link:", link); continue; }
  try {
    const res = await fetch(link, { headers: { "User-Agent": "Mozilla/5.0 (Favoriten-Bot backmarsvillage.github.io)", "Accept-Language": "de-DE" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    let product = null;
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
      try { const j = JSON.parse(m[1]); if (j["@type"] === "Product") product = j; } catch {}
    }
    const meta = p => decode((html.match(new RegExp(`<meta[^>]*property="${p}"[^>]*content="([^"]*)"`)) || [])[1]);

    const title = (product?.name || meta("og:title").replace(/\s*\|\s*Spreadshop\s*$/, "")).trim();
    let image = product?.image || meta("og:image");
    if (Array.isArray(image)) image = image[0];
    image = String(image || "").split("?")[0];
    if (image) image += "?width=700&height=700";

    let price = "";
    const offer = [].concat(product?.offers || [])[0];
    if (offer?.price) price = `${Number(offer.price).toFixed(2).replace(".", ",")} €`;
    if (!price) price = decode((html.match(/sprd-product-price__value[^>]*>([^<]+)</) || [])[1]).trim();

    for (const [k, v] of Object.entries({ title, image, price })) {
      if (v && f[k] !== v) { f[k] = v; changed++; }
    }
    console.log(`OK: ${title} – ${price}`);
  } catch (e) {
    console.warn(`Fehler bei ${link}: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 1500));
}

if (changed) {
  await writeFile(FILE, JSON.stringify(favs, null, 2) + "\n");
  console.log(`${changed} Angaben aktualisiert.`);
} else console.log("Keine Änderungen.");
