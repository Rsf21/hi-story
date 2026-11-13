import pool from "../src/config/database.js";

export const upsertGoogleUser = async ({ googleId, email, name, avatar }) => {
  await pool.query(
    `INSERT INTO users (google_id, email, name, avatar) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email = VALUES(email), name = VALUES(name),
       avatar = VALUES(avatar), last_login = CURRENT_TIMESTAMP`,
    [googleId, email, name, avatar],
  );
  const [rows] = await pool.query("SELECT * FROM users WHERE google_id = ?", [
    googleId,
  ]);
  return rows[0];
};
