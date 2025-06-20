// models/User.js
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  contacts: [{ type: String }] // store contact userIds
});


module.exports = mongoose.model('User', userSchema);
