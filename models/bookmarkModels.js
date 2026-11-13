import pool from "../src/config/database.js";

export const setBookmark = async (userId, storyId, save) => {
  if (save) {
    await pool.query(
      "INSERT IGNORE INTO bookmarks (user_id, story_id) VALUES (?, ?)",
      [userId, storyId],
    );
    return true;
  }
  await pool.query("DELETE FROM bookmarks WHERE user_id = ? AND story_id = ?", [
    userId,
    storyId,
  ]);
  return false;
};

export const getBookmarkedIds = async (userId) => {
  const [rows] = await pool.query(
    "SELECT story_id FROM bookmarks WHERE user_id = ?",
    [userId],
  );
  return rows.map((r) => r.story_id);
};

export const getBookmarksByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug
     FROM bookmarks b
     JOIN stories s ON s.id = b.story_id
     JOIN categories c ON c.id = s.category_id
     WHERE b.user_id = ?
     ORDER BY b.created_at DESC`,
    [userId],
  );
  return rows;
};
