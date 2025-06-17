const express = require('express');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const MESSAGE_FILE = path.join(__dirname, 'messages.json');

const users = {
  you: 'pass123',
  friend: 'secret456'
};

const sessionMiddleware = session({
  secret: 'chatSecretKey',
  resave: false,
  saveUninitialized: true
});

app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    req.session.username = username;
    return res.redirect('/chat.html');
  }
  return res.send('<h3>Login failed. <a href="/login.html">Try again</a></h3>');
});

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

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

io.on('connection', (socket) => {
  const session = socket.request.session;
  if (!session.username) {
    socket.emit('not-authenticated');
    return socket.disconnect();
  }

  const username = session.username;
  console.log(`${username} connected`);

  const messages = loadMessages();
  socket.emit('chat history', messages);

  socket.on('chat message', (text) => {
    const newMsg = { user: username, text, time: new Date().toISOString() };
    const updatedMessages = [...loadMessages(), newMsg];
    saveMessages(updatedMessages);
    io.emit('chat message', newMsg);
  });

  socket.on('delete all', () => {
    saveMessages([]);
    io.emit('chat history', []);
  });

  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Chat app running at http://localhost:${PORT}`);
});
