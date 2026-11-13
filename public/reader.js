/* =========================================================
   Hi-Story, pembaca cerita: daftar bab & lompat bab
   Bab diambil otomatis dari judul (H2) di isi cerita.
   ========================================================= */
(() => {
  "use strict";

  const box = document.querySelector(".story-content");
  if (!box) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const behavior = reduceMotion ? "auto" : "smooth";

  const clean = (s) => s.replace(/\s+/g, " ").trim();
  const headerH = () => {
    const h = document.querySelector(".site-header");
    return h ? h.offsetHeight : 68;
  };

  // "#" sendirian di satu baris (sisa mode slide) jadi garis pemisah biasa
  box.querySelectorAll("p").forEach((p) => {
    if (p.textContent.trim() === "#")
      p.replaceWith(document.createElement("hr"));
  });

  /* ---------- 1. Kumpulkan bab dari judul ---------- */
  function pickHeadings() {
    for (const tag of ["h2", "h1", "h3"]) {
      const list = Array.from(box.querySelectorAll(tag)).filter((h) =>
        clean(h.textContent),
      );
      if (list.length >= 2) return list;
    }
    return [];
  }

  const heads = pickHeadings();
  if (!heads.length) return;

  const first = heads[0];
  const MEDIA = "img, iframe, video";

  function hasIntro() {
    for (const el of Array.from(box.children)) {
      if (el === first || el.contains(first)) return false;
      if (el.matches("hr")) continue;
      if (clean(el.textContent) || el.matches(MEDIA) || el.querySelector(MEDIA))
        return true;
    }
    return false;
  }

  // Judul yang sudah bernomor ("Bab 2: ...", "3. ...") tidak diberi label ganda
  const NUMBERED =
    /^(?:bab|chapter|bagian|part)\s*\d+\b\s*[:.\-\u2013\u2014)]*\s*/i;
  const NUMLEAD = /^\d+\s*[.):\-\u2013\u2014]\s*/;
  const isNumbered = (t) => NUMBERED.test(t) || NUMLEAD.test(t);
  const stripNum = (t) =>
    t.replace(NUMBERED, "").replace(NUMLEAD, "").trim() || t;

  const entries = [];
  if (hasIntro()) {
    entries.push({ el: box, title: "Pendahuluan", num: "\u2022", intro: true });
  }

  let count = 0;
  heads.forEach((h) => {
    count += 1;
    const raw = clean(h.textContent);
    h.id = "bab-" + count;
    if (!isNumbered(raw)) h.dataset.bab = "Bab " + count;
    entries.push({ el: h, id: h.id, title: stripNum(raw), num: String(count) });
  });

  const last = entries.length - 1;

  /* ---------- 2. Daftar bab (dipakai di dua tempat) ---------- */
  function buildList() {
    const ol = document.createElement("ol");
    ol.className = "chapter-list";
    entries.forEach((e, i) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = e.intro ? "#" : "#" + e.id;
      a.dataset.i = i;

      const num = document.createElement("span");
      num.className = "cl-num";
      num.textContent = e.num;

      const title = document.createElement("span");
      title.className = "cl-title";
      title.textContent = e.title;

      a.append(num, title);
      li.appendChild(a);
      ol.appendChild(li);
    });
    return ol;
  }

  /* Daftar Bab di atas cerita */
  const toc = document.createElement("details");
  toc.className = "toc";
  if (window.matchMedia("(min-width: 700px)").matches) toc.open = true;

  const sum = document.createElement("summary");
  const sumTitle = document.createElement("span");
  sumTitle.textContent = "Daftar bab";
  const sumCount = document.createElement("span");
  sumCount.className = "toc-count";
  sumCount.textContent = count + " bab";
  sum.append(sumTitle, sumCount);

  toc.append(sum, buildList());
  box.insertAdjacentElement("beforebegin", toc);

  /* Bilah bab yang menempel di bawah layar */
  const bar = document.createElement("div");
  bar.className = "chapter-bar";
  bar.innerHTML =
    '<div class="cb-progress" aria-hidden="true"><span></span></div>' +
    '<div class="cb-row">' +
    '<button type="button" class="cb-step cb-prev" aria-label="Bab sebelumnya">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>' +
    '<button type="button" class="cb-current" aria-haspopup="true" aria-expanded="false" aria-controls="chapter-menu">' +
    '<span class="cb-label"></span><span class="cb-title"></span>' +
    '<svg class="cb-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button>' +
    '<button type="button" class="cb-step cb-next" aria-label="Bab berikutnya">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>' +
    "</div>" +
    '<div class="chapter-menu" id="chapter-menu" hidden><p class="cm-head">Lompat ke bab</p></div>';
  box.insertAdjacentElement("afterend", bar);

  const menu = bar.querySelector(".chapter-menu");
  menu.appendChild(buildList());

  const prevBtn = bar.querySelector(".cb-prev");
  const nextBtn = bar.querySelector(".cb-next");
  const curBtn = bar.querySelector(".cb-current");
  const labelEl = bar.querySelector(".cb-label");
  const titleEl = bar.querySelector(".cb-title");
  const fillEl = bar.querySelector(".cb-progress span");

  /* ---------- 3. Lompat ---------- */
  function goTo(i) {
    const e = entries[Math.max(0, Math.min(last, i))];
    e.el.scrollIntoView({ behavior, block: "start" });
    if (!e.intro) {
      try {
        history.replaceState(null, "", "#" + e.id);
      } catch (err) {
        /* abaikan */
      }
    }
  }

  function setMenu(open) {
    menu.hidden = !open;
    curBtn.setAttribute("aria-expanded", open);
    if (open) {
      const active = menu.querySelector("[aria-current]");
      if (active) active.scrollIntoView({ block: "nearest" });
    }
  }

  curBtn.addEventListener("click", () => setMenu(menu.hidden));
  prevBtn.addEventListener("click", () => goTo(cur - 1));
  nextBtn.addEventListener("click", () => goTo(cur + 1));

  document.addEventListener("click", (e) => {
    const a = e.target.closest(".chapter-list a[data-i]");
    if (a) {
      e.preventDefault();
      goTo(Number(a.dataset.i));
      setMenu(false);
      return;
    }
    if (!menu.hidden && !e.target.closest(".chapter-bar")) setMenu(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      setMenu(false);
      curBtn.focus();
    }
  });

  /* ---------- 4. Bab yang sedang dibaca ---------- */
  let cur = -1;

  function render() {
    const e = entries[cur];
    labelEl.textContent = e.intro ? "Awal" : "Bab " + e.num;
    titleEl.textContent = e.title;
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === last;
    document.querySelectorAll(".chapter-list a").forEach((a) => {
      if (Number(a.dataset.i) === cur) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  function update() {
    const line = headerH() + 40;
    let idx = 0;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].el.getBoundingClientRect().top <= line) idx = i;
    }

    const r = box.getBoundingClientRect();
    const p = Math.max(
      0,
      Math.min(1, (window.innerHeight * 0.55 - r.top) / r.height),
    );
    fillEl.style.width = p * 100 + "%";

    if (idx !== cur) {
      cur = idx;
      render();
    }
  }

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    },
    { passive: true },
  );
  window.addEventListener("resize", update);

  // Buka langsung di bab tertentu lewat alamat (#bab-3)
  if (location.hash.indexOf("#bab-") === 0) {
    const target = document.getElementById(location.hash.slice(1));
    if (target)
      requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  }

  update();
})();
