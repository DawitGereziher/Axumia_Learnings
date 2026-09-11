/**
 * checkRole — Express middleware factory for role-based access control.
 *
 * Usage:
 *   router.get('/instructor-only', checkJwt, checkRole(['instructor', 'admin']), handler)
 *
 * Must be used AFTER checkJwt (requires req.user to be populated).
 */
function checkRole(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized — no user context' });
        }
        const userRole = req.user.role || 'student';
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: `Forbidden — requires one of: [${allowedRoles.join(', ')}]`,
            });
        }
        next();
    };
}

module.exports = checkRole;