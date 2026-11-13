import pool from "./src/config/database.js";

async function testConnection() {
  try {
    const [rows] = await pool.query("SELECT 1 AS connected, DATABASE() AS db");

    console.log("Database berhasil terhubung!");
    console.log(rows);
  } catch (error) {
    console.error("Koneksi gagal:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
