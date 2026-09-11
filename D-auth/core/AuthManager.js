const express  = require('express');
const passport = require('passport');
const helmet   = require('helmet');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');

const { generateToken, verifyToken } = require('../utils/jwt');
const { generateRefreshToken }       = require('../utils/refreshToken');
const emailService                   = require('../utils/email');

// ─── Rate limiters ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 20,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true, legacyHeaders: false,
});

const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hr
    max: 5,
    message: { error: 'Too many attempts. Please try again in 1 hour.' },
    standardHeaders: true, legacyHeaders: false,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function refreshExpiry() {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
}

function safeUser(u) {
    return {
        id:               u.id,
        email:            u.email,
        first_name:       u.first_name,
        last_name:        u.last_name,
        role:             u.role,
        image:            u.image || null,
        is_email_verified: u.is_email_verified,
    };
}

// ─── AuthManager ──────────────────────────────────────────────────────────────
class AuthManager {
    /**
     * @param {object} options
     * @param {import('../core/BaseAdapter')} options.adapter
     * @param {Array}  options.plugins       - OAuth plugins
     * @param {string} options.appName       - used in email subjects
     * @param {object} options.cors          - cors() options
     * @param {object} options.jwt           - { accessTokenExpiry }
     * @param {function} options.onSuccess   - custom OAuth success hook
     * @param {function} options.onFailure   - custom OAuth failure hook
     */
    constructor(options = {}) {
        this.adapter    = options.adapter  || null;
        this.plugins    = options.plugins  || [];
        this.appName    = options.appName  || 'App';
        this.jwtOptions = options.jwt      || {};
        this.onSuccess  = options.onSuccess || null;
        this.onFailure  = options.onFailure || null;

        this.router   = express.Router();
        this.passport = passport;

        const corsOpts = options.cors || {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        };

        // Apply security middleware to this router
        this.router.use(helmet({ crossOriginResourcePolicy: false }));
        this.router.use(cors(corsOpts));
        this.router.use(express.json());
        this.router.use(this.passport.initialize());

        // Initialize database tables
        if (this.adapter) {
            this.adapter.init().catch(err =>
                console.error('[D-auth] Adapter init failed:', err)
            );
        }

        this._registerRoutes();
    }

    // ── Internal JWT middleware ────────────────────────────────────────────────
    _requireAuth(req, res, next) {
        const header = req.headers['authorization'] || req.headers['x-auth-token'] || '';
        const token  = header.startsWith('Bearer ') ? header.slice(7) : header;
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = verifyToken(token);
        if (!decoded)  return res.status(401).json({ error: 'Invalid or expired token' });

        req.user = decoded;
        next();
    }

    // ── OAuth helper ──────────────────────────────────────────────────────────
    async _handleOAuthSuccess(rawProfile, plugin, res, req) {
        let userForToken = rawProfile;

        if (this.adapter) {
            try {
                const email      = rawProfile.emails?.[0]?.value || null;
                const provider   = rawProfile.provider || plugin.name;
                const providerId = rawProfile.id || rawProfile.sub;

                if (!email) throw new Error('OAuth provider did not return an email address');

                let userId = await this.adapter.getUserByProvider(provider, providerId);
                let user   = null;

                if (!userId) {
                    user = await this.adapter.getUserByEmail(email);
                    if (!user) {
                        user = await this.adapter.createUser({
                            email,
                            name:             rawProfile.displayName || '',
                            image:            rawProfile.photos?.[0]?.value || null,
                            role:             'student',
                            is_email_verified: true, // emails from OAuth are pre-verified
                        });
                    }
                    userId = user.id;
                    await this.adapter.linkAccount(userId, provider, providerId);
                }

                if (!user) user = await this.adapter.getUserById(userId);

                userForToken = {
                    id:               userId,
                    email,
                    first_name:       user.first_name,
                    last_name:        user.last_name,
                    role:             user.role || 'student',
                    is_email_verified: true,
                };
            } catch (err) {
                console.error('[D-auth] OAuth adapter error:', err.message);
                return res.status(500).json({ error: 'Authentication failed' });
            }
        }

        if (this.onSuccess) return this.onSuccess(userForToken, res, req);

        // Default: issue tokens and redirect
        const accessToken  = generateToken(userForToken, this.jwtOptions);
        const refreshToken = generateRefreshToken();

        if (this.adapter?.saveRefreshToken) {
            await this.adapter.saveRefreshToken(userForToken.id, refreshToken, refreshExpiry());
        }

        const base = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${base}/oauth-success?token=${accessToken}&refresh=${refreshToken}`);
    }

    // ── Route registration ────────────────────────────────────────────────────
    _registerRoutes() {
        const r = this.router;

        // Health check
        r.get('/health', (req, res) =>
            res.json({ status: 'ok', module: 'd-auth', timestamp: new Date().toISOString() })
        );

        // ── POST /register ───────────────────────────────────────────────────
        r.post('/register', authLimiter, async (req, res) => {
            const { email, password, first_name, last_name, role } = req.body;
            if (!email || !password)
                return res.status(400).json({ error: 'email and password are required' });
            if (password.length < 8)
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            if (!this.adapter)
                return res.status(503).json({ error: 'No database adapter configured' });

            try {
                if (await this.adapter.getUserByEmail(email))
                    return res.status(409).json({ error: 'Email already registered' });

                const allowed   = ['student', 'instructor'];
                const userRole  = allowed.includes(role) ? role : 'student';
                const user      = await this.adapter.createUser({ email, password, first_name, last_name, role: userRole });

                // Send verification email (non-fatal)
                try {
                    const code = await this.adapter.createEmailVerification(user.id);
                    await emailService.sendVerificationEmail(email, {
                        name: first_name || email, code, appName: this.appName,
                    });
                } catch (e) {
                    console.warn('[D-auth] Verification email failed (non-fatal):', e.message);
                }

                const accessToken  = generateToken(user, this.jwtOptions);
                const refreshToken = generateRefreshToken();
                if (this.adapter?.saveRefreshToken)
                    await this.adapter.saveRefreshToken(user.id, refreshToken, refreshExpiry());

                res.status(201).json({
                    message: 'Registration successful. Please verify your email.',
                    accessToken, refreshToken, user: safeUser(user),
                });
            } catch (err) {
                console.error('[D-auth] Register error:', err);
                res.status(500).json({ error: 'Server error during registration' });
            }
        });

        // ── POST /login ──────────────────────────────────────────────────────
        r.post('/login', authLimiter, async (req, res) => {
            const { email, password } = req.body;
            if (!email || !password)
                return res.status(400).json({ error: 'email and password are required' });
            if (!this.adapter)
                return res.status(503).json({ error: 'No database adapter configured' });

            try {
                const user  = await this.adapter.getUserByEmail(email);
                const valid = user && await this.adapter.verifyPassword(user, password);
                if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

                const accessToken  = generateToken(user, this.jwtOptions);
                const refreshToken = generateRefreshToken();
                if (this.adapter?.saveRefreshToken)
                    await this.adapter.saveRefreshToken(user.id, refreshToken, refreshExpiry());

                res.json({ accessToken, refreshToken, user: safeUser(user) });
            } catch (err) {
                console.error('[D-auth] Login error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── POST /refresh ────────────────────────────────────────────────────
        r.post('/refresh', authLimiter, async (req, res) => {
            const { refreshToken } = req.body;
            if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
            if (!this.adapter?.findRefreshToken)
                return res.status(503).json({ error: 'No adapter configured' });

            try {
                const record = await this.adapter.findRefreshToken(refreshToken);
                if (!record || new Date(record.expires_at) < new Date()) {
                    if (record) await this.adapter.deleteRefreshToken(refreshToken);
                    return res.status(401).json({ error: 'Refresh token invalid or expired' });
                }
                const user = await this.adapter.getUserById(record.user_id);
                if (!user) return res.status(401).json({ error: 'User not found' });

                res.json({ accessToken: generateToken(user, this.jwtOptions) });
            } catch (err) {
                console.error('[D-auth] Refresh error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── POST /logout ─────────────────────────────────────────────────────
        r.post('/logout', async (req, res) => {
            const { refreshToken } = req.body;
            if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
            try {
                if (this.adapter?.deleteRefreshToken)
                    await this.adapter.deleteRefreshToken(refreshToken);
                res.json({ message: 'Logged out successfully' });
            } catch (err) {
                console.error('[D-auth] Logout error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── POST /logout-all ─────────────────────────────────────────────────
        r.post('/logout-all', this._requireAuth.bind(this), async (req, res) => {
            try {
                if (this.adapter?.deleteAllUserRefreshTokens)
                    await this.adapter.deleteAllUserRefreshTokens(req.user.id);
                res.json({ message: 'All sessions revoked' });
            } catch (err) {
                console.error('[D-auth] Logout-all error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── GET /me ──────────────────────────────────────────────────────────
        r.get('/me', this._requireAuth.bind(this), async (req, res) => {
            try {
                let user = req.user;
                if (this.adapter?.getUserById) {
                    const db = await this.adapter.getUserById(req.user.id);
                    if (db) user = safeUser(db);
                }
                res.json({ user });
            } catch (err) {
                console.error('[D-auth] /me error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── POST /verify-email ───────────────────────────────────────────────
        r.post('/verify-email', authLimiter, this._requireAuth.bind(this), async (req, res) => {
            const { code } = req.body;
            if (!code) return res.status(400).json({ error: 'code is required' });
            if (!this.adapter?.consumeEmailVerification)
                return res.status(503).json({ error: 'Not supported by adapter' });
            try {
                const ok = await this.adapter.consumeEmailVerification(req.user.id, code);
                if (!ok) return res.status(400).json({ error: 'Invalid or expired verification code' });
                res.json({ message: 'Email verified successfully' });
            } catch (err) {
                console.error('[D-auth] Verify-email error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── POST /resend-verification ────────────────────────────────────────
        r.post('/resend-verification', strictLimiter, this._requireAuth.bind(this), async (req, res) => {
            try {
                const user = await this.adapter.getUserById(req.user.id);
                if (user?.is_email_verified)
                    return res.status(400).json({ error: 'Email is already verified' });

                const code = await this.adapter.createEmailVerification(user.id);
                await emailService.sendVerificationEmail(user.email, {
                    name: user.first_name || user.email, code, appName: this.appName,
                });
                res.json({ message: 'Verification email sent' });
            } catch (err) {
                console.error('[D-auth] Resend-verification error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── POST /forgot-password ────────────────────────────────────────────
        r.post('/forgot-password', strictLimiter, async (req, res) => {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'email is required' });
            try {
                const user = await this.adapter?.getUserByEmail(email);
                if (user && this.adapter?.createPasswordResetToken) {
                    const token    = await this.adapter.createPasswordResetToken(user.id);
                    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
                    try {
                        await emailService.sendPasswordResetEmail(email, {
                            name: user.first_name || email, resetUrl, appName: this.appName,
                        });
                    } catch (e) {
                        console.warn('[D-auth] Reset email failed:', e.message);
                    }
                }
                // Same response whether user exists or not — prevents enumeration
                res.json({ message: 'If that email exists, a reset link has been sent.' });
            } catch (err) {
                console.error('[D-auth] Forgot-password error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── POST /reset-password ─────────────────────────────────────────────
        r.post('/reset-password', strictLimiter, async (req, res) => {
            const { token, password } = req.body;
            if (!token || !password)
                return res.status(400).json({ error: 'token and password are required' });
            if (password.length < 8)
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            try {
                const record = await this.adapter?.consumePasswordResetToken(token);
                if (!record) return res.status(400).json({ error: 'Invalid or expired reset token' });

                await this.adapter.updatePassword(record.user_id, password);
                if (this.adapter?.deleteAllUserRefreshTokens)
                    await this.adapter.deleteAllUserRefreshTokens(record.user_id);

                res.json({ message: 'Password reset successfully. Please log in again.' });
            } catch (err) {
                console.error('[D-auth] Reset-password error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── PATCH /change-password (authenticated) ───────────────────────────
        r.patch('/change-password', this._requireAuth.bind(this), async (req, res) => {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword)
                return res.status(400).json({ error: 'currentPassword and newPassword are required' });
            if (newPassword.length < 8)
                return res.status(400).json({ error: 'Password must be at least 8 characters' });
            try {
                const user  = await this.adapter.getUserById(req.user.id);
                const valid = await this.adapter.verifyPassword(user, currentPassword);
                if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

                await this.adapter.updatePassword(user.id, newPassword);
                if (this.adapter?.deleteAllUserRefreshTokens)
                    await this.adapter.deleteAllUserRefreshTokens(user.id);

                res.json({ message: 'Password changed. Please log in again.' });
            } catch (err) {
                console.error('[D-auth] Change-password error:', err);
                res.status(500).json({ error: 'Server error' });
            }
        });

        // ── OAuth failure fallback ────────────────────────────────────────────
        r.get('/failure', (req, res) =>
            res.status(401).json({ error: 'OAuth authentication failed' })
        );

        // ── OAuth plugins ─────────────────────────────────────────────────────
        for (const plugin of this.plugins) {
            plugin.registerStrategy(this.passport);
            plugin.registerRoutes(this.router, this.passport, {
                onSuccess: (rawProfile, res, req) =>
                    this._handleOAuthSuccess(rawProfile, plugin, res, req),
                onFailure: this.onFailure ||
                    ((err, res) => res.status(401).json({ error: 'OAuth authentication failed' })),
            });
        }
    }
}

module.exports = { AuthManager };
