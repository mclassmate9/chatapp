const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ✅ Send a contact request
router.post('/request', async (req, res) => {
  const fromUser = req.session.username;
  const toUserId = req.body.to;

  if (!fromUser || !toUserId || fromUser === toUserId) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const from = await User.findOne({ userId: fromUser });
    const to = await User.findOne({ userId: toUserId });

    if (!to) return res.status(404).json({ message: 'User not found' });

    // Check if already exists
    const alreadyRequested = to.contacts.find(c => c.userId === fromUser);
    if (alreadyRequested) return res.status(409).json({ message: 'Request already sent or exists' });

    // Add contact to sender
from.contacts.push({ userId: toUserId, status: 'pending', sentBy: fromUser });
await from.save();

// Add contact to receiver
to.contacts.push({ userId: fromUser, status: 'pending', sentBy: fromUser }); // <= this line is key
await to.save();

    res.status(200).json({ message: 'Contact request sent' });
  } catch (err) {
    console.error('Contact request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Accept a contact request
router.post('/accept', async (req, res) => {
  const currentUser = req.session.username;
  const requester = req.body.from;

  if (!currentUser || !requester || currentUser === requester) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const user = await User.findOne({ userId: currentUser });
    const sender = await User.findOne({ userId: requester });

    if (!user || !sender) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find or add contact on current user's side
    let contactA = user.contacts.find(c => c.userId === requester);
    if (!contactA) {
      contactA = { userId: requester, status: 'approved' };
      user.contacts.push(contactA);
    } else {
      contactA.status = 'approved';
    }

    // Find or add contact on requester's side
    let contactB = sender.contacts.find(c => c.userId === currentUser);
    if (!contactB) {
      contactB = { userId: currentUser, status: 'approved' };
      sender.contacts.push(contactB);
    } else {
      contactB.status = 'approved';
    }

    await user.save();
    await sender.save();

    res.status(200).json({ message: 'Contact approved successfully' });
  } catch (err) {
    console.error('Accept error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Reject a contact request
router.post('/reject', async (req, res) => {
  const currentUser = req.session.username;
  const requester = req.body.from;

  if (!currentUser || !requester) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const user = await User.findOne({ userId: currentUser });
    const sender = await User.findOne({ userId: requester });

    if (!user) return res.status(404).json({ message: 'Current user not found' });

    // Remove requester from current user's contacts
    user.contacts = user.contacts.filter(c => c.userId !== requester);
    await user.save();

    // If sender exists, remove currentUser from their contacts
    if (sender) {
      sender.contacts = sender.contacts.filter(c => c.userId !== currentUser);
      await sender.save();
    }

    res.status(200).json({ message: 'Contact request rejected successfully' });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



// ✅ Get approved contacts
router.get('/list', async (req, res) => {
  const username = req.session.username;

  if (!username) return res.status(403).json({ message: 'Unauthorized' });

  try {
    const user = await User.findOne({ userId: username });
    const approvedContacts = user.contacts
      .filter(c => c.status === 'approved')
      .map(c => c.userId);

    res.json({ contacts: approvedContacts });
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get incoming pending requests
router.get('/pending', async (req, res) => {
  const currentUser = req.session.username;
  if (!currentUser) return res.status(403).json({ message: 'Unauthorized' });

  try {
    const user = await User.findOne({ userId: currentUser });
    const pending = user.contacts
      .filter(c => c.status === 'pending')
      .map(c => c.userId);

    res.json({ pending });
  } catch (err) {
    console.error('Pending fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get full contact list with status and who sent it
router.get('/full', async (req, res) => {
  const username = req.session.username;
  if (!username) return res.status(403).json({ message: 'Unauthorized' });

  try {
    const user = await User.findOne({ userId: username });

    const fullContacts = user.contacts.map(contact => ({
      userId: contact.userId,
      status: contact.status,
      sentBy: contact.status === 'pending' && contact.userId !== username ? contact.userId : username
    }));

    res.json({ contacts: fullContacts });
  } catch (err) {
    console.error('Full contact list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;