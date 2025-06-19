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

// ✅ Static users
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
    req.session.cookie.maxAge = remember ? 1000 * 60 * 60 * 24 * 30 : null;
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
