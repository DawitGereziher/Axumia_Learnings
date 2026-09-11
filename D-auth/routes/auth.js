const express = require('express');
const { createUser, findUserByEmail, verifyPassword } = require('../models/user');
const { generateToken } = require('../utils/jwt');
const { generateRefreshToken } = require('../utils/refreshToken');
const { saveRefreshToken, findRefreshToken, deleteRefreshToken } = require('../models/refreshToken');

const router = express.Router();

// login updated
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await verifyPassword(user, password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

    await saveRefreshToken(user.id, refreshToken, expiresAt);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// refresh endpoint
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const tokenRecord = await findRefreshToken(refreshToken);
    if (!tokenRecord) return res.status(401).json({ message: 'Invalid refresh token' });

    if (new Date(tokenRecord.expires_at) < new Date()) {
      await deleteRefreshToken(refreshToken);
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const userQuery = await require('../models/user').findUserByEmail(
      (await require('../config/db').query('SELECT email FROM users WHERE id = $1', [tokenRecord.user_id])).rows[0].email
    );

    const newAccessToken = generateToken(userQuery);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// logout (revoke refresh token)
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    await deleteRefreshToken(refreshToken);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;