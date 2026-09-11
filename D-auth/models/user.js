// models/user.js — standalone model helpers (used by routes if needed outside AuthManager)
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

const crypto = require('crypto');

async function createUser({ id, email, password, first_name, last_name, role, image }) {
    const userId = id || crypto.randomUUID();
    const password_hash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    const { rows } = await pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, image)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, email, first_name, last_name, role, image, is_email_verified, created_at`,
        [userId, email, password_hash, first_name || '', last_name || '', role || 'student', image || null]
    );
    return rows[0];
}

async function findUserByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
}

async function findUserById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
}

async function verifyPassword(user, password) {
    if (!user || !user.password_hash) return false;
    return bcrypt.compare(password, user.password_hash);
}

module.exports = { createUser, findUserByEmail, findUserById, verifyPassword };
