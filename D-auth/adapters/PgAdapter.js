const BaseAdapter = require('../core/BaseAdapter');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

class PgAdapter extends BaseAdapter {
    constructor(pool) {
        super();
        this.pool = pool;
    }

    async init() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                email             VARCHAR(255) UNIQUE NOT NULL,
                password_hash     TEXT,
                first_name        VARCHAR(255),
                last_name         VARCHAR(255),
                role              VARCHAR(50)  NOT NULL DEFAULT 'student',
                image             TEXT,
                is_email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
                created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
            ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

            CREATE TABLE IF NOT EXISTS accounts (
                id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                provider            VARCHAR(100) NOT NULL,
                provider_account_id VARCHAR(255) NOT NULL,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(provider, provider_account_id)
            );

            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token      TEXT        UNIQUE NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token      TEXT        UNIQUE NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used       BOOLEAN     NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS email_verifications (
                id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                code       VARCHAR(10) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used       BOOLEAN     NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('[D-auth] PgAdapter: All auth tables verified.');
    }

    // ── User CRUD ─────────────────────────────────────────────────────────────

    async getUserByEmail(email) {
        const { rows } = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return rows[0] || null;
    }

    async getUserById(id) {
        const { rows } = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return rows[0] || null;
    }

    async createUser(profile) {
        const password_hash = profile.password
            ? await bcrypt.hash(profile.password, SALT_ROUNDS)
            : null;

        const first_name = profile.first_name ||
            (profile.name ? profile.name.split(' ')[0] : '') || '';
        const last_name  = profile.last_name  ||
            (profile.name ? profile.name.split(' ').slice(1).join(' ') : '') || '';

        const userId = profile.id || crypto.randomUUID();

        const { rows } = await this.pool.query(
            `INSERT INTO users (id, email, password_hash, first_name, last_name, role, image, is_email_verified)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING id, email, first_name, last_name, role, image, is_email_verified, created_at`,
            [userId, profile.email, password_hash, first_name, last_name,
             profile.role || 'student', profile.image || null,
             profile.is_email_verified || false]
        );
        return rows[0];
    }

    async updateUser(id, fields) {
        const ALLOWED = ['first_name','last_name','image','role','is_email_verified','password_hash'];
        const toUpdate = {};
        for (const k of ALLOWED) {
            if (fields[k] !== undefined) toUpdate[k] = fields[k];
        }
        if (!Object.keys(toUpdate).length) return this.getUserById(id);

        const keys = Object.keys(toUpdate);
        const set  = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
        const vals = keys.map(k => toUpdate[k]);

        const { rows } = await this.pool.query(
            `UPDATE users SET ${set}, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id, ...vals]
        );
        return rows[0];
    }

    // ── Password ──────────────────────────────────────────────────────────────

    async verifyPassword(user, password) {
        if (!user || !user.password_hash) return false;
        return bcrypt.compare(password, user.password_hash);
    }

    async updatePassword(userId, newPassword) {
        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await this.pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hash, userId]
        );
    }

    // ── OAuth Account Linking ─────────────────────────────────────────────────

    async linkAccount(userId, provider, providerAccountId) {
        const { rows } = await this.pool.query(
            `INSERT INTO accounts (user_id, provider, provider_account_id)
             VALUES ($1,$2,$3)
             ON CONFLICT (provider, provider_account_id) DO NOTHING
             RETURNING *`,
            [userId, provider, providerAccountId]
        );
        return rows[0];
    }

    async getUserByProvider(provider, providerAccountId) {
        const { rows } = await this.pool.query(
            'SELECT user_id FROM accounts WHERE provider = $1 AND provider_account_id = $2',
            [provider, providerAccountId]
        );
        return rows[0] ? rows[0].user_id : null;
    }

    // ── Refresh Tokens ────────────────────────────────────────────────────────

    async saveRefreshToken(userId, token, expiresAt) {
        await this.pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
            [userId, token, expiresAt]
        );
    }

    async findRefreshToken(token) {
        const { rows } = await this.pool.query(
            'SELECT * FROM refresh_tokens WHERE token = $1', [token]
        );
        return rows[0] || null;
    }

    async deleteRefreshToken(token) {
        await this.pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    }

    async deleteAllUserRefreshTokens(userId) {
        await this.pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    }

    // ── Password Reset ────────────────────────────────────────────────────────

    async createPasswordResetToken(userId) {
        await this.pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
        const token     = crypto.randomBytes(48).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await this.pool.query(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
            [userId, token, expiresAt]
        );
        return token;
    }

    async consumePasswordResetToken(token) {
        const { rows } = await this.pool.query(
            'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE', [token]
        );
        const record = rows[0];
        if (!record || new Date(record.expires_at) < new Date()) return null;
        await this.pool.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [record.id]
        );
        return record;
    }

    // ── Email Verification ────────────────────────────────────────────────────

    async createEmailVerification(userId) {
        await this.pool.query('DELETE FROM email_verifications WHERE user_id = $1', [userId]);
        const code      = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await this.pool.query(
            'INSERT INTO email_verifications (user_id, code, expires_at) VALUES ($1,$2,$3)',
            [userId, code, expiresAt]
        );
        return code;
    }

    async consumeEmailVerification(userId, code) {
        const { rows } = await this.pool.query(
            'SELECT * FROM email_verifications WHERE user_id = $1 AND code = $2 AND used = FALSE',
            [userId, code]
        );
        const record = rows[0];
        if (!record || new Date(record.expires_at) < new Date()) return false;

        await this.pool.query('UPDATE email_verifications SET used = TRUE WHERE id = $1', [record.id]);
        await this.pool.query('UPDATE users SET is_email_verified = TRUE, updated_at = NOW() WHERE id = $1', [userId]);
        return true;
    }
}

module.exports = PgAdapter;
