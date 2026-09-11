// models/refreshToken.js
const pool = require('../config/db');

async function saveRefreshToken(user_id, token, expiresAt) {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [user_id, token, expiresAt]
  );
}

async function findRefreshToken(token) {
  const result = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token = $1`,
    [token]
  );
  return result.rows[0];
}

async function deleteRefreshToken(token) {
  await pool.query(
    `DELETE FROM refresh_tokens WHERE token = $1`,
    [token]
  );
}

module.exports = { saveRefreshToken, findRefreshToken, deleteRefreshToken };