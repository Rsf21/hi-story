(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const stage = $("globe");
  if (!stage) return;

  const hintEl = $("globe-hint");
  const panel = $("globe-panel");
  const panelBody = $("globe-panel-body");
  const closeBtn = $("globe-close");
  const chipsEl = $("globe-chips");

  const searchInput = $("gs-input");
  const searchClear = $("gs-clear");
  const resultsEl = $("gs-results");

  const filterBox = $("globe-filter");
  const fromInput = $("gf-from");
  const toInput = $("gf-to");
  const resetBtn = $("gf-reset");
  const labelEl = $("gf-label");
  const eraBtns = Array.from(document.querySelectorAll(".gf-eras button"));

  const IMG = "https://cdn.jsdelivr.net/npm/three-globe/example/img/";
  const COUNTRY_URLS = [
    "https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson",
    "https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson",
  ];
  const DEFAULT_HINT =
    "Putar bumi, lalu klik foto tokoh atau wilayah di sekitarnya";
  const MIN_Q = 2;
  const FLY_MS = 1500;
  const PANEL_DELAY = 0.45; // panel muncul di tengah perjalanan kamera
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const setHint = (text) => {
    hintEl.textContent = text;
  };

  function fail(message) {
    stage.textContent = "";
    const p = document.createElement("p");
    p.className = "globe-error";
    p.textContent = message;
    stage.appendChild(p);
  }

  if (typeof Globe !== "function") {
    fail(
      "Bumi 3D gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.",
    );
    return;
  }

  stage.textContent = ""; // hapus tulisan "Memuat..."

  /* ---------- State ---------- */
  let allPlaces = []; // semua lokasi dari server
  let places = []; // lokasi setelah difilter tahun
  let activeId = null;
  let countries = [];
  let hoverCountry = null;
  let labelTier = -1;
  let flying = false;
  let flyTimer = null;
  let panelTimer = null;
  let labelTimer = null;
  let hoverRaf = 0;
  const markerEls = new Map();
  const filter = { from: null, to: null };

  /* ---------- Format tahun ---------- */
  const fmtYear = (y) => (y < 0 ? `${Math.abs(y)} SM` : `${y} M`);
  const fmtRange = (s, e) => {
    if (s === null || s === undefined) return "";
    if (e === null || e === undefined || e === s) return fmtYear(s);
    if (s < 0 && e < 0) return `${Math.abs(s)} \u2013 ${Math.abs(e)} SM`;
    if (s >= 0 && e >= 0) return `${s} \u2013 ${e} M`;
    return `${fmtYear(s)} \u2013 ${fmtYear(e)}`;
  };

  /* ---------- Marker foto tokoh ---------- */
  function makeMarker(place) {
    const el = document.createElement("div");
    el.className = "globe-marker";
    if (place.id === activeId) el.classList.add("active");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Buka cerita dari " + place.name);
    el.tabIndex = 0;

    const pulse = document.createElement("span");
    pulse.className = "gm-pulse";
    el.appendChild(pulse);

    const makeFallback = () => {
      const f = document.createElement("span");
      f.className = "gm-photo gm-fallback";
      f.textContent = (place.name || "?").trim().charAt(0).toUpperCase();
      return f;
    };

    if (place.photo) {
      const img = document.createElement("img");
      img.className = "gm-photo";
      img.alt = "";
      img.draggable = false;
      img.src = "/uploads/" + encodeURIComponent(place.photo);
      img.addEventListener("error", () => img.replaceWith(makeFallback()));
      el.appendChild(img);
    } else {
      el.appendChild(makeFallback());
    }

    const name = document.createElement("span");
    name.className = "gm-name";
    name.textContent = place.name;
    el.appendChild(name);

    const open = (e) => {
      e.stopPropagation();
      select(place);
    };
    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(e);
      }
    });

    markerEls.set(place.id, el);
    return el;
  }

  /* ---------- Bumi ---------- */
  let world;
  try {
    world = Globe()(stage)
      .globeImageUrl(IMG + "earth-blue-marble.jpg")
      .bumpImageUrl(IMG + "earth-topology.png")
      .backgroundImageUrl(IMG + "night-sky.png")
      .showAtmosphere(true)
      .atmosphereColor("#8fc7ff")
      .atmosphereAltitude(0.2)
      // marker foto
      .htmlLat("lat")
      .htmlLng("lng")
      .htmlAltitude(0.03)
      .htmlElement(makeMarker)
      // batas negara
      .polygonCapColor((d) =>
        d === hoverCountry ? "rgba(224, 166, 74, 0.28)" : "rgba(0, 0, 0, 0)",
      )
      .polygonSideColor(() => "rgba(0, 0, 0, 0)")
      .polygonStrokeColor(() => "rgba(255, 255, 255, 0.3)")
      .polygonAltitude(0.004)
      .polygonsTransitionDuration(0)
      .polygonLabel((d) => `<b>${esc(d.__name || "")}</b>`)
      // nama negara
      .labelLat("lat")
      .labelLng("lng")
      .labelText("name")
      .labelSize("size")
      .labelAltitude(0.006)
      .labelColor(() => "rgba(255, 255, 255, 0.85)")
      .labelIncludeDot(false)
      .labelResolution(1)
      .labelsTransitionDuration(0);
  } catch (err) {
    fail(
      "Browser ini tidak mendukung WebGL, jadi bumi 3D tidak bisa ditampilkan.",
    );
    return;
  }

  // Batasi resolusi render di layar sangat tajam supaya tetap ringan
  try {
    world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  } catch (err) {
    /* abaikan */
  }

  // Sembunyikan marker yang ada di sisi belakang bumi
  if (typeof world.htmlElementVisibilityModifier === "function") {
    world.htmlElementVisibilityModifier((el, isVisible) => {
      el.style.opacity = isVisible ? "1" : "0";
      el.style.pointerEvents = isVisible ? "auto" : "none";
    });
  }

  const fitSize = () =>
    world.width(stage.clientWidth).height(stage.clientHeight);
  fitSize();
  if ("ResizeObserver" in window) new ResizeObserver(fitSize).observe(stage);
  else window.addEventListener("resize", fitSize);

  const controls = world.controls();
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.35;
  controls.enablePan = false;
  controls.minDistance = 130;
  controls.maxDistance = 520;
  const stopSpin = () => {
    controls.autoRotate = false;
  };
  controls.addEventListener("start", stopSpin);

  world.pointOfView({ lat: 30, lng: 40, altitude: 2.4 });

  /* ---------- Nama negara ---------- */
  const ringInfo = (ring) => {
    let a = 0,
      cx = 0,
      cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const f = x0 * y1 - x1 * y0;
      a += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    }
    a /= 2;
    if (!a) {
      const xs = ring.map((p) => p[0]);
      const ys = ring.map((p) => p[1]);
      return {
        area: 0,
        lng: (Math.min(...xs) + Math.max(...xs)) / 2,
        lat: (Math.min(...ys) + Math.max(...ys)) / 2,
      };
    }
    return { area: Math.abs(a), lng: cx / (6 * a), lat: cy / (6 * a) };
  };

  function countryInfo(feature) {
    const g = feature.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    let best = null;
    polys.forEach((poly) => {
      const info = ringInfo(poly[0]);
      if (!best || info.area > best.area) best = info;
    });
    return best;
  }

  function buildCountries(geo) {
    const dn =
      "DisplayNames" in Intl
        ? new Intl.DisplayNames(["id"], { type: "region" })
        : null;
    const feats = geo.features.filter(
      (f) =>
        f.properties &&
        f.properties.ISO_A2 !== "AQ" &&
        f.properties.ADMIN !== "Antarctica",
    );

    const list = [];
    feats.forEach((f) => {
      const p = f.properties;
      const code = [p.ISO_A2, p.ISO_A2_EH, p.WB_A2].find((c) =>
        /^[A-Z]{2}$/.test(c || ""),
      );
      let name = p.NAME_ID;
      if (!name && dn && code) {
        try {
          const n = dn.of(code);
          if (n && n !== code) name = n;
        } catch (e) {
          /* kode tidak dikenal */
        }
      }
      name = name || p.NAME || p.ADMIN || "";
      f.__name = name;

      const info = countryInfo(f);
      if (!name || !info || !isFinite(info.lat) || !isFinite(info.lng)) return;
      list.push({
        name,
        lat: info.lat,
        lng: info.lng,
        area: info.area,
        size: Math.max(0.32, Math.min(1.0, Math.sqrt(info.area) / 16)),
      });
    });
    return { feats, list };
  }

  // Makin dekat kamera, makin banyak nama negara yang tampil
  const MIN_AREA = [150, 30, 6, 0];
  const tierOf = (alt) => (alt > 1.9 ? 0 : alt > 1.2 ? 1 : alt > 0.7 ? 2 : 3);

  function updateLabels(altitude) {
    const tier = tierOf(altitude);
    if (tier === labelTier || !countries.length) return;
    labelTier = tier;
    world.labelsData(countries.filter((c) => c.area >= MIN_AREA[tier]));
  }

  // Nama negara hanya diperbarui setelah kamera berhenti (tidak saat terbang)
  function scheduleLabels() {
    clearTimeout(labelTimer);
    labelTimer = setTimeout(() => {
      if (flying) return;
      updateLabels(world.pointOfView().altitude);
    }, 250);
  }

  function loadCountries(i = 0) {
    if (i >= COUNTRY_URLS.length) return; // tanpa nama negara, bumi tetap jalan
    fetch(COUNTRY_URLS[i])
      .then((r) => {
        if (!r.ok) throw new Error("gagal");
        return r.json();
      })
      .then((geo) => {
        const { feats, list } = buildCountries(geo);
        countries = list;
        world.polygonsData(feats);
        labelTier = -1;
        updateLabels(world.pointOfView().altitude);
      })
      .catch(() => loadCountries(i + 1));
  }

  world.onZoom(() => scheduleLabels());

  /* ---------- Penerbangan kamera ---------- */
  function beginFlight(ms) {
    flying = true;
    stage.classList.add("is-flying");
    clearTimeout(flyTimer);
    flyTimer = setTimeout(() => {
      flying = false;
      stage.classList.remove("is-flying");
      scheduleLabels();
    }, ms + 150);
  }

  /* ---------- Klik wilayah ---------- */
  const distKm = (a, b) => {
    const R = 6371;
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLng = (b.lng - a.lng) * rad;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // Lokasi terdekat yang radiusnya mencakup titik klik
  function nearestWithin(lat, lng) {
    let best = null;
    let bestD = Infinity;
    places.forEach((p) => {
      const d = distKm({ lat, lng }, p);
      if (d <= p.radius_km && d < bestD) {
        best = p;
        bestD = d;
      }
    });
    return best;
  }

  function handleMapClick(lat, lng) {
    if (flying) return;
    stopSpin();
    const hit = nearestWithin(lat, lng);
    if (hit) select(hit);
    else setHint("Belum ada cerita di wilayah ini. Coba klik foto tokoh.");
  }

  world.onGlobeClick(({ lat, lng }) => handleMapClick(lat, lng));
  world.onPolygonClick((poly, ev, coords) => {
    if (coords) handleMapClick(coords.lat, coords.lng);
  });

  // Highlight negara: dimatikan saat terbang agar tidak ada render ulang
  world.onPolygonHover((d) => {
    if (flying || d === hoverCountry) return;
    hoverCountry = d;
    stage.style.cursor = d ? "pointer" : "";
    cancelAnimationFrame(hoverRaf);
    hoverRaf = requestAnimationFrame(() =>
      world.polygonCapColor(world.polygonCapColor()),
    );
  });

  /* ---------- Panel cerita ---------- */
  function renderPanel(place, hitSlug) {
    panelBody.textContent = "";

    const title = document.createElement("h2");
    title.textContent = place.name;
    const count = document.createElement("p");
    count.className = "globe-sub";
    count.textContent = `${place.stories.length} cerita dari wilayah ini`;
    panelBody.append(title, count);

    let hitEl = null;

    place.stories.forEach((s) => {
      const a = document.createElement("a");
      a.className = "globe-story";
      a.href = "/story/" + encodeURIComponent(s.slug);
      a.dataset.slug = s.slug;
      if (hitSlug && s.slug === hitSlug) {
        a.classList.add("hit");
        hitEl = a;
      }

      if (s.image) {
        const img = document.createElement("img");
        img.src = "/uploads/" + encodeURIComponent(s.image);
        img.alt = "";
        img.loading = "lazy";
        a.appendChild(img);
      }

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = s.category;

      const h3 = document.createElement("h3");
      h3.textContent = s.title;

      a.append(tag, h3);

      const range = fmtRange(s.year_start, s.year_end);
      if (range) {
        const yr = document.createElement("span");
        yr.className = "globe-year";
        yr.textContent = range;
        a.appendChild(yr);
      }

      const sum = document.createElement("p");
      sum.textContent = s.summary || "";

      const read = document.createElement("span");
      read.className = "globe-read";
      read.textContent = "Baca ceritanya \u2192";

      a.append(sum, read);
      panelBody.appendChild(a);
    });

    showPanel();
    panel.scrollTop = 0;
    if (hitEl)
      requestAnimationFrame(() => hitEl.scrollIntoView({ block: "nearest" }));
  }

  function setActive(id) {
    activeId = id;
    markerEls.forEach((el, key) => el.classList.toggle("active", key === id));
    chipsEl.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.id) === id);
    });
  }

  /* Foto yang tepat di bawah panel disembunyikan (dicek berkala, bukan tiap frame) */
  let trackId = null;
  let trackAt = 0;
  let closeTimer = null;

  function hideUnderPanel() {
    if (panel.hidden || !panel.classList.contains("show")) {
      markerEls.forEach((el) => el.classList.remove("under-panel"));
      return;
    }
    const r = panel.getBoundingClientRect();
    const rects = [];
    markerEls.forEach((el) => rects.push([el, el.getBoundingClientRect()]));
    rects.forEach(([el, m]) => {
      const cx = m.left + m.width / 2;
      const cy = m.top + m.height / 2;
      const pad = m.width / 2;
      const under =
        cx > r.left - pad &&
        cx < r.right + pad &&
        cy > r.top - pad &&
        cy < r.bottom + pad;
      el.classList.toggle("under-panel", under);
    });
  }

  function trackLoop(t) {
    if (t - trackAt > 120) {
      trackAt = t;
      hideUnderPanel();
    }
    trackId = panel.hidden ? null : requestAnimationFrame(trackLoop);
  }

  function startTrack() {
    if (trackId === null) trackId = requestAnimationFrame(trackLoop);
  }

  function showPanel() {
    clearTimeout(closeTimer);
    const wasOpen = !panel.hidden && panel.classList.contains("show");
    panel.hidden = false;
    startTrack();
    if (wasOpen) {
      panelBody.classList.remove("swap");
      void panelBody.offsetWidth;
      panelBody.classList.add("swap");
    } else {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => panel.classList.add("show")),
      );
    }
  }

  function hidePanel() {
    panel.classList.remove("show");
    markerEls.forEach((el) => el.classList.remove("under-panel"));
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      panel.hidden = true;
    }, 340);
  }

  function select(place, hitSlug) {
    stopSpin();
    setActive(place.id);
    setHint(place.name);

    const ms = reduceMotion ? 0 : FLY_MS;
    if (ms) beginFlight(ms);
    world.pointOfView({ lat: place.lat, lng: place.lng, altitude: 1.5 }, ms);

    // panel muncul saat kamera sudah hampir sampai
    clearTimeout(panelTimer);
    panelTimer = setTimeout(
      () => renderPanel(place, hitSlug),
      Math.round(ms * PANEL_DELAY),
    );
  }

  function closePanel() {
    clearTimeout(panelTimer);
    hidePanel();
    setActive(null);
    setHint(
      places.length || !allPlaces.length
        ? DEFAULT_HINT
        : "Tidak ada cerita pada rentang tahun ini.",
    );
  }

  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });

  function buildChips() {
    chipsEl.textContent = "";
    places.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.id = p.id;
      b.textContent = p.name;
      if (p.id === activeId) b.classList.add("active");
      b.addEventListener("click", () => select(p));
      chipsEl.appendChild(b);
    });
  }

  /* ---------- Filter tahun ---------- */
  const filterActive = () => filter.from !== null || filter.to !== null;

  const passes = (s) => {
    if (!filterActive()) return true;
    if (s.year_start === null || s.year_start === undefined) return false;
    const end =
      s.year_end === null || s.year_end === undefined
        ? s.year_start
        : s.year_end;
    if (filter.to !== null && s.year_start > filter.to) return false;
    if (filter.from !== null && end < filter.from) return false;
    return true;
  };

  const num = (v) => {
    if (String(v).trim() === "") return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  function updateFilterLabel() {
    const { from: a, to: b } = filter;
    labelEl.textContent =
      a === null && b === null
        ? "Semua masa"
        : a !== null && b !== null
          ? `${fmtYear(a)} \u2013 ${fmtYear(b)}`
          : a !== null
            ? `dari ${fmtYear(a)}`
            : `sampai ${fmtYear(b)}`;

    filterBox.classList.toggle("is-active", filterActive());
    eraBtns.forEach((btn) => {
      const same =
        String(a === null ? "" : a) === btn.dataset.from &&
        String(b === null ? "" : b) === btn.dataset.to;
      btn.classList.toggle("active", same);
    });
  }

  function rebuildPlaces() {
    const openId = activeId;

    places = allPlaces
      .map((p) => {
        const stories = p.stories.filter(passes);
        const withImg = stories.find((s) => s.image);
        return { ...p, stories, photo: withImg ? withImg.image : null };
      })
      .filter((p) => p.stories.length);

    markerEls.clear();
    world.htmlElementsData(places);
    buildChips();

    if (openId !== null) {
      const still = places.find((p) => p.id === openId);
      if (still) {
        renderPanel(still);
        setActive(openId);
      } else {
        closePanel();
      }
    }

    if (openId === null || panel.hidden) {
      setHint(
        !allPlaces.length
          ? "Belum ada cerita yang diberi lokasi."
          : !places.length
            ? "Tidak ada cerita pada rentang tahun ini."
            : DEFAULT_HINT,
      );
    }
  }

  function applyFilter() {
    let a = num(fromInput.value);
    let b = num(toInput.value);
    if (a !== null && b !== null && a > b) [a, b] = [b, a];
    filter.from = a;
    filter.to = b;
    updateFilterLabel();
    rebuildPlaces();

    const q = searchInput.value.trim();
    if (q.length >= MIN_Q) runSearch(q);
  }

  let filterTimer = null;
  const applySoon = () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(applyFilter, 300);
  };
  fromInput.addEventListener("input", applySoon);
  toInput.addEventListener("input", applySoon);
  [fromInput, toInput].forEach((i) =>
    i.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyFilter();
    }),
  );

  eraBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      fromInput.value = btn.dataset.from;
      toInput.value = btn.dataset.to;
      applyFilter();
    });
  });

  resetBtn.addEventListener("click", () => {
    fromInput.value = "";
    toInput.value = "";
    applyFilter();
  });

  // Buka filter = tutup hasil pencarian
  filterBox.addEventListener("toggle", () => {
    if (filterBox.open) closeResults();
  });

  /* ---------- Pencarian AJAX ---------- */
  let searchCtl = null;
  let searchTimer = null;
  let results = [];
  let activeIdx = -1;

  const optionEls = () => Array.from(resultsEl.querySelectorAll(".gs-item"));

  function openResults() {
    resultsEl.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
  }

  function closeResults() {
    resultsEl.hidden = true;
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.removeAttribute("aria-activedescendant");
    activeIdx = -1;
  }

  function highlight(text, q) {
    const frag = document.createDocumentFragment();
    const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i < 0) {
      frag.append(text);
      return frag;
    }
    const m = document.createElement("mark");
    m.textContent = text.slice(i, i + q.length);
    frag.append(text.slice(0, i), m, text.slice(i + q.length));
    return frag;
  }

  function renderMessage(text) {
    resultsEl.textContent = "";
    const li = document.createElement("li");
    li.className = "gs-empty";
    li.textContent = text;
    resultsEl.appendChild(li);
  }

  function setActiveIdx(i) {
    const items = optionEls();
    if (!items.length) return;
    activeIdx = (i + items.length) % items.length;
    items.forEach((el, n) => {
      el.classList.toggle("active", n === activeIdx);
      el.setAttribute("aria-selected", n === activeIdx ? "true" : "false");
    });
    const cur = items[activeIdx];
    searchInput.setAttribute("aria-activedescendant", cur.id);
    cur.scrollIntoView({ block: "nearest" });
  }

  function renderResults(list, q) {
    resultsEl.textContent = "";
    activeIdx = -1;
    searchInput.removeAttribute("aria-activedescendant");

    if (!list.length) {
      renderMessage(`Tidak ada hasil untuk \u201c${q}\u201d`);
      return;
    }

    list.forEach((r, i) => {
      const li = document.createElement("li");
      li.className = "gs-item";
      li.id = "gs-opt-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");

      if (r.image) {
        const img = document.createElement("img");
        img.className = "gs-thumb";
        img.alt = "";
        img.loading = "lazy";
        img.src = "/uploads/" + encodeURIComponent(r.image);
        li.appendChild(img);
      } else {
        const f = document.createElement("span");
        f.className = "gs-thumb fallback";
        f.textContent = (r.title || "?").charAt(0).toUpperCase();
        li.appendChild(f);
      }

      const body = document.createElement("span");
      body.className = "gs-body";

      const t = document.createElement("span");
      t.className = "gs-title";
      t.appendChild(highlight(r.title, q));

      const meta = document.createElement("span");
      meta.className = "gs-meta";
      const range = fmtRange(r.year_start, r.year_end);
      meta.textContent = [r.location_name, r.category, range]
        .filter(Boolean)
        .join(" \u00b7 ");

      body.append(t, meta);
      li.appendChild(body);

      li.addEventListener("mousedown", (e) => e.preventDefault()); // jaga fokus input
      li.addEventListener("click", () => chooseResult(r));
      li.addEventListener("mousemove", () => {
        if (activeIdx !== i) setActiveIdx(i);
      });

      resultsEl.appendChild(li);
    });
  }

  function chooseResult(r) {
    searchInput.value = r.title;
    searchClear.hidden = false;
    closeResults();
    searchInput.blur();

    const place = places.find((p) => p.id === r.location_id);
    if (!place) {
      setHint("Lokasi cerita ini tidak ada pada filter tahun saat ini.");
      return;
    }
    select(place, r.slug);
  }

  function runSearch(q) {
    if (searchCtl) searchCtl.abort();
    searchCtl = new AbortController();

    const params = new URLSearchParams({ q });
    if (filter.from !== null) params.set("from", filter.from);
    if (filter.to !== null) params.set("to", filter.to);

    resultsEl.setAttribute("aria-busy", "true");
    fetch("/api/globe/search?" + params.toString(), {
      signal: searchCtl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("gagal");
        return r.json();
      })
      .then((list) => {
        results = list;
        renderResults(list, q);
        openResults();
        resultsEl.removeAttribute("aria-busy");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        results = [];
        renderMessage("Pencarian gagal, coba lagi.");
        openResults();
        resultsEl.removeAttribute("aria-busy");
      });
  }

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    searchClear.hidden = !searchInput.value;
    clearTimeout(searchTimer);

    if (q.length < MIN_Q) {
      if (searchCtl) searchCtl.abort();
      results = [];
      closeResults();
      return;
    }
    searchTimer = setTimeout(() => runSearch(q), 180);
  });

  searchInput.addEventListener("keydown", (e) => {
    const open = !resultsEl.hidden;
    if (e.key === "ArrowDown") {
      if (!open && results.length) openResults();
      e.preventDefault();
      setActiveIdx(activeIdx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(activeIdx < 0 ? -1 : activeIdx - 1);
    } else if (e.key === "Enter") {
      if (!open || !results.length) return;
      e.preventDefault();
      chooseResult(results[activeIdx >= 0 ? activeIdx : 0]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation(); // jangan ikut menutup panel cerita
      closeResults();
    }
  });

  searchInput.addEventListener("focus", () => {
    filterBox.removeAttribute("open"); // tutup filter saat mulai mengetik
    if (results.length && searchInput.value.trim().length >= MIN_Q)
      openResults();
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchClear.hidden = true;
    results = [];
    if (searchCtl) searchCtl.abort();
    closeResults();
    searchInput.focus();
  });

  // Klik di luar: tutup hasil pencarian dan panel filter
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".globe-search")) closeResults();
    if (!e.target.closest(".globe-filter")) filterBox.removeAttribute("open");
  });

  /* ---------- Muat data ---------- */
  loadCountries();
  updateFilterLabel();

  fetch("/api/globe")
    .then((r) => {
      if (!r.ok) throw new Error("Gagal memuat data");
      return r.json();
    })
    .then((data) => {
      allPlaces = data;
      rebuildPlaces();
    })
    .catch(() => setHint("Data cerita gagal dimuat. Coba muat ulang halaman."));
})();
