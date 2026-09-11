const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AppleStrategy = require('passport-apple');
const { findUserByEmail, createUser } = require('../models/user');
const { generateToken } = require('../utils/jwt');


//google strategy

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Step 1: Check if OAuth account exists
        let user = await findUserByProvider(profile.id, 'google');

        if (user) {
          // OAuth account exists → allow login
          return done(null, user);
        }

        // Step 2: Check if email exists as local account
        const emailExists = await findUserByEmail(profile.emails[0].value);
        if (emailExists) {
          // Email already registered as local → deny OAuth login
          return done(null, false, { message: 'Email already registered. Please use local login.' });
        }

        // Step 3: Email not used → create new OAuth-only user
        user = await createUser({
          email: profile.emails[0].value,
          first_name: profile.name.givenName,
          last_name: profile.name.familyName,
          provider: 'google',
          provider_id: profile.id,
          password: crypto.randomBytes(20).toString('hex'), // unused
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// routes/auth.js
router.post('/link-oauth', checkJwt, async (req, res) => {
  const { provider, provider_id } = req.body;

  // Verify provider_id is not linked to another user
  const existing = await findUserByProvider(provider_id, provider);
  if (existing) return res.status(400).json({ message: 'OAuth account already linked' });

  // Link OAuth account to logged-in user
  await linkOauthToUser(req.user.id, provider, provider_id);
  res.json({ message: 'OAuth account linked successfully' });
});


//facebook strategy

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: '/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name'], // get email and name
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Step 1: Check if OAuth account exists
        let user = await findUserByProvider(profile.id, 'facebook');
        if (user) return done(null, user);

        // Step 2: Check if email exists as local user
        if (profile.emails && profile.emails.length > 0) {
          const emailExists = await findUserByEmail(profile.emails[0].value);
          if (emailExists) {
            return done(null, false, { message: 'Email already registered. Use local login.' });
          }
        }

        // Step 3: Create new OAuth-only user
        user = await createUser({
          email: profile.emails[0].value,
          first_name: profile.name.givenName,
          last_name: profile.name.familyName,
          provider: 'facebook',
          provider_id: profile.id,
          password: crypto.randomBytes(20).toString('hex'),
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);



//apple strategy

passport.use(
  new AppleStrategy(
    {
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
      callbackURL: '/auth/apple/callback',
      scope: ['name', 'email'],
    },
    async (accessToken, refreshToken, idToken, profile, done) => {
      try {
        let user = await findUserByProvider(profile.id, 'apple');
        if (user) return done(null, user);

        // Apple may not return email every time
        if (profile.email) {
          const emailExists = await findUserByEmail(profile.email);
          if (emailExists) {
            return done(null, false, { message: 'Email already registered. Use local login.' });
          }
        }

        user = await createUser({
          email: profile.email || null,
          first_name: profile.name?.firstName || '',
          last_name: profile.name?.lastName || '',
          provider: 'apple',
          provider_id: profile.id,
          password: crypto.randomBytes(20).toString('hex'),
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);




passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: process.env.MICROSOFT_CALLBACK_URL,
      scope: ['user.read'], // basic profile info
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        // Step 1: Check existing Microsoft user
        let user = await findUserByProvider(profile.id, 'microsoft');
        if (user) return done(null, user);

        // Step 2: If email exists as local → block
        if (email) {
          const existingEmail = await findUserByEmail(email);
          if (existingEmail) {
            return done(null, false, {
              message: 'Email already registered. Please use your original login method.',
            });
          }
        }

        // Step 3: Create new OAuth user
        user = await createUser({
          email: email || null,
          first_name: profile.name?.givenName || '',
          last_name: profile.name?.familyName || '',
          provider: 'microsoft',
          provider_id: profile.id,
          password: require('crypto').randomBytes(20).toString('hex'),
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);


passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await require('../models/user').findUserById(id);
  done(null, user);
});

module.exports = passport;