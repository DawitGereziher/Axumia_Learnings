const crypto = require('crypto');

/** Generate a cryptographically secure opaque refresh token */
function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

module.exports = { generateRefreshToken };