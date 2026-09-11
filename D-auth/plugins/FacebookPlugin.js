const BasePlugin = require('./BasePlugin');
const FacebookStrategy = require('passport-facebook').Strategy;

class FacebookPlugin extends BasePlugin {
    get name() { return 'facebook'; }

    registerStrategy(passport) {
        const isConfigured = this.options.clientID && this.options.clientSecret && !this.options.clientID.includes('mock') && !this.options.clientID.includes('change-me');
        if (!isConfigured) return;

        passport.use(new FacebookStrategy({
            clientID:     this.options.clientID,
            clientSecret: this.options.clientSecret,
            callbackURL:  this.options.callbackURL,
            profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
            passReqToCallback: true,
        }, (req, accessToken, refreshToken, profile, done) => done(null, profile)));
    }

    registerRoutes(router, passport, callbacks) {
        const isMock = process.env.ALLOW_MOCK_AUTH === 'true' && (!this.options.clientID || this.options.clientID.includes('mock') || this.options.clientID.includes('change-me'));
        const isConfigured = this.options.clientID && this.options.clientSecret && !this.options.clientID.includes('mock') && !this.options.clientID.includes('change-me');

        if (isConfigured) {
            router.get('/facebook',
                passport.authenticate('facebook', { scope: ['email'], session: false })
            );

            router.get('/facebook/callback',
                passport.authenticate('facebook', { session: false, failureRedirect: '/auth/failure' }),
                (req, res) => callbacks.onSuccess(req.user, res, req)
            );
        } else if (isMock) {
            router.get('/facebook', (req, res) => {
                const mockProfile = {
                    id: 'mock-facebook-user-id-54321',
                    displayName: 'Chala Facebook',
                    emails: [{ value: 'chala.facebook@example.com' }],
                    provider: 'facebook',
                    photos: [{ value: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d' }],
                };
                callbacks.onSuccess(mockProfile, res, req);
            });
            router.get('/facebook/callback', (req, res) => {
                res.redirect('/');
            });
        } else {
            router.get('/facebook', (req, res) => {
                res.status(400).json({ error: 'Facebook OAuth is not configured. Please set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET in backend/.env' });
            });
            router.get('/facebook/callback', (req, res) => {
                res.status(400).json({ error: 'Facebook OAuth is not configured.' });
            });
        }
    }
}

module.exports = FacebookPlugin;
