
const express = require('express');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// MongoDB Schema
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  time: Date
});
const Message = mongoose.model('Message', messageSchema);

// Dummy users
const users = {
  you: 'pass123',
  friend: 'secret456'
};

// Session config
const sessionMiddleware = session({
  secret: 'chatSecretKey',
  resave: false,
  saveUninitialized: true
});

app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    req.session.username = username;
    return res.redirect('/chat.html');
  }
  return res.send('<h3>Login failed. <a href="/login.html">Try again</a></h3>');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// NEW: Send username to frontend
app.get('/get-username', (req, res) => {
  if (req.session.username) {
    res.json({ username: req.session.username });
  } else {
    res.json({ username: null });
  }
});

// Enable session in socket.io
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Socket.io logic
io.on('connection', async (socket) => {
  const session = socket.request.session;
  if (!session.username) {
    socket.emit('not-authenticated');
    return socket.disconnect();
  }

  const username = session.username;
  console.log(`${username} connected`);

  // Send chat history
  const messages = await Message.find().sort({ time: 1 });
  socket.emit('chat history', messages);

  // New message
  socket.on('chat message', async (text) => {
    const newMsg = new Message({ user: username, text, time: new Date() });
    await newMsg.save();
    io.emit('chat message', newMsg);
  });

  // NEW: Delete individual message
  socket.on('delete message', async (_id) => {
    const message = await Message.findById(_id);
    if (message && message.user === username) {
      await Message.deleteOne({ _id });
      const updatedMessages = await Message.find().sort({ time: 1 });
      io.emit('chat history', updatedMessages);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});