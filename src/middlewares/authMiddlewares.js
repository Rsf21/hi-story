export const requireAdmin = (req, res, next) => {
  if (req.session && req.session.admin) return next();
  res.redirect(res.locals.adminPath + "/login");
};

export const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) return next();

  const wantsJson =
    req.xhr || (req.headers.accept || "").includes("application/json");
  if (wantsJson)
    return res.status(401).json({ error: "login", loginUrl: "/auth/google" });

  res.redirect("/auth/google?next=" + encodeURIComponent(req.originalUrl));
};
