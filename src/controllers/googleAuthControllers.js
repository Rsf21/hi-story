import crypto from "crypto";
import { upsertGoogleUser } from "../../models/userModels.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const INFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const cfg = () => ({
  id: process.env.GOOGLE_CLIENT_ID,
  secret: process.env.GOOGLE_CLIENT_SECRET,
  redirect:
    process.env.GOOGLE_CALLBACK_URL ||
    `http://localhost:${process.env.PORT || 3500}/auth/google/callback`,
});

// hanya boleh kembali ke alamat di situs ini
const safeNext = (v) =>
  typeof v === "string" &&
  v.startsWith("/") &&
  !v.startsWith("//") &&
  !v.includes("\\")
    ? v
    : "/";

const sameState = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.length === b.length &&
  crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const startGoogleLogin = (req, res, next) => {
  const { id, secret, redirect } = cfg();
  if (!id || !secret) {
    return res.status(503).render("pages/error", {
      title: "Login belum aktif",
      message: "Login Google belum dikonfigurasi di server.",
    });
  }

  const state = crypto.randomBytes(24).toString("hex");
  req.session.oauthState = state;
  req.session.oauthNext = safeNext(req.query.next);

  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  req.session.save((err) => {
    if (err) return next(err);
    res.redirect(`${AUTH_URL}?${params}`);
  });
};

export const googleCallback = async (req, res, next) => {
  try {
    const { code, state, error } = req.query;
    const expected = req.session.oauthState;
    const target = safeNext(req.session.oauthNext);
    delete req.session.oauthState;
    delete req.session.oauthNext;

    if (error) return res.redirect(target); // pengunjung membatalkan
    if (!code || !sameState(state, expected)) {
      return res.status(400).render("pages/error", {
        title: "Login gagal",
        message:
          "Permintaan login tidak valid atau sudah kedaluwarsa. Coba masuk lagi.",
      });
    }

    const { id, secret, redirect } = cfg();

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: id,
        client_secret: secret,
        redirect_uri: redirect,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error("Gagal menukar kode dari Google");
    const { access_token } = await tokenRes.json();

    const infoRes = await fetch(INFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) throw new Error("Gagal mengambil profil Google");
    const p = await infoRes.json();
    if (!p.sub || !p.email || p.email_verified === false)
      throw new Error("Profil Google tidak valid");

    const user = await upsertGoogleUser({
      googleId: p.sub,
      email: p.email,
      name: p.name || p.email.split("@")[0],
      avatar: p.picture || null,
    });

    // sesi baru (cegah session fixation), login admin tetap dipertahankan
    const admin = req.session.admin;
    req.session.regenerate((err) => {
      if (err) return next(err);
      if (admin) req.session.admin = admin;
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      };
      req.session.save((e) => (e ? next(e) : res.redirect(target)));
    });
  } catch (err) {
    next(err);
  }
};

export const googleLogout = (req, res, next) => {
  delete req.session.user;
  const target = safeNext(req.body && req.body.next);
  req.session.save((err) => {
    if (err) return next(err);
    res.redirect(target.startsWith("/mybookmarks") ? "/" : target);
  });
};
