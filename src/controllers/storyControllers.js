import {
  getAllStories,
  getStoryBySlug,
  getStoriesByCategory,
  searchStories,
  countStories,
  countStoriesByCategory,
  getRelatedStories,
  getFilteredStories,
  countFilteredStories,
  getAllLocations,
} from "../../models/storyModels.js";

import {
  getAllCategories,
  getCategoryBySlug,
} from "../../models/categoryModels.js";

import { getPublicImageUrl } from "../services/supabaseStorage.js";

const SITE_URL = "https://hai-story.vercel.app";
const HOME_OG_IMAGE = `${SITE_URL}/images/og-home.jpg`;

const PER_PAGE = 9;
const HOME_PER_PAGE = 12;

const getPage = (req) => {
  const page = parseInt(req.query.page, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const resolveImageUrl = (image) => {
  if (!image) return null;

  let value = String(image).trim();

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  value = value.replace(/^\/+/, "");

  if (/^uploads\/https?:\/\//i.test(value)) {
    return value.replace(/^uploads\//i, "");
  }

  value = value.replace(/^uploads\//i, "");

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const filename = value.split("/").pop();

  const supabaseImagePattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

  if (supabaseImagePattern.test(filename)) {
    return getPublicImageUrl(filename);
  }

  return `/uploads/${encodeURIComponent(filename)}`;
};

const withImageUrl = (story) => ({
  ...story,
  imageUrl: resolveImageUrl(story.image),
});

const createDescription = (content, fallback) => {
  const description = (content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  return description || fallback;
};

export const showHome = async (req, res, next) => {
  try {
    const page = getPage(req);

    const locationValue = req.query.location || "";
    const yearValue = req.query.year || "";
    const categorySlug = req.query.category || "";

    const locationId =
      /^\d+$/.test(locationValue) && Number(locationValue) > 0
        ? Number(locationValue)
        : null;

    const parsedYear =
      yearValue !== "" && /^-?\d+$/.test(yearValue) ? Number(yearValue) : null;

    const year =
      parsedYear !== null && Number.isSafeInteger(parsedYear)
        ? parsedYear
        : null;

    const filters = {
      locationId,
      year,
      categorySlug,
    };

    const total = await countFilteredStories(filters);
    const totalPages = Math.max(1, Math.ceil(total / HOME_PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    const stories = await getFilteredStories(
      filters,
      HOME_PER_PAGE,
      (currentPage - 1) * HOME_PER_PAGE,
    );

    const categories = await getAllCategories();
    const locations = await getAllLocations();

    const isGuest = !req.session.userId && !!req.session.guest;

    const filterQuery = new URLSearchParams();

    if (locationId) filterQuery.set("location", String(locationId));
    if (year !== null) filterQuery.set("year", String(year));
    if (categorySlug) filterQuery.set("category", categorySlug);

    res.render("pages/home", {
      title: "Hi-Story",
      stories: stories.map(withImageUrl),
      categories,
      locations,
      currentPage,
      totalPages,
      isGuest,
      bookmarks: req.query.bookmarks || "",
      baseUrl: "/",
      filterQuery: filterQuery.toString(),
      selectedLocation: locationId ? String(locationId) : "",
      selectedYear: year !== null ? String(year) : "",
      selectedCategory: categorySlug,
      metaDescription:
        "Hi-Story — Jelajahi kisah sejarah, tokoh dunia, kerajaan, dan peristiwa bersejarah.",
      ogTitle: "Hi-Story — Jelajahi Sejarah Dunia",
      ogDescription:
        "Jelajahi kisah tokoh, kerajaan, dan peristiwa bersejarah dunia.",
      ogImage: HOME_OG_IMAGE,
      ogUrl: `${SITE_URL}/`,
      ogType: "website",
    });
  } catch (err) {
    next(err);
  }
};

export const showByCategory = async (req, res, next) => {
  try {
    const category = await getCategoryBySlug(req.params.slug);

    if (!category) {
      return res.status(404).render("pages/404", {
        title: "Tidak ditemukan",
      });
    }

    const page = getPage(req);
    const total = await countStoriesByCategory(category.slug);
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    const stories = await getStoriesByCategory(
      category.slug,
      PER_PAGE,
      (currentPage - 1) * PER_PAGE,
    );

    const categories = await getAllCategories();
    const storiesWithImages = stories.map(withImageUrl);

    const categoryImage =
      storiesWithImages.find((story) => story.imageUrl)?.imageUrl ||
      HOME_OG_IMAGE;

    const categoryDescription = `Jelajahi berbagai cerita sejarah dalam kategori ${category.name} di Hi-Story.`;

    res.render("pages/category", {
      title: category.name,
      category,
      stories: storiesWithImages,
      categories,
      currentPage,
      totalPages,
      baseUrl: `/story/category/${category.slug}`,
      metaDescription: categoryDescription,
      ogTitle: `${category.name} | Hi-Story`,
      ogDescription: categoryDescription,
      ogImage: categoryImage,
      ogUrl: `${SITE_URL}/story/category/${category.slug}`,
      ogType: "website",
    });
  } catch (err) {
    next(err);
  }
};

export const showStoryDetail = async (req, res, next) => {
  try {
    const storyData = await getStoryBySlug(req.params.slug);

    if (!storyData) {
      return res.status(404).render("pages/404", {
        title: "Tidak ditemukan",
      });
    }

    const story = withImageUrl(storyData);
    const relatedData = await getRelatedStories(storyData);
    const related = relatedData.map(withImageUrl);

    const description = createDescription(
      story.content,
      `Baca kisah ${story.title} secara lengkap di Hi-Story.`,
    );

    const storyImage = story.imageUrl
      ? /^https?:\/\//i.test(story.imageUrl)
        ? story.imageUrl
        : `${SITE_URL}${story.imageUrl.startsWith("/") ? "" : "/"}${story.imageUrl}`
      : HOME_OG_IMAGE;

    res.render("pages/story-detail", {
      title: story.title,
      story,
      related,
      metaDescription: description,
      ogTitle: `${story.title} | Hi-Story`,
      ogDescription: description,
      ogImage: storyImage,
      ogUrl: `${SITE_URL}/story/${story.slug}`,
      ogType: "article",
    });
  } catch (err) {
    next(err);
  }
};

export const searchHandler = async (req, res, next) => {
  try {
    const keyword = (req.query.q || "").trim();
    const stories = keyword ? await searchStories(keyword) : [];
    const categories = await getAllCategories();

    res.render("pages/search", {
      title: `Cari: ${keyword}`,
      keyword,
      stories: stories.map(withImageUrl),
      categories,
      metaDescription: `Hasil pencarian ${keyword} di Hi-Story.`,
      ogTitle: `Cari: ${keyword} | Hi-Story`,
      ogDescription: `Temukan cerita sejarah terkait ${keyword} di Hi-Story.`,
      ogImage: HOME_OG_IMAGE,
      ogUrl: `${SITE_URL}/search?q=${encodeURIComponent(keyword)}`,
      ogType: "website",
    });
  } catch (err) {
    next(err);
  }
};
