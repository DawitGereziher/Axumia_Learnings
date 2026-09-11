const BasePlugin = require('./BasePlugin');
const AppleStrategy = require('passport-apple');

/**
 * Apple Sign-In Plugin
 * Required options:
 *   clientID        — your Apple Service ID (e.g. com.yourapp.auth)
 *   teamID          — your Apple Developer Team ID
 *   keyID           — your Apple private key ID
 *   privateKeyPath  — absolute path to your .p8 private key file
 *   callbackURL     — POST callback URL (Apple always POSTs)
 */
class ApplePlugin extends BasePlugin {
    constructor(options = {}) {
        if (!options.callbackURL) throw new Error('ApplePlugin requires callbackURL');
        super(options);
    }

    get name() { return 'apple'; }

    registerStrategy(passport) {
        const isConfigured = this.options.clientID && !this.options.clientID.includes('mock') && !this.options.clientID.includes('change-me');
        if (!isConfigured) return;
        try {
            passport.use(new AppleStrategy({
                clientID:            this.options.clientID,
                teamID:              this.options.teamID,
                keyID:               this.options.keyID,
                privateKeyLocation:  this.options.privateKeyPath,
                callbackURL:         this.options.callbackURL,
                scope:               ['name', 'email'],
                passReqToCallback:   true,
            }, (req, accessToken, refreshToken, idToken, profile, done) => {
                const normalised = {
                    id:          profile.id || idToken.sub,
                    provider:    'apple',
                    emails:      profile.email ? [{ value: profile.email }] : [],
                    displayName: profile.name
                        ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim()
                        : '',
                    photos:      [],
                };
                return done(null, normalised);
            }));
        } catch (e) {
            console.error('Failed to initialize real Apple strategy:', e.message);
        }
    }

    registerRoutes(router, passport, callbacks) {
        const isMock = process.env.ALLOW_MOCK_AUTH === 'true' && (!this.options.clientID || this.options.clientID.includes('mock') || this.options.clientID.includes('change-me'));
        const isConfigured = this.options.clientID && !this.options.clientID.includes('mock') && !this.options.clientID.includes('change-me');

        if (isConfigured) {
            router.get('/apple',
                passport.authenticate('apple', { session: false })
            );

            router.post('/apple/callback',
                passport.authenticate('apple', { session: false, failureRedirect: '/auth/failure' }),
                (req, res) => callbacks.onSuccess(req.user, res, req)
            );
        } else if (isMock) {
            router.get('/apple', (req, res) => {
                const mockProfile = {
                    id: 'mock-apple-user-id-54321',
                    displayName: 'Selam Apple',
                    emails: [{ value: 'selam.apple@example.com' }],
                    provider: 'apple',
                    photos: [],
                };
                callbacks.onSuccess(mockProfile, res, req);
            });
            router.get('/apple/callback', (req, res) => { res.redirect('/'); });
            router.post('/apple/callback', (req, res) => { res.redirect('/'); });
        } else {
            router.get('/apple', (req, res) => {
                res.status(400).json({ error: 'Apple OAuth is not configured. Please set APPLE_CLIENT_ID in backend/.env' });
            });
            router.get('/apple/callback', (req, res) => { res.status(400).json({ error: 'Apple OAuth is not configured.' }); });
            router.post('/apple/callback', (req, res) => { res.status(400).json({ error: 'Apple OAuth is not configured.' }); });
        }
    }
}

module.exports = ApplePlugin;
