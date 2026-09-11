/**
 * D-auth — Public Module Entrypoint
 *
 * Usage inside NestJS / Express:
 *
 *   const { AuthManager, PgAdapter, GooglePlugin, middleware } = require('../D-auth');
 *
 *   const dAuth = new AuthManager({
 *     adapter: new PgAdapter(pool),
 *     plugins: [new GooglePlugin({ ... })],
 *     appName: 'Ethio Learn',
 *   });
 *
 *   // In Express / NestJS main.ts:
 *   app.use('/auth', dAuth.router);
 *
 *   // Protecting routes:
 *   router.get('/private', middleware.checkJwt, middleware.checkRole(['instructor']), handler);
 *
 *   // Validating tokens from other services (SSO):
 *   const { verifyToken } = require('../D-auth').utils;
 *   const payload = verifyToken(token); // { id, email, role, isEmailVerified, ... }
 */

const { AuthManager }          = require('./core/AuthManager');
const BaseAdapter              = require('./core/BaseAdapter');
const BasePlugin               = require('./plugins/BasePlugin');
const PgAdapter                = require('./adapters/PgAdapter');
const GooglePlugin             = require('./plugins/GooglePlugin');
const FacebookPlugin           = require('./plugins/FacebookPlugin');
const ApplePlugin              = require('./plugins/ApplePlugin');
const MicrosoftPlugin          = require('./plugins/MicrosoftPlugin');
const checkJwt                 = require('./middleware/checkJwt');
const checkRole                = require('./middleware/checkRole');
const requireEmailVerified     = require('./middleware/requireEmailVerified');
const { generateToken, verifyToken } = require('./utils/jwt');
const pool                     = require('./config/db');

module.exports = {
    // Core classes
    AuthManager,
    BaseAdapter,
    BasePlugin,

    // Adapters
    PgAdapter,

    // Plugins
    GooglePlugin,
    FacebookPlugin,
    ApplePlugin,
    MicrosoftPlugin,

    // Middleware (use directly in Express/NestJS routes)
    middleware: {
        checkJwt,
        checkRole,
        requireEmailVerified,
    },

    // JWT utilities (for SSO validation in consumer services)
    utils: {
        generateToken,
        verifyToken,
    },

    // Shared pg pool (optional — consumer can provide their own)
    pool,
};
