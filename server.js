// server.js const express = require('express'); const session = require('express-session'); const http = require('http'); const socketio = require('socket.io'); const path = require('path'); const mongoose = require('mongoose'); const MongoStore = require('connect-mongo'); require('dotenv').config();

const app = express(); const server = http.createServer(app); const io = socketio(server);

// MongoDB Connection mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, });

const messageSchema = new mongoose.Schema({ user: String, text: String, time: { type: Date, default: Date.now } }); const Message = mongoose.model('Message', messageSchema);

const users = { you: 'pass123', friend: 'secret456' };

const sessionMiddleware = session({ secret: 'chatSecretKey', resave: false, saveUninitialized: true, store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }) });

app.use(express.urlencoded({ extended: true })); app.use(sessionMiddleware); app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', (req, res) => { const { username, password } = req.body; if (users[username] && users[username] === password) { req.session.username = username; return res.redirect('/chat.html'); } return res.send('<h3>Login failed. <a href="/login.html">Try again</a></h3>'); });

app.get('/logout', (req, res) => { req.session.destroy(() => { res.redirect('/login.html'); }); });

app.get('/api/user', (req, res) => { if (!req.session.username) return res.status(403).json({}); res.json({ username: req.session.username }); });

io.use((socket, next) => { sessionMiddleware(socket.request, {}, next); });

io.on('connection', async (socket) => { const session = socket.request.session; if (!session.username) { socket.emit('not-authenticated'); return socket.disconnect(); } const username = session.username;

console.log('${username} connected');

const messages = await Message.find().sort({ time: 1 }); socket.emit('chat history', messages);

socket.on('chat message', async (text) => { const newMsg = new Message({ user: username, text }); await newMsg.save(); io.emit('chat message', newMsg); });

socket.on('delete message', async (msgId) => { const msg = await Message.findById(msgId); if (msg && msg.user === username) { await Message.deleteOne({ _id: msgId }); const updatedMessages = await Message.find().sort({ time: 1 }); io.emit('chat history', updatedMessages); } });

socket.on('disconnect', () => { console.log('${username} disconnected'); }); });

const PORT = process.env.PORT || 3000; server.listen(PORT, () => { console.log('Server running on port ${PORT}'); });

