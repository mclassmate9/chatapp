const express = require('express');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// File to store chat messages
const MESSAGE_FILE = path.join(__dirname, 'messages.json');

// Dummy login credentials
const users = {
  you: 'pass123',
  friend: 'secret456'
};

// Session setup
const sessionMiddleware = session({
  secret: 'chatSecretKey',
  resave: false,
  saveUninitialized: true
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Login handler
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    req.session.username = username;
    return res.redirect('/chat.html');
  }
  return res.send('<h3>Login failed. <a href="/login.html">Try again</a></h3>');
});

// Socket.io session integration
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Helper functions to read/write messages
function loadMessages() {
  try {
    const data = fs.readFileSync(MESSAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  fs.writeFileSync(MESSAGE_FILE, JSON.stringify(messages, null, 2));
}

// Socket.io handlers
io.on('connection', (socket) => {
  const session = socket.request.session;
  if (!session.username) {
    socket.emit('not-authenticated');
    return socket.disconnect();
  }

  const username = session.username;
  console.log(`${username} connected`);

  // Send previous messages
  const messages = loadMessages();
  socket.emit('chat history', messages);

  // Handle new messages
  socket.on('chat message', (text) => {
    const newMsg = { user: username, text, time: new Date().toISOString() };
    const updatedMessages = [...loadMessages(), newMsg];
    saveMessages(updatedMessages);
    io.emit('chat message', newMsg);
  });

  // Handle message deletion
  socket.on('delete all', () => {
    saveMessages([]);
    io.emit('chat history', []);
  });

  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
