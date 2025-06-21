// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: String,       // sender's userId
  to: String,         // receiver's userId
  text: String,
  time: { type: Date, default: Date.now, expires: 345600 }, // auto-delete after 4 days
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent'
  }
});

module.exports = mongoose.model('Message', messageSchema);