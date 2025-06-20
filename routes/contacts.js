// routes/contacts.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Add a new contact
router.post('/api/contacts/add', async (req, res) => {
  const { contactId } = req.body;
  const userId = req.session.username;

  if (!userId) return res.status(401).send('Unauthorized');

  try {
    const contact = await User.findOne({ userId: contactId });
    if (!contact) return res.status(404).send('Contact not found');

    await User.updateOne(
      { userId },
      { $addToSet: { contacts: contactId } } // prevent duplicates
    );

    res.status(200).send('Contact added');
  } catch (err) {
    console.error('Add Contact Error:', err);
    res.status(500).send('Server error');
  }
});

// Get user's contacts
router.get('/api/contacts', async (req, res) => {
  const userId = req.session.username;

  if (!userId) return res.status(401).send('Unauthorized');

  try {
    const user = await User.findOne({ userId });
    res.json(user.contacts || []);
  } catch (err) {
    console.error('Fetch Contacts Error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
