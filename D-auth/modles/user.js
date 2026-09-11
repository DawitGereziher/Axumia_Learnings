// models/user.js
const pool = require('../config/db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function createUser({ email, password, first_name, last_name }) {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, first_name, last_name`,
    [email, password_hash, first_name, last_name]
  );

  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
}

async function verifyPassword(user, password) {
  return await bcrypt.compare(password, user.password_hash);
}

module.exports = {
  createUser,
  findUserByEmail,
  verifyPassword,
};