import pool from "../src/config/database.js";

export const getAllStories = async (limit = 20, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug,
            l.name AS location_name
     FROM stories s
     JOIN categories c ON s.category_id = c.id
     LEFT JOIN locations l ON s.location_id = l.id
     ORDER BY s.published_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows;
};

export const getStoryBySlug = async (slug) => {
  const [rows] = await pool.query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug
     FROM stories s
     JOIN categories c ON s.category_id = c.id
     WHERE s.slug = ?`,
    [slug],
  );
  return rows[0];
};

export const getStoryById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM stories WHERE id = ?", [id]);
  return rows[0];
};

export const getStoriesByCategory = async (
  categorySlug,
  limit = 9,
  offset = 0,
) => {
  const [rows] = await pool.query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug
     FROM stories s
     JOIN categories c ON s.category_id = c.id
     WHERE c.slug = ?
     ORDER BY s.published_at DESC
     LIMIT ? OFFSET ?`,
    [categorySlug, limit, offset],
  );
  return rows;
};

export const countStoriesByCategory = async (categorySlug) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM stories s
     JOIN categories c ON s.category_id = c.id
     WHERE c.slug = ?`,
    [categorySlug],
  );
  return rows[0].total;
};

export const searchStories = async (keyword) => {
  const like = `%${keyword}%`;
  const [rows] = await pool.query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug
     FROM stories s
     JOIN categories c ON s.category_id = c.id
     WHERE s.title LIKE ? OR s.summary LIKE ?
     ORDER BY s.published_at DESC`,
    [like, like],
  );
  return rows;
};

export const createStory = async ({
  title,
  slug,
  summary,
  content,
  image,
  category_id,
  location_id = null,
  year_start = null,
  year_end = null,
}) => {
  const [result] = await pool.query(
    `INSERT INTO stories
       (title, slug, summary, content, image, category_id, location_id, year_start, year_end)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      slug,
      summary,
      content,
      image,
      category_id,
      location_id,
      year_start,
      year_end,
    ],
  );
  return result.insertId;
};

export const updateStory = async (
  id,
  {
    title,
    slug,
    summary,
    content,
    image,
    category_id,
    location_id = null,
    year_start = null,
    year_end = null,
  },
) => {
  await pool.query(
    `UPDATE stories
     SET title = ?, slug = ?, summary = ?, content = ?, image = ?,
         category_id = ?, location_id = ?, year_start = ?, year_end = ?
     WHERE id = ?`,
    [
      title,
      slug,
      summary,
      content,
      image,
      category_id,
      location_id,
      year_start,
      year_end,
      id,
    ],
  );
};

export const deleteStory = async (id) => {
  await pool.query("DELETE FROM stories WHERE id = ?", [id]);
};

export const countStories = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM stories");
  return rows[0].total;
};

// daftar cerita buat pilihan di form admin
export const getAllStoryOptions = async (excludeId = 0) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.title, c.name AS category_name
     FROM stories s
     JOIN categories c ON s.category_id = c.id
     WHERE s.id <> ?
     ORDER BY s.title`,
    [excludeId],
  );
  return rows;
};

export const getRelatedIds = async (storyId) => {
  const [rows] = await pool.query(
    "SELECT related_id FROM story_relations WHERE story_id = ?",
    [storyId],
  );
  return rows.map((r) => r.related_id);
};

export const setRelatedStories = async (storyId, ids) => {
  const clean = [
    ...new Set(
      ids
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0 && n !== Number(storyId)),
    ),
  ];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM story_relations WHERE story_id = ?", [
      storyId,
    ]);
    if (clean.length) {
      await conn.query(
        "INSERT INTO story_relations (story_id, related_id) VALUES ?",
        [clean.map((id) => [storyId, id])],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const getRelatedStories = async (story, autoCount = 3) => {
  const [manual] = await pool.query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug
     FROM story_relations r
     JOIN stories s ON s.id = r.related_id
     JOIN categories c ON s.category_id = c.id
     WHERE r.story_id = ?
     ORDER BY s.published_at DESC`,
    [story.id],
  );
  if (manual.length) return manual; // admin memilih: tampilkan persis pilihannya

  const [auto] = await pool.query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug
     FROM stories s
     JOIN categories c ON s.category_id = c.id
     WHERE s.category_id = ? AND s.id <> ?
     ORDER BY s.published_at DESC
     LIMIT ?`,
    [story.category_id, story.id, autoCount],
  );
  return auto;
};

export const getAllLocations = async () => {
  const [rows] = await pool.query(
    `SELECT id, name
     FROM locations
     ORDER BY name ASC`,
  );

  return rows;
};

export const getFilteredStories = async (
  { locationId = null, year = null, categorySlug = "" },
  limit = 12,
  offset = 0,
) => {
  const conditions = [];
  const params = [];

  if (locationId) {
    conditions.push("s.location_id = ?");
    params.push(locationId);
  }

  if (year !== null) {
    conditions.push(`
      (
        (s.year_end IS NULL AND s.year_start = ?)
        OR
        (s.year_start <= ? AND s.year_end >= ?)
      )
    `);

    params.push(year, year, year);
  }

  if (categorySlug) {
    conditions.push("c.slug = ?");
    params.push(categorySlug);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT s.*, c.name AS category_name, c.slug AS category_slug,
            l.name AS location_name
     FROM stories s
     JOIN categories c ON s.category_id = c.id
     LEFT JOIN locations l ON s.location_id = l.id
     ${where}
     ORDER BY s.published_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return rows;
};

export const countFilteredStories = async ({
  locationId = null,
  year = null,
  categorySlug = "",
}) => {
  const conditions = [];
  const params = [];

  if (locationId) {
    conditions.push("s.location_id = ?");
    params.push(locationId);
  }

  if (year !== null) {
    conditions.push(`
      (
        (s.year_end IS NULL AND s.year_start = ?)
        OR
        (s.year_start <= ? AND s.year_end >= ?)
      )
    `);

    params.push(year, year, year);
  }

  if (categorySlug) {
    conditions.push("c.slug = ?");
    params.push(categorySlug);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM stories s
     JOIN categories c ON s.category_id = c.id
     ${where}`,
    params,
  );

  return rows[0].total;
};
