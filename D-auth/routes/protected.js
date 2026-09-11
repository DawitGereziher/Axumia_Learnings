// routes/protected.js
const express = require('express');
const checkJwt = require('../middleware/checkJwt');

const router = express.Router();

router.get('/', checkJwt, (req, res) => {
  res.json({ message: 'You are authorized!', user: req.user });
});

module.exports = router;