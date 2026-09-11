/**
 * D-auth Demo Server
 * This is a standalone reference implementation.
 * In production, import D-auth as a module into your NestJS/Express app instead.
 */
require('dotenv').config();

const express      = require('express');
const { AuthManager }  = require('./core/AuthManager');
const PgAdapter        = require('./adapters/PgAdapter');
const pool             = require('./config/db');
const GooglePlugin     = require('./plugins/GooglePlugin');
const FacebookPlugin   = require('./plugins/FacebookPlugin');
const MicrosoftPlugin  = require('./plugins/MicrosoftPlugin');
// ApplePlugin requires real .p8 key — enable when credentials are ready
// const ApplePlugin = require('./plugins/ApplePlugin');

const app = express();
app.use(express.json());

const dAuth = new AuthManager({
    adapter:  new PgAdapter(pool),
    appName:  'Ethio Learn',
    jwt:      { accessTokenExpiry: '15m' },
    cors:     { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
    plugins: [
        new GooglePlugin({
            clientID:    process.env.GOOGLE_CLIENT_ID     || 'REPLACE_ME',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'REPLACE_ME',
            callbackURL: process.env.GOOGLE_CALLBACK_URL  || 'http://localhost:3001/auth/google/callback',
        }),
        new FacebookPlugin({
            clientID:    process.env.FACEBOOK_CLIENT_ID     || 'REPLACE_ME',
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET || 'REPLACE_ME',
            callbackURL: process.env.FACEBOOK_CALLBACK_URL  || 'http://localhost:3001/auth/facebook/callback',
        }),
        new MicrosoftPlugin({
            clientID:    process.env.MICROSOFT_CLIENT_ID     || 'REPLACE_ME',
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'REPLACE_ME',
            callbackURL: process.env.MICROSOFT_CALLBACK_URL  || 'http://localhost:3001/auth/microsoft/callback',
        }),
    ],
});

app.use('/auth', dAuth.router);

app.get('/', (req, res) => {
    res.json({
        module: 'D-auth',
        endpoints: [
            'POST /auth/register',
            'POST /auth/login',
            'POST /auth/refresh',
            'POST /auth/logout',
            'POST /auth/logout-all',
            'GET  /auth/me',
            'POST /auth/verify-email',
            'POST /auth/resend-verification',
            'POST /auth/forgot-password',
            'POST /auth/reset-password',
            'PATCH /auth/change-password',
            'GET  /auth/google',
            'GET  /auth/facebook',
            'GET  /auth/microsoft',
            'GET  /auth/health',
        ],
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[D-auth] Demo server running on http://localhost:${PORT}`));
