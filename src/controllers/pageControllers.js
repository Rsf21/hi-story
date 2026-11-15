import { getAllStories } from "../../models/storyModels.js";
import { getPublicImageUrl } from "../services/supabaseStorage.js";

const resolveImageUrl = (image) => {
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

  const supabasePattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

  if (supabasePattern.test(filename)) {
    return getPublicImageUrl(filename);
  }

  return `/uploads/${encodeURIComponent(filename)}`;
};

export const showAbout = async (req, res, next) => {
  try {
    const stories = await getAllStories(1000, 0);

    const storiesWithImages = stories
      .map((story) => ({
        ...story,
        imageUrl: resolveImageUrl(story.image),
      }))
      .filter((story) => story.imageUrl);

    res.render("pages/about", {
      title: "Tentang Hi-Story",
      stories: storiesWithImages,
    });
  } catch (err) {
    next(err);
  }
};

export const showContact = (req, res) =>
  res.render("pages/contact", { title: "Kontak" });

export const showFaq = (req, res) => res.render("pages/faq", { title: "FAQ" });
