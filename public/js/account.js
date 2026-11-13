(() => {
  "use strict";

  const loggedIn = !!document.getElementById("user-btn");
  const PENDING = "histori-pending-save";

  /* ---------- Menu akun ---------- */
  const userBtn = document.getElementById("user-btn");
  const userMenu = document.getElementById("user-menu");
  if (userBtn && userMenu) {
    const set = (v) => {
      userMenu.hidden = !v;
      userBtn.setAttribute("aria-expanded", String(v));
    };
    userBtn.addEventListener("click", () => set(userMenu.hidden));
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#user")) set(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") set(false);
    });
  }

  /* ---------- Toast ---------- */
  let toast = null;
  let toastTimer = 0;
  const say = (msg) => {
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  };

  /* ---------- Tombol simpan ---------- */
  const label = (saved) => (saved ? "Hapus dari simpanan" : "Simpan cerita");

  function paint(btn, saved) {
    btn.classList.toggle("saved", saved);
    btn.setAttribute("aria-pressed", String(saved));
    btn.setAttribute("aria-label", label(saved));
    btn.title = label(saved);
  }

  const sync = (id, saved) =>
    document
      .querySelectorAll(`.save-btn[data-story="${CSS.escape(String(id))}"]`)
      .forEach((b) => paint(b, saved));

  const loginUrl = () =>
    "/auth/google?next=" +
    encodeURIComponent(location.pathname + location.search);

  async function setSaved(id, save) {
    const res = await fetch("/addBookmarks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ storyId: Number(id), save }),
    });
    if (res.status === 401)
      throw Object.assign(new Error("login"), { login: true });
    if (!res.ok) throw new Error("gagal");
    return (await res.json()).saved;
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".save-btn");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const id = btn.dataset.story;

    if (!loggedIn) {
      try {
        sessionStorage.setItem(PENDING, JSON.stringify({ id, t: Date.now() }));
      } catch (err) {
        /* abaikan */
      }
      say("Masuk dulu untuk menyimpan cerita");
      setTimeout(() => {
        location.href = loginUrl();
      }, 700);
      return;
    }

    const want = btn.getAttribute("aria-pressed") !== "true";
    btn.classList.add("busy");
    try {
      const saved = await setSaved(id, want);
      sync(id, saved);
      if (saved) {
        btn.classList.remove("pop");
        void btn.offsetWidth;
        btn.classList.add("pop");
      }
      say(saved ? "Disimpan ke koleksimu" : "Dihapus dari simpanan");

      // di halaman "Tersimpan", kartu yang dibatalkan ikut hilang
      const grid = document.getElementById("bm-grid");
      if (grid && !saved) {
        const card = btn.closest(".card");
        card.classList.add("card-out");
        setTimeout(() => {
          card.remove();
          if (!grid.querySelector(".card")) location.reload();
        }, 320);
      }
    } catch (err) {
      if (err.login) {
        location.href = loginUrl();
        return;
      }
      say("Gagal menyimpan, coba lagi");
    } finally {
      btn.classList.remove("busy");
    }
  });

  /* ---------- Simpan otomatis setelah login ---------- */
  if (loggedIn) {
    let pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(PENDING) || "null");
      sessionStorage.removeItem(PENDING);
    } catch (err) {
      /* abaikan */
    }

    if (pending && Date.now() - pending.t < 10 * 60 * 1000) {
      const b = document.querySelector(
        `.save-btn[data-story="${CSS.escape(String(pending.id))}"]`,
      );
      if (b && b.getAttribute("aria-pressed") !== "true") {
        setSaved(pending.id, true)
          .then((saved) => {
            sync(pending.id, saved);
            say("Disimpan ke koleksimu");
          })
          .catch(() => {});
      }
    }
  }
})();
