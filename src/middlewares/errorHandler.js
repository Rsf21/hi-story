export const notFoundHandler = (req, res) => {
  res.status(404).render("pages/404", { title: "Tidak ditemukan" });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).render("pages/error", {
    title: "Terjadi kesalahan",
    message:
      process.env.NODE_ENV === "production"
        ? "Terjadi kesalahan pada server."
        : "gagal",
  });
};
