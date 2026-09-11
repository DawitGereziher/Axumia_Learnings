/**
 * checkJwt — Express middleware to validate D-auth JWT tokens.
 * Accepts tokens via:
 *   - Authorization: Bearer <token>   (standard)
 *   - x-auth-token: <token>           (alternative header)
 *
 * On success: populates req.user with { id, email, name, role, isEmailVerified }
 */
const { verifyToken } = require('../utils/jwt');

function checkJwt(req, res, next) {
    const authHeader = req.headers['authorization'];
    const altHeader  = req.headers['x-auth-token'];

    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else if (altHeader) {
        token = altHeader;
    }

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
}

module.exports = checkJwt;