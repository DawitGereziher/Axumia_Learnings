const BasePlugin = require('./BasePlugin');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

class GooglePlugin extends BasePlugin {
    get name() { return 'google'; }

    registerStrategy(passport) {
        const isConfigured = this.options.clientID && this.options.clientSecret && !this.options.clientID.includes('mock') && !this.options.clientID.includes('change-me');
        if (!isConfigured) return;

        passport.use(new GoogleStrategy({
            clientID:     this.options.clientID,
            clientSecret: this.options.clientSecret,
            callbackURL:  this.options.callbackURL,
            passReqToCallback: true,
        }, (req, accessToken, refreshToken, profile, done) => done(null, profile)));
    }

    registerRoutes(router, passport, callbacks) {
        const isMock = process.env.ALLOW_MOCK_AUTH === 'true' && (!this.options.clientID || this.options.clientID.includes('mock') || this.options.clientID.includes('change-me'));
        const isConfigured = this.options.clientID && this.options.clientSecret && !this.options.clientID.includes('mock') && !this.options.clientID.includes('change-me');

        if (isConfigured) {
            router.get('/google',
                passport.authenticate('google', { scope: ['profile', 'email'], session: false })
            );

            router.get('/google/callback',
                passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
                (req, res) => callbacks.onSuccess(req.user, res, req)
            );
        } else if (isMock) {
            router.get('/google', (req, res) => {
                const mockProfile = {
                    id: 'mock-google-user-id-54321',
                    displayName: 'Abebe Google',
                    emails: [{ value: 'abebe.google@example.com' }],
                    provider: 'google',
                    photos: [{ value: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' }],
                };
                callbacks.onSuccess(mockProfile, res, req);
            });
            router.get('/google/callback', (req, res) => {
                res.redirect('/');
            });
        } else {
            router.get('/google', (req, res) => {
                res.status(400).json({ error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env' });
            });
            router.get('/google/callback', (req, res) => {
                res.status(400).json({ error: 'Google OAuth is not configured.' });
            });
        }
    }
}

module.exports = GooglePlugin;
