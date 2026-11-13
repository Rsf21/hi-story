import crypto from "crypto";

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

export const showLogin = (req, res) => {
  if (req.session.admin) return res.redirect(res.locals.adminPath);
  res.render("admin/login", { title: "Login Admin", error: null });
};

export const handleLogin = (req, res, next) => {
  const { username = "", password = "" } = req.body;
  const envUser = process.env.ADMIN_USERNAME;
  const envPw = process.env.ADMIN_PW;

  const userOk = !!envUser && safeEqual(username, envUser);
  const pwOk = !!envPw && safeEqual(password, envPw);

  if (!(userOk && pwOk)) {
    return res.status(401).render("admin/login", {
      title: "Login Admin",
      error: "Username atau password salah",
    });
  }

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.admin = { id: 1, username: envUser };
    res.redirect(res.locals.adminPath);
  });
};

export const handleLogout = (req, res, next) => {
  const loginUrl = res.locals.adminPath + "/login";
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("connect.sid");
    res.redirect(loginUrl);
  });
};
