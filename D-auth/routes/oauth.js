const express = require('express');
const passport = require('../config/passport');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

// Initiate Google login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback from Google
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failure' }),
    (req, res) => {
        const token = generateToken(req.user);
        // Send JWT to client, can redirect with token as query param
        res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
    }
);

router.get('/google/failure', (req, res) => {
    res.status(401).json({ message: 'Google login failed' });
});


// Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get(
    '/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: '/auth/failure' }),
    (req, res) => {
        const token = generateToken(req.user);
        res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
    }
);

// Apple
router.get('/apple', passport.authenticate('apple'));
router.post(
    '/apple/callback',
    passport.authenticate('apple', { session: false, failureRedirect: '/auth/failure' }),
    (req, res) => {
        const token = generateToken(req.user);
        res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
    }
);


// routes/oauth.js

// Microsoft login
router.get('/microsoft', passport.authenticate('microsoft'));

router.get(
  '/microsoft/callback',
  passport.authenticate('microsoft', {
    session: false,
    failureRedirect: '/auth/failure',
  }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
  }
);

router.get('/failure', (req, res) => res.status(401).json({ message: 'OAuth login failed' }));

module.exports = router;