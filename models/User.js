const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' }
});

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  
contacts: [
  {
    userId: String,
    status: {
      type: String,
      enum: ['pending', 'approved'],
      default: 'pending',
    },
  }
],
});

pendingRequests: [
  {
    userId: String,
    date: { type: Date, default: Date.now }
  }
]

module.exports = mongoose.model('User', userSchema);