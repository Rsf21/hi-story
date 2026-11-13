import { getGlobeData, searchGlobe } from "../../models/locationModels.js";

const toYear = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

export const showGlobe = (req, res) =>
  res.render("pages/globe", { title: "Jelajah Bumi" });

export const apiGlobe = async (req, res, next) => {
  try {
    res.json(await getGlobeData());
  } catch (err) {
    next(err);
  }
};

export const apiGlobeSearch = async (req, res, next) => {
  try {
    const q = String(req.query.q || "")
      .trim()
      .slice(0, 80);
    if (q.length < 2) return res.json([]);
    res.json(
      await searchGlobe(q, {
        from: toYear(req.query.from),
        to: toYear(req.query.to),
      }),
    );
  } catch (err) {
    next(err);
  }
};
