import pool from "../src/config/database.js";

export const getAllLocations = async () => {
  const [rows] = await pool.query("SELECT * FROM locations ORDER BY name");
  return rows;
};

export const createLocation = async ({ name, lat, lng, radius_km }) => {
  const [result] = await pool.query(
    "INSERT INTO locations (name, lat, lng, radius_km) VALUES (?, ?, ?, ?)",
    [name, lat, lng, radius_km],
  );
  return result.insertId;
};

export const deleteLocation = async (id) => {
  await pool.query("DELETE FROM locations WHERE id = ?", [id]);
};

export const getGlobeData = async () => {
  const [rows] = await pool.query(
    `SELECT l.id AS location_id, l.name AS location_name, l.lat, l.lng, l.radius_km,
            s.title, s.slug, s.summary, s.image, s.year_start, s.year_end,
            c.name AS category_name
     FROM locations l
     JOIN stories s ON s.location_id = l.id
     JOIN categories c ON s.category_id = c.id
     ORDER BY l.name, s.published_at DESC`,
  );

  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.location_id)) {
      map.set(r.location_id, {
        id: r.location_id,
        name: r.location_name,
        lat: Number(r.lat),
        lng: Number(r.lng),
        radius_km: r.radius_km,
        stories: [],
      });
    }
    map.get(r.location_id).stories.push({
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      image: r.image,
      category: r.category_name,
      year_start: r.year_start,
      year_end: r.year_end,
    });
  }
  return [...map.values()];
};

// pencarian AJAX: judul, ringkasan, atau nama lokasi
export const searchGlobe = async (
  q,
  { from = null, to = null, limit = 8 } = {},
) => {
  const esc = q.replace(/[\\%_]/g, "\\$&");
  const like = `%${esc}%`;
  const starts = `${esc}%`;

  const where = ["(s.title LIKE ? OR s.summary LIKE ? OR l.name LIKE ?)"];
  const params = [like, like, like];

  if (from !== null) {
    where.push(
      "s.year_start IS NOT NULL AND COALESCE(s.year_end, s.year_start) >= ?",
    );
    params.push(from);
  }
  if (to !== null) {
    where.push("s.year_start IS NOT NULL AND s.year_start <= ?");
    params.push(to);
  }
  params.push(starts, limit);

  const [rows] = await pool.query(
    `SELECT s.title, s.slug, s.summary, s.image, s.year_start, s.year_end,
            c.name AS category, l.id AS location_id, l.name AS location_name
     FROM stories s
     JOIN locations l ON s.location_id = l.id
     JOIN categories c ON s.category_id = c.id
     WHERE ${where.join(" AND ")}
     ORDER BY (s.title LIKE ?) DESC, s.title
     LIMIT ?`,
    params,
  );
  return rows;
};
