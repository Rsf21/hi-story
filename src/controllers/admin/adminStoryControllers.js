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
import {
  createImageUpload,
  getPublicImageUrl,
  deleteImage,
} from "../../services/supabaseStorage.js";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

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

const isSupabaseImage = (image) =>
  typeof image === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(
    image,
  );

const resolveImageUrl = (image) => {
  if (!image) return null;

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  if (isSupabaseImage(image)) {
    return getPublicImageUrl(image);
  }

  return `/uploads/${encodeURIComponent(path.basename(image))}`;
};

const addImageUrl = (story) => ({
  ...story,
  imageUrl: resolveImageUrl(story.image),
});

const removeStoredImage = async (image) => {
  if (!isSupabaseImage(image)) return;

  try {
    await deleteImage(image);
  } catch (err) {
    console.error("GAGAL MENGHAPUS GAMBAR:", err);
  }
};

const parseRelated = (body) => [].concat(body.related || []);

const parseYear = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;

  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= -10000 && n <= 3000 ? n : null;
};

const parseYears = (body) => {
  let start = parseYear(body.year_start);
  let end = parseYear(body.year_end);

  if (start === null && end !== null) start = end;

  if (start !== null && end !== null && end < start) {
    [start, end] = [end, start];
  }

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
      stories: stories.map(addImageUrl),
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
    const image = req.body.image || null;

    if (image && !isSupabaseImage(image)) {
      return res.status(400).render("admin/stories/create", {
        title: "Tambah Cerita",
        admin: req.session.admin,
        ...(await formExtras(0, related)),
        story: req.body,
        error: "Path gambar tidak valid. Silakan unggah ulang gambar.",
      });
    }

    if (!title?.trim() || !content?.trim() || !category_id) {
      await removeStoredImage(image);

      return res.status(400).render("admin/stories/create", {
        title: "Tambah Cerita",
        admin: req.session.admin,
        ...(await formExtras(0, related)),
        story: { ...req.body, image: null, imageUrl: null },
        error: "Judul, kategori, dan isi wajib diisi",
      });
    }

    let id;

    try {
      id = await createStory({
        title: title.trim(),
        slug: await uniqueSlug(title),
        summary: summary?.trim() || null,
        content,
        image,
        category_id,
        location_id: req.body.location_id || null,
        ...parseYears(req.body),
      });
    } catch (err) {
      await removeStoredImage(image);
      throw err;
    }

    await setRelatedStories(id, related);

    res.redirect(`${res.locals.adminPath}/stories`);
  } catch (err) {
    next(err);
  }
};

export const showEdit = async (req, res, next) => {
  try {
    const story = await getStoryById(req.params.id);

    if (!story) {
      return res.status(404).render("pages/404", {
        title: "Tidak ditemukan",
      });
    }

    res.render("admin/stories/edit", {
      title: "Edit Cerita",
      admin: req.session.admin,
      ...(await formExtras(story.id, await getRelatedIds(story.id))),
      story: addImageUrl(story),
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
      return res.status(404).render("pages/404", {
        title: "Tidak ditemukan",
      });
    }

    const { title, summary, content, category_id } = req.body;
    const related = parseRelated(req.body);
    const submittedImage = req.body.image || "";
    const image = submittedImage || old.image;

    if (submittedImage && !isSupabaseImage(submittedImage)) {
      return res.status(400).render("admin/stories/edit", {
        title: "Edit Cerita",
        admin: req.session.admin,
        ...(await formExtras(id, related)),
        story: addImageUrl({ ...req.body, id, image: old.image }),
        error: "Path gambar tidak valid. Silakan unggah ulang gambar.",
      });
    }

    if (!title?.trim() || !content?.trim() || !category_id) {
      if (submittedImage && submittedImage !== old.image) {
        await removeStoredImage(submittedImage);
      }

      return res.status(400).render("admin/stories/edit", {
        title: "Edit Cerita",
        admin: req.session.admin,
        ...(await formExtras(id, related)),
        story: addImageUrl({ ...req.body, id, image: old.image }),
        error: "Judul, kategori, dan isi wajib diisi",
      });
    }

    try {
      await updateStory(id, {
        title: title.trim(),
        slug: await uniqueSlug(title, id),
        summary: summary?.trim() || null,
        content,
        image,
        category_id,
        location_id: req.body.location_id || null,
        ...parseYears(req.body),
      });
    } catch (err) {
      if (submittedImage && submittedImage !== old.image) {
        await removeStoredImage(submittedImage);
      }

      throw err;
    }

    await setRelatedStories(id, related);

    if (submittedImage && submittedImage !== old.image) {
      await removeStoredImage(old.image);
    }

    res.redirect(`${res.locals.adminPath}/stories`);
  } catch (err) {
    next(err);
  }
};

export const handleDelete = async (req, res, next) => {
  try {
    const story = await getStoryById(req.params.id);

    if (story) {
      await deleteStory(story.id);
      await removeStoredImage(story.image);
    }

    res.redirect(`${res.locals.adminPath}/stories`);
  } catch (err) {
    next(err);
  }
};

export const handleImageUpload = async (req, res, next) => {
  try {
    const { contentType, size } = req.body;
    const fileSize = Number(size);

    if (
      typeof contentType !== "string" ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0
    ) {
      return res.status(400).json({
        error: "Informasi gambar tidak valid",
      });
    }

    if (fileSize > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        error: "Ukuran gambar maksimal 20 MB",
      });
    }

    const upload = await createImageUpload(contentType);

    res.json({
      path: upload.path,
      signedUrl: upload.signedUrl,
      url: getPublicImageUrl(upload.path),
    });
  } catch (err) {
    next(err);
  }
};
