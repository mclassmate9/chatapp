const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');


// Register route
router.post('/register', async (req, res) => {
  const { userId, password, email } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ userId }, { email }] });
    if (existingUser) {
      return res.status(400).send('User ID or Email already registered.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ userId, password: hashedPassword, email });
    await newUser.save();

    req.session.username = userId;
    res.redirect('/protected/chat.html');
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).send('Server error');
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { username, password, remember } = req.body;

  try {
    const user = await User.findOne({ userId: username });
    if (!user) return res.send('<h3>User not found. <a href="/login.html">Try again</a></h3>');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send('<h3>Invalid credentials. <a href="/login.html">Try again</a></h3>');

    req.session.username = username;

    if (remember) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
    } else {
      req.session.cookie.expires = false;
    }

    res.redirect('/chat.html');
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).send('Server error');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

module.exports = router;
