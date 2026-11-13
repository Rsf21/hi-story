import pool from "../src/config/database.js";

export const getAdminByUsername = async (username) => {
  const [rows] = await pool.query("SELECT * FROM admins WHERE username = ?", [
    username,
  ]);
  return rows[0];
};

export const createAdmin = async (username, hashedPassword) => {
  const [result] = await pool.query(
    "INSERT INTO admins (username, password) VALUES (?, ?)",
    [username, hashedPassword],
  );
  return result.insertId;
};
