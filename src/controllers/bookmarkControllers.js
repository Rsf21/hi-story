import {
  setBookmark,
  getBookmarksByUser,
} from "../../models/bookmarkModels.js";

import { resolveImageUrl } from "./storyControllers.js";

export const addBookmarks = async (req, res, next) => {
  try {
    const storyId = Number.parseInt(req.body && req.body.storyId, 10);

    if (!Number.isInteger(storyId) || storyId < 1) {
      return res.status(400).json({ error: "ID cerita tidak valid" });
    }

    const save = !(req.body && req.body.save === false);
    const saved = await setBookmark(req.session.user.id, storyId, save);

    res.json({ saved });
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(404).json({ error: "Cerita tidak ditemukan" });
    }

    next(err);
  }
};

export const showBookmarks = async (req, res, next) => {
  try {
    const stories = await getBookmarksByUser(req.session.user.id);

    const storiesWithImages = stories.map((story) => ({
      ...story,
      imageUrl: resolveImageUrl(story.image),
    }));

    res.render("pages/bookmarks", {
      title: "Cerita Tersimpan",
      stories: storiesWithImages,
    });
  } catch (err) {
    next(err);
  }
};
