export const showAbout = (req, res) =>
  res.render("pages/about", { title: "Tentang Hi-Story" });

export const showContact = (req, res) =>
  res.render("pages/contact", { title: "Kontak" });

export const showFaq = (req, res) => res.render("pages/faq", { title: "FAQ" });
