const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  contacts: [{ type: String }] // 👈 ADD THIS LINE
});

module.exports = mongoose.model('User', userSchema);
