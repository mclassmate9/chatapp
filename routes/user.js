const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// ✅ Login Route
router.post('/login', async (req, res) => {
  const { userId, password, remember } = req.body;

  try {
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(400).send('Invalid User ID or Password');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).send('Invalid User ID or Password');
    }

    // Successful login
    req.session.username = userId;

    if (remember) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    } else {
      req.session.cookie.expires = false; // session cookie
    }

    return res.redirect('/chat.html');
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).send('Server error');
  }
});

// Get approved contacts for the logged-in user
router.get('/approved', async (req, res) => {
  if (!req.session.username) return res.status(401).json({ message: 'Not logged in' });

  try {
    const user = await User.findOne({ userId: req.session.username });

    const approved = user.contacts
      .filter(c => c.status === 'approved')
      .map(c => c.userId);

    res.json(approved);
  } catch (err) {
    console.error('Error fetching approved contacts:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
