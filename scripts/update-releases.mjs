// Prüft täglich, ob Backmars Village etwas Neues veröffentlicht hat, und trägt es in content/releases.json ein.
// Quelle: Apple/iTunes-Katalog (kostenlos, ohne Schlüssel). Spotify-Link + weitere Dienste kommen über song.link.
// Neue Releases erscheinen automatisch im Slider "Neueste Veröffentlichung" und in der Diskografie.
import { readFile, writeFile } from "node:fs/promises";

const ARTIST_ID = "1637131252"; // Backmars Village bei Apple Music
const FILE = "content/releases.json";
const SPOTIFY_ARTIST = "https://open.spotify.com/artist/0dgStecxqQ9sBurlK0tDnI";

const norm = s => String(s || "")
  .toLowerCase()
  .replace(/\s*-\s*(single|ep)$/i, "")
  .replace(/[’'`´]/g, "")
  .replace(/[^a-z0-9äöüß]+/g, " ")
  .trim();

const releases = JSON.parse(await readFile(FILE, "utf8"));
const knownIds = new Set(releases.map(r => String(r.appleId || "")).filter(Boolean));
const knownTitles = new Set(releases.map(r => norm(r.title)));

const res = await fetch(`https://itunes.apple.com/lookup?id=${ARTIST_ID}&entity=album&limit=200&country=de`);
if (!res.ok) throw new Error(`iTunes ${res.status}`);
const albums = (await res.json()).results.filter(x => x.wrapperType === "collection");

let added = 0;
for (const a of albums) {
  const id = String(a.collectionId);
  const title = a.collectionName.replace(/\s*-\s*(Single|EP)$/i, "").trim();
  if (knownIds.has(id) || knownTitles.has(norm(title))) continue;

  const type = /- EP$/i.test(a.collectionName) ? "EP" : a.trackCount > 4 ? "Album" : "Single";
  const apple = (a.collectionViewUrl || `https://music.apple.com/de/album/${id}`).split("?")[0];
  let cover = (a.artworkUrl100 || "").replace(/100x100bb/, "1000x1000bb");
  let spotify = "";

  try { // Spotify-Link (und besseres Cover) über song.link ermitteln
    const sl = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(apple)}&userCountry=DE`);
    if (sl.ok) {
      const j = await sl.json();
      spotify = j.linksByPlatform?.spotify?.url || "";
      const sp = Object.values(j.entitiesByUniqueId || {}).find(e => e.apiProvider === "spotify");
      if (sp?.thumbnailUrl) cover = sp.thumbnailUrl;
    }
  } catch (e) { console.warn("song.link nicht erreichbar:", e.message); }

  releases.push({
    title, type,
    date: (a.releaseDate || "").slice(0, 10),
    cover,
    spotify: spotify || SPOTIFY_ARTIST,
    apple,
    tracks: "",
    appleId: id
  });
  knownIds.add(id); knownTitles.add(norm(title));
  added++;
  console.log(`Neu: ${title} (${a.releaseDate?.slice(0, 10)})`);
  await new Promise(r => setTimeout(r, 7000)); // song.link: max. 10 Anfragen/Minute
}

if (added) {
  releases.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  await writeFile(FILE, "[\n" + releases.map(r => "  " + JSON.stringify(r)).join(",\n") + "\n]\n");
}
console.log(added ? `${added} neue Veröffentlichung(en) eingetragen.` : "Nichts Neues.");
