
const socket = io();
const form = document.getElementById('chat-form');
const input = document.getElementById('msg');
const messagesDiv = document.getElementById('messages');

socket.on('not-authenticated', () => {
  alert("You are not logged in.");
  window.location.href = '/login.html';
});

socket.on('chat history', messages => {
  messagesDiv.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.textContent = `[${new Date(msg.time).toLocaleTimeString()}] ${msg.user}: ${msg.text}`;
    messagesDiv.appendChild(div);
  });
});

socket.on('chat message', msg => {
  const div = document.createElement('div');
  div.textContent = `[${new Date(msg.time).toLocaleTimeString()}] ${msg.user}: ${msg.text}`;
  messagesDiv.appendChild(div);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});

function deleteAll() {
  if (confirm('Delete all messages?')) {
    socket.emit('delete all');
  }
}
