const express = require('express');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
require('dotenv').config();
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1);
});

// ✅ Mongo Session Store
const sessionMiddleware = session({
  secret: 'chatSecretKey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: null }
});

// ✅ Message Schema
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' }
});
const Message = mongoose.model('Message', messageSchema);



// ✅ Middleware
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));
app.use(authRoutes);


// ✅ Register API Route
const bcrypt = require('bcrypt');
const User = require('./models/User'); // make sure this file exists

app.post('/api/register', async (req, res) => {
  const { userId, password, email } = req.body;

  if (!userId || !password || !email) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const existingUser = await User.findOne({ userId });
  if (existingUser) {
    return res.status(409).json({ message: 'User ID already taken.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    userId,
    password: hashedPassword,
    email
  });

  await newUser.save();

  res.status(201).json({ message: 'User registered successfully.' });
});

// ✅ Routes
app.post('/login', async (req, res) => {
  const { username, password, remember } = req.body;

  try {
    // Look up user in the database
    const user = await User.findOne({ userId: username });

    if (!user) {
      return res.send('<h3>User not found. <a href="/login.html">Try again</a></h3>');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send('<h3>Incorrect password. <a href="/login.html">Try again</a></h3>');
    }

    // Set session
    req.session.username = user.userId;
    req.session.cookie.maxAge = remember ? 1000 * 60 * 60 * 24 * 30 : null;
    return res.redirect('/chat.html');

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send('<h3>Server error. <a href="/login.html">Try again</a></h3>');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

app.get('/api/user', (req, res) => {
  if (!req.session.username) return res.status(403).json({});
  res.json({ username: req.session.username });
});

// ✅ Apply session to socket
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// ✅ Online user tracking
const onlineUsers = new Set();

io.on('connection', async (socket) => {
  const session = socket.request.session;
  if (!session.username) {
    socket.emit('not-authenticated');
    return socket.disconnect();
  }

  const username = session.username;
  console.log(`${username} connected`);
  onlineUsers.add(username);
  socket.broadcast.emit('user-online', username);

  // Send chat history
  const messages = await Message.find().sort({ time: 1 });
  socket.emit('chat history', messages);

  // ✅ New message
  socket.on('chat message', async (text) => {
    const newMsg = new Message({ user: username, text, status: 'sent' });
    await newMsg.save();
    io.emit('chat message' , newMsg);
  });

  // ✅ Message deleted
  socket.on('delete message', async (msgId) => {
    const msg = await Message.findById(msgId);
    if (msg && msg.user === username) {
      await Message.deleteOne({ _id: msgId });
      const updatedMessages = await Message.find().sort({ time: 1 });
      io.emit('chat history', updatedMessages);
    }
  });

  socket.on('message delivered', async (msgId) => {
    const msg = await Message.findById(msgId);
    if (msg && msg.status === 'sent') {
      msg.status = 'delivered';
      await msg.save();
      io.emit('message status update', msg);
    }
  });

  // ✅ Message seen
  socket.on('message seen', async (msgId) => {
    const msg = await Message.findById(msgId);
    if (msg && msg.status !== 'seen') {
      msg.status = 'seen';
      await msg.save();
      io.emit('message status update', { msgId, status: 'seen' });
    }
  });

   // ✅ Typing indicator
  socket.on('typing', () => {
    socket.broadcast.emit('typing', username);
  });

  // ✅ Manual status update (for testing/expansion)
  socket.on('update status', async ({ msgId, status }) => {
    if (['sent', 'delivered', 'seen'].includes(status)) {
      await Message.findByIdAndUpdate(msgId, { status });
      io.emit('message status update', { msgId, status });
    }
  });

  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
    onlineUsers.delete(username);
    socket.broadcast.emit('user-offline', username);
  });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).send("Internal Server Error");
});

// ✅ Server start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
