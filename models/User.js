const bcrypt = require('bcrypt');

app.post('/register', async (req, res) => {
  const { userId, password, email } = req.body;

  try {
    // Check if userId or email already exists
    const existingUser = await User.findOne({ $or: [{ userId }, { email }] });
    if (existingUser) {
      return res.status(400).send('User ID or Email already registered.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      userId,
      password: hashedPassword,
      email,
    });

    await newUser.save();

    // You can optionally log them in immediately:
    req.session.username = userId;

    res.redirect('/chat.html'); // or send a success response
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).send('Server error');
  }
});