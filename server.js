const express = require('express');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const protectRoutes = require('./routes/protect');
const contactRoutes = require('./routes/contacts');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ✅ Session setup
const sessionMiddleware = session({
  secret: 'chatSecretKey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    sameSite: 'lax'
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionMiddleware);

// ✅ Share session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// ✅ Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/protected', protectRoutes, express.static(path.join(__dirname, 'public/protected')));

// ✅ Redirect root to register
app.get('/', (req, res) => res.redirect('/register.html'));

// ✅ Route setup
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/protect', protectRoutes);
app.use('/contacts', contactRoutes);

// ✅ Register route
app.post('/api/register', async (req, res) => {
  const { userId, password, email } = req.body;

  if (!userId || !password || !email) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const existingUser = await User.findOne({ $or: [{ userId }, { email }] });
  if (existingUser) {
    return res.status(409).json({ message: 'User ID or Email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({ userId, password: hashedPassword, email });
  await newUser.save();

  res.status(201).json({ message: 'User registered successfully.' });
});

// ✅ Login route
app.post('/login', async (req, res) => {
  const { username, password, remember } = req.body;

  try {
    const user = await User.findOne({ userId: username });
    if (!user) {
      return res.send('<h3>User not found. <a href="/login.html">Try again</a></h3>');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send('<h3>Incorrect password. <a href="/login.html">Try again</a></h3>');
    }

    req.session.username = user.userId;
    req.session.cookie.maxAge = remember ? 1000 * 60 * 60 * 24 * 30 : null;

    res.redirect('/protected/chat.html');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('<h3>Server error. <a href="/login.html">Try again</a></h3>');
  }
});

// ✅ Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// ✅ Session verification route
app.get('/api/user', (req, res) => {
  if (!req.session.username) return res.status(403).json({});
  res.json({ username: req.session.username });
});

// ✅ Online tracking
const onlineUsers = new Set();

// ✅ Attach session middleware to Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// ✅ Check authentication
io.use((socket, next) => {
  const session = socket.request.session;
  if (session?.username) {
    return next();
  }
  next(new Error('not-authenticated'));
});

// ✅ Socket.IO handlers
io.on('connection', async (socket) => {
  const session = socket.request.session;
console.log('🟢 Session on socket connection:', session);
  const username = session.username;

  console.log(`${username} connected`);
  onlineUsers.add(username);
  socket.broadcast.emit('user-online', username);

  // ✅ Send chat history
  const messages = await Message.find({
    $or: [{ user: username }, { to: username }]
  }).sort({ time: 1 });
  socket.emit('chat history', messages);

  // ✅ Handle new message
  socket.on('chat message', async ({ to, text }) => {
    if (!to || !text) return;

    const sender = await User.findOne({ userId: username });
    const contact = sender.contacts.find(c => c.userId === to && c.status === 'approved');
    if (!contact) {
      return socket.emit('error', 'Cannot send message. Contact not approved.');
    }

    const newMsg = new Message({ user: username, to, text, status: 'sent' });
    await newMsg.save();
    console.log('💬 New message saved:', newMsg);

    for (let [id, sock] of io.sockets.sockets) {
      const s = sock.request.session;
      if (s?.username === username || s?.username === to) {
        sock.emit('chat message', newMsg);
      }
    }
  });

  // ✅ Delete message
  socket.on('delete message', async (msgId) => {
    const msg = await Message.findById(msgId);
    if (msg && msg.user === username) {
      await Message.deleteOne({ _id: msgId });
      const updatedMessages = await Message.find({
        $or: [{ user: username }, { to: username }]
      }).sort({ time: 1 });
      socket.emit('chat history', updatedMessages);
    }
  });

  // ✅ Message delivery
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

  // ✅ Typing
  socket.on('typing', () => {
    socket.broadcast.emit('typing', username);
  });

  // ✅ Optional manual update
  socket.on('update status', async ({ msgId, status }) => {
    if (['sent', 'delivered', 'seen'].includes(status)) {
      await Message.findByIdAndUpdate(msgId, { status });
      io.emit('message status update', { msgId, status });
    }
  });

  // ✅ Disconnect
  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
    onlineUsers.delete(username);
    socket.broadcast.emit('user-offline', username);
  });
});

// ✅ Catch-all 404 handler for unknown routes
app.use((req, res, next) => {
  console.warn(`⚠️ 404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).send('404 Not Found');
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).send("Internal Server Error");
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
