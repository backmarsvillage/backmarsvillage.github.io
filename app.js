/* Backmars Village – Website-Logik.
   Inhalte kommen aus /content/*.json (bearbeitbar über Pages CMS oder direkt auf GitHub). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const img = (src = "") => (src.startsWith("/") && !src.startsWith("//") ? src.slice(1) : src); // CMS-Pfade relativ machen
  const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  let TX = {}; // Texte aus content/site.json → texts
  const AUTOLOAD = true; // externe Medien (YouTube, Spotify, Instagram) direkt laden; false = erst per Klick

  const load = name => fetch(`content/${name}.json?v=${Date.now()}`).then(r => r.ok ? r.json() : null).catch(() => null);

  /* ---------- externe Medien ---------- */
  function placeholder(el, { iframe, label, bg, note }) {
    const ph = document.createElement("button");
    ph.className = "ph";
    ph.type = "button";
    if (bg) ph.style.backgroundImage = `url("${bg}")`;
    ph.innerHTML = `<span class="ph__play">▶</span><span class="ph__label">${esc(label)}</span><span class="ph__note">${esc(note)}</span>`;
    const activate = () => { el.innerHTML = iframe; };
    ph.addEventListener("click", activate);
    el.innerHTML = "";
    el.appendChild(ph);
    if (AUTOLOAD) activate();
  }
  const yt = (id, autoplay) => `<iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0${autoplay ? "&autoplay=1" : ""}" title="YouTube Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`;

  /* ---------- Hintergrundvideo im Titelbereich (Fallback: Titelbild) ---------- */
  function heroVideo(ids) {
    ids = (ids || []).map(v => String(v).trim()).filter(Boolean);
    if (!ids.length) return;
    const c = navigator.connection;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (c && (c.saveData || /2g/.test(c.effectiveType || ""))) return; // Datensparmodus / langsames Netz → nur Bild
    const box = $("#heroVideo");
    box.innerHTML = '<div id="heroPlayer"></div>';
    let player;
    window.onYouTubeIframeAPIReady = () => {
      player = new YT.Player("heroPlayer", {
        host: "https://www.youtube-nocookie.com",
        videoId: ids[0],
        playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, loop: 1, playlist: ids.join(",") },
        events: {
          onReady: e => { e.target.mute(); e.target.playVideo(); },
          onStateChange: e => {
            if (e.data === 1) box.classList.add("is-playing");          // läuft → Video einblenden
            else if (e.data === 0 || e.data === -1) box.classList.remove("is-playing"); // Wechsel → kurz Bild
          },
          onError: () => box.classList.remove("is-playing")
        }
      });
    };
    const sc = document.createElement("script");
    sc.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(sc);
    // falls der Browser Autoplay blockiert: bei der ersten Interaktion (Tippen/Klicken/Taste) starten
    const kick = () => { if (player && player.playVideo) { player.mute(); player.playVideo(); } };
    ["pointerdown", "touchstart", "keydown"].forEach(ev => addEventListener(ev, kick, { once: true, passive: true }));
    // außerhalb des Sichtbereichs pausieren (spart Akku & Daten)
    new IntersectionObserver(([e]) => {
      if (!player || !player.playVideo) return;
      e.isIntersecting ? player.playVideo() : player.pauseVideo();
    }).observe($(".hero"));
  }

  /* ---------- Merch: Spreadshop ---------- */
  function shopEmbed(shop) {
    if (!shop || shop.enabled === false) return;
    const name = String(shop.name || "").trim().replace(/^https?:\/\//, "").replace(/\.myspreadshop\..*$/, "");
    if (!name) return;
    SHOP_ON = true;
    $("#merch").hidden = false;
    $("#navMerch").hidden = false;
    window.spread_shop_config = {
      prefix: `https://${name}.myspreadshop.de`,
      shopName: name,
      baseId: "shop",
      locale: "de_DE",
      updateMetadata: false
    };
    const sc = document.createElement("script");
    sc.src = `https://${name}.myspreadshop.net/js/shopclient.nocache.js`;
    sc.onerror = () => { $("#shop").innerHTML = `<p class="shop__loading">Shop gerade nicht erreichbar – <a href="https://${name}.myspreadshop.de" target="_blank" rel="noopener">hier direkt zum Shop</a>.</p>`; };
    document.body.appendChild(sc);
  }


  /* ---------- Merch-Favoriten (content/favorites.json, im CMS unter „Merch-Favoriten“) ---------- */
  let SHOP_ON = false;
  // Spreadshirt-Bild: ganze Ware statt nur Motiv-Ausschnitt zeigen
  const favImg = u => { u = String(u || ""); if (!/\/compositions\//.test(u)) return u; const ap = (u.match(/DPT\d+A(\d+)/) || [])[1]; return u.replace("/compositions/", "/products/").replace(/\.jpg(\?.*)?$/, ".png?width=700&height=700") + (ap ? "&appearanceId=" + ap : ""); };
  function renderFavorites(list) {
    list = (list || []).filter(f => f && f.link);
    if (!list.length || !SHOP_ON) return;
    $("#favGrid").innerHTML = list.map(f => {
      let href = f.link, inShop = false;
      try { // Produkt im eingebetteten Shop auf dieser Seite öffnen statt auf die Spreadshop-Seite zu wechseln
        const u = new URL(f.link);
        if (/myspreadshop\./.test(u.hostname)) { href = `#!${u.pathname}${u.search}`; inShop = true; }
      } catch {}
      const name = f.name || String(f.title || "Zum Produkt").replace(/^Backmars Village\s*[–-]\s*/i, "");
      return `<a class="fav" href="${esc(href)}"${inShop ? " data-shop" : ' target="_blank" rel="noopener"'}>
        <span class="fav__img">${f.image ? `<img src="${esc(favImg(f.image))}" alt="${esc(name)}" loading="lazy">` : ""}</span>
        <span class="fav__name">${esc(name)}</span>${f.price ? `<span class="fav__price">${esc(f.price)}</span>` : ""}</a>`;
    }).join("");
    $("#favs").hidden = false;
    $("#favGrid").addEventListener("click", e => {
      const a = e.target.closest("a[data-shop]");
      if (a) setTimeout(() => $("#shop").scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    });
  }

  /* ---------- Rendering ---------- */
  function renderSite(s) {
    if (!s) return;
    document.querySelectorAll("[data-bind]").forEach(el => { const v = s[el.dataset.bind]; if (v) el.textContent = v; });
    document.querySelectorAll("[data-bind-src]").forEach(el => { const v = s[el.dataset.bindSrc]; if (v) el.src = img(v); });
    if (s.heroImage) $("#heroBg").style.backgroundImage = `url("${img(s.heroImage)}")`;
    heroVideo(s.heroVideos);

    // Bandname groß im Titelbereich (Zeilenumbruch beim Leerzeichen)
    if (s.bandName) $("#heroTitle").innerHTML = esc(s.bandName).replace(" ", "<br>");

    // Überschriften & Texte aus dem CMS (data-text="bereich.feld")
    const T = TX = s.texts || {};
    document.querySelectorAll("[data-text]").forEach(el => {
      const v = el.dataset.text.split(".").reduce((o, k) => (o || {})[k], T);
      if (v) el.textContent = v;
    });

    const links = s.links || [];
    const chips = links.map(l => `<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("");
    $("#platforms").innerHTML = chips;
    $("#socials").innerHTML = chips;

    $("#members").innerHTML = (s.members || []).map(m => `
      <li><div class="who">${m.photo ? `<img src="${esc(img(m.photo))}" alt="">` : ""}<b>${esc(m.name)}</b></div><span>${esc(m.role)}</span></li>`).join("");

    // Merch-Shop (Spreadshop) einbetten, wenn im CMS ein Shop-Name eingetragen und eingeschaltet ist
    shopEmbed(s.shop);

    if (s.bookingEmail) { $("#mailBtn").href = `mailto:${s.bookingEmail}?subject=Booking%20Backmars%20Village`; $("#mailBtn").textContent = s.bookingEmail; }

    $("#instaGrid").innerHTML = "";
    (s.instagramPosts || []).forEach(url => {
      const clean = url.split("?")[0].replace(/\/$/, "");
      const box = document.createElement("div");
      box.className = "embed embed--insta";
      $("#instaGrid").appendChild(box);
      placeholder(box, {
        iframe: `<iframe src="${esc(clean)}/embed/" loading="lazy" title="Instagram-Post" scrolling="no"></iframe>`,
        label: "Instagram-Post laden", note: "Lädt Inhalte von Instagram (Datenübertragung an Meta)."
      });
    });

    $("#impressumText").textContent = s.impressum || "";
  }

  function renderVideos(list) {
    if (!list || !list.length) return;
    const feat = list.find(v => v.featured) || list[0];
    const fe = $("#videoFeature");
    fe.innerHTML = `<div class="embed embed--video" id="featEmbed"></div><div class="video-feature__cap"><b>${esc(feat.title)}</b><span>${esc(feat.kind || "")}</span></div>`;
    const showFeature = (v, autoplay) => {
      fe.querySelector(".video-feature__cap b").textContent = v.title;
      fe.querySelector(".video-feature__cap span").textContent = v.kind || "";
      placeholder($("#featEmbed"), {
        iframe: yt(v.youtube, autoplay), bg: `https://i.ytimg.com/vi/${v.youtube}/maxresdefault.jpg`,
        label: v.title, note: "Klick lädt das Video von YouTube (Datenübertragung an Google)."
      });
    };
    showFeature(feat, false);

    const grid = $("#videoGrid");
    grid.innerHTML = "";
    list.filter(v => v !== feat).forEach(v => {
      const b = document.createElement("button");
      b.className = "vcard";
      b.innerHTML = `<div class="vcard__img"><img loading="lazy" src="https://i.ytimg.com/vi/${esc(v.youtube)}/hqdefault.jpg" alt=""></div><b>${esc(v.title)}</b><small>${esc(v.kind || "")}</small>`;
      b.addEventListener("click", () => {
        showFeature(v, true);
        $("#featEmbed .ph")?.click();
        fe.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      grid.appendChild(b);
    });
  }

  /* ---------- Veröffentlichungen: Slider (neueste zuerst, ‹ › blättert) ---------- */
  function renderSlider(list, texts) {
    const track = $("#relTrack"), dots = $("#relDots");
    if (!list || !list.length) { $("#release").hidden = true; return; }
    const labelNew = (texts && texts.release && texts.release.eyebrowLatest) || "Neueste Veröffentlichung";
    const labelOld = (texts && texts.release && texts.release.eyebrowOlder) || "Veröffentlichung";
    const embedUrl = r => {
      const m = (r.spotify || "").match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(album|track)\/([A-Za-z0-9]+)/);
      return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : "";
    };
    const fmt = d => { const x = new Date(d + "T12:00:00"); return isNaN(x) ? "" : x.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }); };
    track.innerHTML = list.map((r, i) => `
      <article class="slide" aria-roledescription="Slide" aria-label="${i + 1} von ${list.length}">
        <img class="release__cover" src="${esc(img(r.cover))}" alt="Cover ${esc(r.title)}" loading="${i < 2 ? "eager" : "lazy"}">
        <div class="slide__info">
          <p class="eyebrow">${esc(i === 0 ? labelNew : labelOld)} · ${esc(r.type || "Single")}</p>
          <h2 class="h2 slide__title">${esc(r.title)}</h2>
          <p class="lead slide__meta">${esc(fmt(r.date))}${r.tracks ? " · " + esc(r.tracks) : ""}</p>
          <div class="slide__links">
            ${r.spotify ? `<a class="chip" href="${esc(r.spotify)}" target="_blank" rel="noopener">Spotify</a>` : ""}
            ${r.apple ? `<a class="chip" href="${esc(r.apple)}" target="_blank" rel="noopener">Apple Music</a>` : ""}
          </div>
          <div class="embed embed--spotify" data-embed="${esc(embedUrl(r))}"></div>
        </div>
      </article>`).join("");
    dots.innerHTML = list.map((r, i) => `<button aria-label="${esc(r.title)}" data-i="${i}"></button>`).join("");

    let cur = 0;
    const loadEmbed = i => {
      const box = track.children[i]?.querySelector("[data-embed]");
      if (!box || box.dataset.loaded || !box.dataset.embed) return;
      box.dataset.loaded = "1";
      placeholder(box, {
        iframe: `<iframe src="${box.dataset.embed}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify"></iframe>`,
        label: "Auf Spotify anhören", note: "Lädt den Spotify-Player."
      });
    };
    const go = i => {
      cur = Math.max(0, Math.min(list.length - 1, i));
      track.style.transform = `translateX(-${cur * 100}%)`;
      $("#relNewer").disabled = cur === 0;
      $("#relOlder").disabled = cur === list.length - 1;
      [...dots.children].forEach((d, k) => d.classList.toggle("on", k === cur));
      loadEmbed(cur);
    };
    $("#relNewer").onclick = () => go(cur - 1);
    $("#relOlder").onclick = () => go(cur + 1);
    dots.onclick = e => { if (e.target.dataset.i) go(+e.target.dataset.i); };
    // Wischen auf dem Handy
    let x0 = null;
    track.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1));
    });
    $("#relSlider").addEventListener("keydown", e => { if (e.key === "ArrowRight") go(cur + 1); if (e.key === "ArrowLeft") go(cur - 1); });
    go(0);
  }

  function renderReleases(list) {
    if (!list) return;
    $("#releaseGrid").innerHTML = list.map(r => `
      <a class="rcard reveal" href="${esc(r.spotify || r.apple || "#")}" target="_blank" rel="noopener">
        <img loading="lazy" src="${esc(img(r.cover))}" alt="Cover ${esc(r.title)}">
        <b>${esc(r.title)}</b><small>${esc(r.type || "")} · ${esc((r.date || "").slice(0, 4))}</small>
      </a>`).join("");
  }

  function gigHTML(g, past) {
    const d = new Date(g.date + "T12:00:00");
    const ok = !isNaN(d);
    const meta = [g.time && `${g.time} Uhr`, g.address, g.note].filter(Boolean).map(esc).join(" · ");
    return `<article class="gig reveal">
      <div class="gig__date">${ok ? `<span class="d">${String(d.getDate()).padStart(2, "0")}</span><span class="m">${MONTHS[d.getMonth()]}</span><span class="y">${d.getFullYear()}</span>` : esc(g.date)}</div>
      <div>
        <p class="gig__city">${esc(g.city)}</p>
        <p class="gig__venue">${esc(g.venue || "")}</p>
        ${meta ? `<p class="gig__meta">${meta}</p>` : ""}
        ${g.with ? `<p class="gig__with">mit ${esc(g.with)}</p>` : ""}
      </div>
      ${past ? "" : (g.tickets ? `<a class="btn btn--red" href="${esc(g.tickets)}" target="_blank" rel="noopener">Tickets</a>` : `<span class="btn btn--ghost" aria-disabled="true">Infos folgen</span>`)}
    </article>`;
  }

  function renderGigs(list) {
    list = (list || []).filter(g => g && g.date);
    const today = new Date().toISOString().slice(0, 10);
    const up = list.filter(g => g.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = list.filter(g => g.date < today).sort((a, b) => b.date.localeCompare(a.date));
    $("#gigs").innerHTML = up.length ? up.map(g => gigHTML(g, false)).join("") : `<p class="empty">${esc((TX.live && TX.live.empty) || "Aktuell keine Termine – folgt uns auf Instagram für News.")}</p>`;
    if (up.length) {
      const n = up[0], d = new Date(n.date + "T12:00:00");
      const ng = $("#nextGig");
      ng.innerHTML = `<span class="next-gig__label">Nächste Show</span><span class="next-gig__date">${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}</span><span class="next-gig__where">${esc(n.city)}${n.venue ? " · " + esc(n.venue) : ""}${n.with ? " · mit " + esc(n.with) : ""}</span>`;
      ng.hidden = false;
    }
    if (past.length) { $("#pastWrap").hidden = false; $("#pastGigs").innerHTML = past.map(g => gigHTML(g, true)).join(""); }
  }

  /* ---------- UI ---------- */
  function ui() {
    $("#year").textContent = new Date().getFullYear();
    const nav = $(".nav"), links = $(".nav__links"), tog = $(".nav__toggle");
    addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 40), { passive: true });
    tog.addEventListener("click", () => { const o = links.classList.toggle("open"); tog.setAttribute("aria-expanded", o); });
    links.addEventListener("click", e => { if (e.target.tagName === "A") links.classList.remove("open"); });

    $("#impressumLink").addEventListener("click", e => { e.preventDefault(); $("#impressum").showModal(); });
  }

  function reveal() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    document.querySelectorAll(".reveal:not(.in)").forEach(el => io.observe(el));
  }

  ui();
  Promise.all([load("site"), load("videos"), load("releases"), load("gigs"), load("favorites")]).then(([s, v, r, g, f]) => {
    if (r) r.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    renderSite(s); renderVideos(v); renderSlider(r, s && s.texts); renderReleases(r); renderGigs(g); renderFavorites(f); reveal();
  });
})();
