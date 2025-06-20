const express = require('express');
const router = express.Router();

// Get currently logged-in user info
router.get('/api/user', (req, res) => {
  if (!req.session.username) {
    return res.status(403).json({});
  }
  res.json({ username: req.session.username });
});

module.exports = router;
