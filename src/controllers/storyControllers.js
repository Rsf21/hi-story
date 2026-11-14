import {
  getAllStories,
  getStoryBySlug,
  getStoriesByCategory,
  searchStories,
  countStories,
  countStoriesByCategory,
  getRelatedStories,
} from "../../models/storyModels.js";
import {
  getAllCategories,
  getCategoryBySlug,
} from "../../models/categoryModels.js";
import { getPublicImageUrl } from "../services/supabaseStorage.js";

const PER_PAGE = 9;
const HOME_PER_PAGE = 12;

const getPage = (req) => {
  const page = parseInt(req.query.page, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const resolveImageUrl = (image) => {
  if (!image) return null;

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  const supabaseImagePattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

  if (supabaseImagePattern.test(image)) {
    return getPublicImageUrl(image);
  }

  const filename = image
    .replace(/^\/?uploads\//i, "")
    .split("/")
    .pop();

  return `/uploads/${encodeURIComponent(filename)}`;
};

const withImageUrl = (story) => ({
  ...story,
  image: resolveImageUrl(story.image),
});

export const showHome = async (req, res, next) => {
  try {
    const page = getPage(req);
    const total = await countStories();
    const totalPages = Math.max(1, Math.ceil(total / HOME_PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    const stories = await getAllStories(
      HOME_PER_PAGE,
      (currentPage - 1) * HOME_PER_PAGE,
    );

    const categories = await getAllCategories();
    const isGuestSession = (req) => !req.session.userId && !!req.session.guest;
    const status = req.query.bookmarks || "";

    res.render("pages/home", {
      title: "Hi-Story",
      stories: stories.map(withImageUrl),
      categories,
      currentPage,
      totalPages,
      isGuest: isGuestSession(req),
      bookmarks: status,
      baseUrl: "/",
      ogTitle: "Hi-Story — Jelajahi Sejarah Dunia",
      ogDescription:
        "Jelajahi kisah tokoh, kerajaan, dan peristiwa bersejarah dunia.",
      ogImage: "https://hi-story-tau.vercel.app/images/og-home.jpg",
      ogUrl: "https://hi-story-tau.vercel.app/",
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

    res.render("pages/category", {
      title: category.name,
      category,
      stories: stories.map(withImageUrl),
      categories,
      currentPage,
      totalPages,
      baseUrl: `/story/category/${category.slug}`,
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

    const siteUrl = "https://hi-story-tau.vercel.app";

    const description = (story.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);

    res.render("pages/story-detail", {
      title: story.title,
      story,
      related,
      metaDescription: description,
      ogTitle: `${story.title} | Hi-Story`,
      ogDescription: description,
      ogImage: story.image,
      ogUrl: `${siteUrl}/story/${story.slug}`,
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
    });
  } catch (err) {
    next(err);
  }
};
