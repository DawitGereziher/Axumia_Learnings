const BasePlugin = require('./BasePlugin');
const MicrosoftStrategy = require('passport-microsoft').Strategy;

class MicrosoftPlugin extends BasePlugin {
    get name() { return 'microsoft'; }

    registerStrategy(passport) {
        const isConfigured = this.options.clientID && this.options.clientSecret && !this.options.clientID.includes('mock') && !this.options.clientID.includes('change-me');
        if (!isConfigured) return;

        passport.use(new MicrosoftStrategy({
            clientID:     this.options.clientID,
            clientSecret: this.options.clientSecret,
            callbackURL:  this.options.callbackURL,
            scope:        ['user.read'],
            passReqToCallback: true,
        }, (req, accessToken, refreshToken, profile, done) => done(null, profile)));
    }

    registerRoutes(router, passport, callbacks) {
        const isMock = process.env.ALLOW_MOCK_AUTH === 'true' && (!this.options.clientID || this.options.clientID.includes('mock') || this.options.clientID.includes('change-me'));
        const isConfigured = this.options.clientID && this.options.clientSecret && !this.options.clientID.includes('mock') && !this.options.clientID.includes('change-me');

        if (isConfigured) {
            router.get('/microsoft',
                passport.authenticate('microsoft', { session: false })
            );

            router.get('/microsoft/callback',
                passport.authenticate('microsoft', { session: false, failureRedirect: '/auth/failure' }),
                (req, res) => callbacks.onSuccess(req.user, res, req)
            );
        } else if (isMock) {
            router.get('/microsoft', (req, res) => {
                const mockProfile = {
                    id: 'mock-microsoft-user-id-54321',
                    displayName: 'Aster Microsoft',
                    emails: [{ value: 'aster.microsoft@example.com' }],
                    provider: 'microsoft',
                    photos: [{ value: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' }],
                };
                callbacks.onSuccess(mockProfile, res, req);
            });
            router.get('/microsoft/callback', (req, res) => {
                res.redirect('/');
            });
        } else {
            router.get('/microsoft', (req, res) => {
                res.status(400).json({ error: 'Microsoft OAuth is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in backend/.env' });
            });
            router.get('/microsoft/callback', (req, res) => {
                res.status(400).json({ error: 'Microsoft OAuth is not configured.' });
            });
        }
    }
}

module.exports = MicrosoftPlugin;
