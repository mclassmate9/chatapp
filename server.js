const express = require('express');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// ✅ MongoDB Connection with error handling
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
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  }),
  cookie: { maxAge: null }
});

// ✅ Message Schema
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// ✅ Static users (can be replaced with real DB later)
const users = {
  you: 'pass123',
  friend: 'secret456',
};

// ✅ Middleware
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Routes
app.post('/login', (req, res) => {
  const { username, password, remember } = req.body;

  if (users[username] && users[username] === password) {
    req.session.username = username;
    if (remember) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    } else {
      req.session.cookie.expires = false;
    }
    return res.redirect('/chat.html');
  }

  return res.send('<h3>Login failed. <a href="/login.html">Try again</a></h3>');
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

// ✅ Apply session to sockets
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// ✅ Track online users
const onlineUsers = new Set();

// ✅ Socket Events
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

  // Handle new messages
  socket.on('chat message', async (text) => {
    const newMsg = new Message({ user: username, text });
    await newMsg.save();
    io.emit('chat message', newMsg);
  });

  // Handle delete message
  socket.on('delete message', async (msgId) => {
    const msg = await Message.findById(msgId);
    if (msg && msg.user === username) {
      await Message.deleteOne({ _id: msgId });
      const updatedMessages = await Message.find().sort({ time: 1 });
      io.emit('chat history', updatedMessages);
    }
  });

  // Typing indicator
  socket.on('typing', () => {
    socket.broadcast.emit('typing', username);
  });

  // Disconnect event
  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
    onlineUsers.delete(username);
    socket.broadcast.emit('user-offline', username);
  });
});

// ✅ Global Error Handler (last middleware)
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).send("Internal Server Error");
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});