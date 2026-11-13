import fs from "fs";
import path from "path";
import {
  getAllStories,
  getStoryById,
  getStoryBySlug,
  createStory,
  updateStory,
  deleteStory,
  getAllStoryOptions,
  getRelatedIds,
  setRelatedStories,
} from "../../../models/storyModels.js";
import { getAllCategories } from "../../../models/categoryModels.js";
import { getAllLocations } from "../../../models/locationModels.js";
import { uploadDir } from "../../middlewares/upload.js";

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const uniqueSlug = async (title, ignoreId = null) => {
  const base = slugify(title) || "cerita";
  let slug = base;
  let n = 1;
  while (true) {
    const existing = await getStoryBySlug(slug);
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${++n}`;
  }
};

const removeImage = (filename) => {
  if (!filename) return;
  fs.unlink(path.join(uploadDir, filename), () => {});
};

const parseRelated = (body) => [].concat(body.related || []);

// tahun: kosong = null, SM ditulis negatif (-356)
const parseYear = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= -10000 && n <= 3000 ? n : null;
};

const parseYears = (body) => {
  let start = parseYear(body.year_start);
  let end = parseYear(body.year_end);
  if (start === null && end !== null) start = end;
  if (start !== null && end !== null && end < start)
    [start, end] = [end, start];
  return { year_start: start, year_end: end };
};

const formExtras = async (excludeId, selected) => ({
  categories: await getAllCategories(),
  locations: await getAllLocations(),
  allStories: await getAllStoryOptions(excludeId),
  relatedIds: selected.map(Number),
});

export const listStories = async (req, res, next) => {
  try {
    const stories = await getAllStories(1000, 0);
    res.render("admin/stories/index", {
      title: "Kelola Cerita",
      admin: req.session.admin,
      stories,
    });
  } catch (err) {
    next(err);
  }
};

export const showCreate = async (req, res, next) => {
  try {
    res.render("admin/stories/create", {
      title: "Tambah Cerita",
      admin: req.session.admin,
      ...(await formExtras(0, [])),
      story: {},
      error: null,
    });
  } catch (err) {
    next(err);
  }
};

export const handleCreate = async (req, res, next) => {
  try {
    const { title, summary, content, category_id } = req.body;
    const related = parseRelated(req.body);

    if (!title?.trim() || !content?.trim() || !category_id) {
      removeImage(req.file?.filename);
      return res.status(400).render("admin/stories/create", {
        title: "Tambah Cerita",
        admin: req.session.admin,
        ...(await formExtras(0, related)),
        story: req.body,
        error: "Judul, kategori, dan isi wajib diisi",
      });
    }

    const id = await createStory({
      title: title.trim(),
      slug: await uniqueSlug(title),
      summary: summary?.trim() || null,
      content,
      image: req.file ? req.file.filename : null,
      category_id,
      location_id: req.body.location_id || null,
      ...parseYears(req.body),
    });
    await setRelatedStories(id, related);

    res.redirect(`${res.locals.adminPath}/stories`);
  } catch (err) {
    removeImage(req.file?.filename);
    next(err);
  }
};

export const showEdit = async (req, res, next) => {
  try {
    const story = await getStoryById(req.params.id);
    if (!story)
      return res.status(404).render("pages/404", { title: "Tidak ditemukan" });

    res.render("admin/stories/edit", {
      title: "Edit Cerita",
      admin: req.session.admin,
      ...(await formExtras(story.id, await getRelatedIds(story.id))),
      story,
      error: null,
    });
  } catch (err) {
    next(err);
  }
};

export const handleUpdate = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const old = await getStoryById(id);
    if (!old) {
      removeImage(req.file?.filename);
      return res.status(404).render("pages/404", { title: "Tidak ditemukan" });
    }

    const { title, summary, content, category_id } = req.body;
    const related = parseRelated(req.body);

    if (!title?.trim() || !content?.trim() || !category_id) {
      removeImage(req.file?.filename);
      return res.status(400).render("admin/stories/edit", {
        title: "Edit Cerita",
        admin: req.session.admin,
        ...(await formExtras(id, related)),
        story: { ...req.body, id, image: old.image },
        error: "Judul, kategori, dan isi wajib diisi",
      });
    }

    await updateStory(id, {
      title: title.trim(),
      slug: await uniqueSlug(title, id),
      summary: summary?.trim() || null,
      content,
      image: req.file ? req.file.filename : old.image,
      category_id,
      location_id: req.body.location_id || null,
      ...parseYears(req.body),
    });
    await setRelatedStories(id, related);

    if (req.file) removeImage(old.image);
    res.redirect(`${res.locals.adminPath}/stories`);
  } catch (err) {
    removeImage(req.file?.filename);
    next(err);
  }
};

export const handleDelete = async (req, res, next) => {
  try {
    const story = await getStoryById(req.params.id);
    if (story) {
      await deleteStory(story.id);
      removeImage(story.image);
    }
    res.redirect(`${res.locals.adminPath}/stories`);
  } catch (err) {
    next(err);
  }
};

export const handleImageUpload = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Tidak ada file" });
  res.json({ url: `/uploads/${req.file.filename}` });
};
