const jwt = require('jsonwebtoken');

function getSecret() {
    return process.env.JWT_SECRET || 'dev-super-secret-change-in-production';
}

/**
 * Generate a signed JWT access token.
 * Payload includes: id, email, name, role, is_email_verified
 */
function generateToken(user, options = {}) {
    if (!user) return null;

    const name = user.name ||
        ([user.first_name, user.last_name].filter(Boolean).join(' ').trim()) ||
        user.email ||
        'User';

    const payload = {
        id: user.id,
        email: user.email,
        name,
        role: user.role || 'student',
        isEmailVerified: user.is_email_verified || false,
    };

    const expiresIn = options.accessTokenExpiry || process.env.JWT_EXPIRES_IN || '15m';

    return jwt.sign(payload, getSecret(), {
        expiresIn,
        issuer: 'd-auth',
    });
}

/**
 * Verify a JWT. Returns decoded payload or null on failure.
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, getSecret(), { issuer: 'd-auth' });
    } catch {
        return null;
    }
}

module.exports = { generateToken, verifyToken };
