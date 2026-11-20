# Backmars Village – Website

Offizielle Website der Leipziger Metal-Band **Backmars Village**. Statische Seite (HTML/CSS/JS), gehostet kostenlos über **GitHub Pages**.

## Inhalte bearbeiten

### Variante A – Pages CMS (komfortabel, mit Formularen)
1. <https://app.pagescms.org> öffnen → **Sign in with GitHub**.
2. Beim ersten Mal die Pages-CMS-App für dieses Repository freigeben.
3. Repository `backmarsvillage.github.io` wählen. Links erscheinen: **Gigs / Live-Termine**, **Videos**, **Releases**, **Website-Inhalte**.
4. Ändern → **Save**. Nach ca. 1 Minute ist die Änderung live.

### Variante B – direkt auf GitHub
Im Ordner `content/` die JSON-Datei öffnen → Stift-Symbol → bearbeiten → **Commit changes**.

| Datei | Inhalt |
|---|---|
| `content/gigs.json` | Live-Termine (vergangene wandern automatisch nach „Vergangene Shows“) |
| `content/videos.json` | YouTube-Videos (`featured: true` = groß oben) |
| `content/releases.json` | Diskografie mit Covern und Links |
| `content/site.json` | Texte, Mitglieder, Links, Instagram-Posts, Impressum |

**Neuer Gig (Beispiel):**
```json
{ "date": "2027-03-14", "time": "20:00", "city": "Leipzig", "venue": "Bandhaus", "address": "", "with": "", "tickets": "", "note": "" }
```

## Bilder
Eigene Fotos über Pages CMS hochladen (landen in `images/`) oder per **Add file → Upload files** in den Ordner `images/` legen und als `images/dateiname.jpg` eintragen.

## Wichtig
- **Impressum** in `content/site.json` ausfüllen (Pflicht in Deutschland).
- Videos/Spotify/Instagram werden erst nach Zustimmung geladen (DSGVO-freundliche 2-Klick-Lösung).
