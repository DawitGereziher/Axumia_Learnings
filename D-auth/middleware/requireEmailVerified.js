/**
 * requireEmailVerified — Express middleware that blocks unverified users.
 *
 * Usage (always pair with checkJwt first):
 *   router.get('/sensitive', checkJwt, requireEmailVerified, handler)
 */
function requireEmailVerified(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!req.user.isEmailVerified) {
        return res.status(403).json({
            error: 'Email not verified. Please verify your email before accessing this resource.',
            code: 'EMAIL_NOT_VERIFIED',
        });
    }
    next();
}

module.exports = requireEmailVerified;
