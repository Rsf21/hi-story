import pool from "../src/config/database.js";

export const getAllCategories = async () => {
  const [rows] = await pool.query("SELECT * FROM categories ORDER BY name");
  return rows;
};

export const getCategoryBySlug = async (slug) => {
  const [rows] = await pool.query("SELECT * FROM categories WHERE slug = ?", [
    slug,
  ]);
  return rows[0];
};

export const createCategory = async (name, slug) => {
  const [result] = await pool.query(
    "INSERT INTO categories (name, slug) VALUES (?, ?)",
    [name, slug],
  );
  return result.insertId;
};

export const deleteCategory = async (id) => {
  await pool.query("DELETE FROM categories WHERE id = ?", [id]);
};

export const getCategoriesWithCount = async () => {
  const [rows] = await pool.query(
    `SELECT c.*, COUNT(s.id) AS total_stories
     FROM categories c
     LEFT JOIN stories s ON s.category_id = c.id
     GROUP BY c.id
     ORDER BY c.name`,
  );
  return rows;
};

export const getCategoryById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM categories WHERE id = ?", [
    id,
  ]);
  return rows[0];
};
