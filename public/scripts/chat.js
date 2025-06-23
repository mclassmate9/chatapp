// chat.js
import {
  fetchCurrentUser,
  fetchAllContacts,
  sendContactRequest,
  approveContact,
  cancelContact
} from './contactsCore.js';

const socket = io({ autoConnect: false, withCredentials: true });

let username = '';
let selectedContact = null;
let typingTimeout = null;

const messagesList = document.getElementById('messages');
const inputField = document.getElementById('input');
const typingIndicator = document.getElementById('typingIndicator');
const statusDot = document.getElementById('user-status');
const chatUsername = document.getElementById('chat-username');
const newMessageBadge = document.getElementById('newMessageBadge');
const loadingOverlay = document.getElementById('loadingOverlay');
const contactSelector = document.getElementById('contactSelector');
const newContactId = document.getElementById('newContactId');
const addContactBtn = document.getElementById('addContactBtn');

// ✅ Socket Events
socket.on('connect', () => {
  console.log('✅ Connected');
  loadingOverlay.classList.add('hidden');
});

socket.on('connect_error', err => {
  console.error('❌ Socket error:', err.message);
  loadingOverlay.classList.remove('hidden');
});

socket.on('not-authenticated', () => {
  window.location.href = '/login.html';
});

socket.on('disconnect', () => {
  console.warn('⚠️ Disconnected');
  loadingOverlay.classList.remove('hidden');
});

socket.on('chat history', (messages) => {
  messagesList.innerHTML = '';
  messages.forEach(addMessage);
  scrollToBottom(true);
});

socket.on('chat message', (msg) => {
  addMessage(msg);

  if (msg.user !== username) {
    socket.emit('message delivered', msg._id);
    if (isAtBottom()) socket.emit('message seen', msg._id);
  }

  scrollToBottom();
});

socket.on('typing', (user) => {
  if (user !== username) {
    typingIndicator.textContent = `${user} is typing...`;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => typingIndicator.textContent = '', 2000);
  }
});

socket.on('message status update', ({ msgId, status }) => {
  const msgEl = messagesList.querySelector(`li[data-id="${msgId}"] span.status-badge`);
  if (msgEl) {
    msgEl.textContent = status === 'seen' ? '✓✓ Seen' : status === 'delivered' ? '✓✓' : '✓';
  }
});

socket.on('contact update', () => {
  loadSidebarContacts();
});

// ✅ Helper Functions
function isAtBottom() {
  return messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 150;
}

function scrollToBottom(force = false) {
  if (force || isAtBottom()) {
    messagesList.scrollTop = messagesList.scrollHeight;
    newMessageBadge.style.display = 'none';
  } else {
    newMessageBadge.style.display = 'block';
  }
}

function addMessage(msg) {
  if ((msg.user !== username && msg.user !== selectedContact) || 
      (msg.user === username && msg.to !== selectedContact)) return;

  const item = document.createElement('li');
  const isSelf = msg.user === username;

  item.classList.add(isSelf ? 'message-sent' : 'message-received');
  item.dataset.id = msg._id;
  item.dataset.sender = msg.user;

  const initials = msg.user.charAt(0).toUpperCase();

  item.innerHTML = `
    <div class="avatar">${initials}</div>
    <div class="bubble">
      ${isSelf ? msg.text : `<strong>${msg.user}:</strong> ${msg.text}`}
      ${isSelf && msg.status ? `<span class="status-badge">${
        msg.status === 'sent' ? '✓' :
        msg.status === 'delivered' ? '✓✓' :
        msg.status === 'seen' ? '✓✓ Seen' : ''
      }</span>` : ''}
    </div>
  `;

  const delBtn = document.createElement('button');
  delBtn.textContent = '🗑️';
  delBtn.onclick = () => socket.emit('delete message', msg._id);
  delBtn.style.marginLeft = '10px';
  delBtn.style.background = 'transparent';
  delBtn.style.border = 'none';
  delBtn.style.cursor = 'pointer';
  item.appendChild(delBtn);

  messagesList.appendChild(item);
}

// ✅ DOM Events
document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputField.value.trim();
  if (!selectedContact) return alert('Please select a contact first');
  if (!text) return;

  socket.emit('chat message', { to: selectedContact, text });
  inputField.value = '';
  socket.emit('typing', false);
});

inputField.addEventListener('input', () => socket.emit('typing'));

newMessageBadge.addEventListener('click', () => scrollToBottom(true));

messagesList.addEventListener('scroll', () => {
  if (isAtBottom()) newMessageBadge.style.display = 'none';

  messagesList.querySelectorAll('li').forEach(item => {
    const rect = item.getBoundingClientRect();
    const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (visible && item.dataset.id && item.dataset.sender !== username) {
      socket.emit('message seen', item.dataset.id);
    }
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to logout?')) {
    fetch('/logout').then(() => window.location.href = '/login.html');
  }
});

document.getElementById('toggleThemeBtn').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

// ✅ Load Current User
fetchCurrentUser().then(user => {
  username = user.username;
  chatUsername.textContent = `Chat with ${username}`;
  statusDot.classList.replace('offline', 'online');
  statusDot.textContent = 'Online';
  socket.connect();
  loadingOverlay.classList.add('hidden');
}).catch(() => {
  window.location.href = '/login.html';
});

// ✅ Load Approved Contacts
fetch('/user/approved')
  .then(res => res.json())
  .then(contacts => {
    contacts.forEach(contact => {
      const option = document.createElement('option');
      option.value = contact;
      option.textContent = contact;
      contactSelector.appendChild(option);
    });

    contactSelector.addEventListener('change', () => {
      selectedContact = contactSelector.value;
      chatUsername.textContent = `Chat with ${selectedContact}`;
    });
  });

// ✅ Add Contact via mini input
addContactBtn.addEventListener('click', () => {
  const contactId = newContactId.value.trim();
  if (!contactId) return;

  sendContactRequest(contactId)
    .then(alert)
    .then(() => {
      newContactId.value = '';
      loadSidebarContacts();
    })
    .catch(err => alert(err.message));
});

// ✅ Contact Sidebar
document.getElementById('addContactFormSidebar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const contactId = document.getElementById('contactIdSidebar').value.trim();
  if (!contactId) return;

  const msg = await sendContactRequest(contactId);
  alert(msg);
  document.getElementById('contactIdSidebar').value = '';
  loadSidebarContacts();
});

window.approveRequest = async (id) => {
  await approveContact(id);
  socket.emit('contact update');
};

window.cancelRequest = async (id) => {
  await cancelContact(id);
  socket.emit('contact update');
};

document.getElementById('toggleSidebarBtn').addEventListener('click', () => {
  document.getElementById('contactsSidebar').classList.toggle('hidden');
});

async function loadSidebarContacts() {
  const res = await fetch('/contacts/full');
  const data = await res.json();
  const contacts = data.contacts || data; // support both formats

  if (!Array.isArray(contacts)) {
    console.error('Expected contacts array, got:', contacts);
    return;
  }

  const pendingList = document.getElementById('pendingListSidebar');
  const receivedList = document.getElementById('receivedListSidebar');
  const approvedList = document.getElementById('approvedListSidebar');

  pendingList.innerHTML = '';
  receivedList.innerHTML = '';
  approvedList.innerHTML = '';

  contacts.forEach(contact => {
  const li = document.createElement('li');
  li.textContent = contact.userId;

  if (contact.status === 'pending' && contact.sentBy === username) {
    // You sent the request
    li.innerHTML += ` <button onclick="cancelRequest('${contact.userId}')">Cancel</button>`;
    pendingList.appendChild(li);
  } else if (contact.status === 'pending' && contact.sentBy !== username) {
    // You received the request
    li.innerHTML += ` <button onclick="approveRequest('${contact.userId}')">Approve</button>`;
    receivedList.appendChild(li);
  } else if (contact.status === 'approved') {
    approvedList.appendChild(li);
  }
});
}

loadSidebarContacts();
