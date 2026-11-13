(() => {
  "use strict";

  const rows = document.querySelectorAll(".rail-row");
  if (!rows.length) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const behavior = reduceMotion ? "auto" : "smooth";

  rows.forEach((row) => {
    const rail = row.querySelector(".rail");
    const prevBtn = row.querySelector(".rail-btn.prev");
    const nextBtn = row.querySelector(".rail-btn.next");

    const step = () => {
      const card = rail.querySelector(".card");
      if (!card) return rail.clientWidth;
      const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    };
    const maxScroll = () => rail.scrollWidth - rail.clientWidth;

    const goTo = (i) => {
      const left = Math.max(0, Math.min(i * step(), maxScroll()));
      rail.scrollTo({ left, behavior });
    };
    const next = () => goTo(Math.floor(rail.scrollLeft / step() + 0.05) + 1);
    const prev = () => goTo(Math.ceil(rail.scrollLeft / step() - 0.05) - 1);

    function update() {
      const max = maxScroll();
      row.classList.toggle("has-prev", rail.scrollLeft > 4);
      row.classList.toggle("has-next", max > 4 && rail.scrollLeft < max - 4);
    }

    let ticking = false;
    rail.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    });
    window.addEventListener("resize", update);
    window.addEventListener("load", update);

    prevBtn.addEventListener("click", prev);
    nextBtn.addEventListener("click", next);

    rail.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    });

    /* Drag mouse: satu kartu per tarikan */
    let drag = null;
    let moved = false;

    rail.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = {
        x: e.clientX,
        left: rail.scrollLeft,
        index: Math.round(rail.scrollLeft / step()),
      };
      moved = false;
    });

    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        rail.classList.add("dragging");
      }
      if (moved) rail.scrollLeft = drag.left - dx;
    });

    const endDrag = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!moved) return;
      const dx = e.clientX - d.x;
      const cols = Math.max(1, Math.round(Math.abs(dx) / step()));
      goTo(d.index + (dx < 0 ? cols : -cols));
      setTimeout(
        () => rail.classList.remove("dragging"),
        reduceMotion ? 0 : 450,
      );
    };
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    rail.addEventListener(
      "click",
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      },
      true,
    );
    rail.addEventListener("dragstart", (e) => e.preventDefault());

    update();
  });
})();
