(() => {
  "use strict";

  const root = document.documentElement;
  root.dataset.ready = "1";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Muncul pelan saat di-scroll ---------- */
  const TARGETS =
    ".section-head, .card, .story-head, " +
    ".story-content > :is(h1, h2, h3, p, blockquote, ul, ol), " +
    ".related > h2, .page-box > *, .faq details, .pagination, " +
    "main > h1, main > article:not(.story)";

  if (reduce || !("IntersectionObserver" in window)) {
    root.classList.remove("js");
  } else {
    const show = (el, n) => {
      el.style.transitionDelay = Math.min(n, 6) * 70 + "ms";
      el.classList.add("in");
      const done = (e) => {
        if (e.target !== el) return;
        el.removeEventListener("transitionend", done);
        el.classList.add("rv-done");
        el.classList.remove("in");
        el.style.transitionDelay = "";
      };
      el.addEventListener("transitionend", done);
    };

    const io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          show(entry.target, n++);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    document.querySelectorAll(TARGETS).forEach((el) => io.observe(el));
  }

  /* ---------- Terjemahan (Google Translate) ---------- */
  const LANGS = {
    id: "ID",
    en: "EN",
    ar: "AR",
    "zh-CN": "ZH",
    ja: "JA",
    ko: "KO",
    es: "ES",
    fr: "FR",
    de: "DE",
    ru: "RU",
  };

  const readLang = () => {
    const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]*\/([^;]+)/);
    const code = m ? decodeURIComponent(m[1]) : "id";
    return LANGS[code] ? code : "id";
  };

  function writeCookie(value, maxAge) {
    const host = location.hostname;
    ["", ";domain=" + host, ";domain=." + host].forEach((d) => {
      document.cookie =
        "googtrans=" + value + ";max-age=" + maxAge + ";path=/" + d;
    });
  }

  function setLang(code) {
    if (code === "id") writeCookie("", 0);
    else writeCookie("/id/" + code, 31536000);
    location.reload();
  }

  const current = readLang();

  if (current !== "id") {
    window.initGoogleTranslate = () => {
      new google.translate.TranslateElement(
        {
          pageLanguage: "id",
          includedLanguages: Object.keys(LANGS)
            .filter((c) => c !== "id")
            .join(","),
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };
    const s = document.createElement("script");
    s.src =
      "https://translate.google.com/translate_a/element.js?cb=initGoogleTranslate";
    s.async = true;
    document.head.appendChild(s);
  }

  const btn = document.getElementById("lang-btn");
  const menu = document.getElementById("lang-menu");
  const code = document.getElementById("lang-code");
  if (!btn || !menu) return;

  code.textContent = LANGS[current];

  const setOpen = (v) => {
    menu.hidden = !v;
    btn.setAttribute("aria-expanded", String(v));
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#lang")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  menu.querySelectorAll("button[data-lang]").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.lang === current));
    b.addEventListener("click", () => {
      if (b.dataset.lang === current) return setOpen(false);
      setLang(b.dataset.lang);
    });
  });
})();
