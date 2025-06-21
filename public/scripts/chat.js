import {
  initSessionAndStart,
  fetchAllContacts,
  sendContactRequest,
  approveContact,
  cancelContact
} from './contactsCore.js';

const socket = io({ autoConnect: false, withCredentials: true });

let username = '';
let selectedContact = null;
let typingTimeout;

const messagesList = document.getElementById('messages');
const typingIndicator = document.getElementById('typingIndicator');
const statusDot = document.getElementById('user-status');
const newMessageBadge = document.getElementById('newMessageBadge');
const loadingOverlay = document.getElementById('loadingOverlay');
const contactList = document.getElementById('contactList');
const newContactId = document.getElementById('newContactId');
const addContactBtn = document.getElementById('addContactBtn');

// ✅ Socket Events
socket.on('connect', () => {
  console.log('✅ Socket connected');
  loadingOverlay.classList.add('hidden');
});

socket.on('connect_error', (err) => {
  console.error('❌ Socket error:', err.message);
  loadingOverlay.classList.remove('hidden');
});

socket.on('disconnect', () => {
  console.warn('⚠️ Socket disconnected');
  loadingOverlay.classList.remove('hidden');
});

socket.on('not-authenticated', () => {
  window.location.href = '/login.html';
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
    const atBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 150;
    if (atBottom) socket.emit('message seen', msg._id);
  }
  scrollToBottom();
});

socket.on('typing', (user) => {
  if (user !== username) {
    typingIndicator.textContent = `${user} is typing...`;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typingIndicator.textContent = '';
    }, 2000);
  }
});

// ✅ Message Handling
function scrollToBottom(force = false) {
  const threshold = 150;
  const distance = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight;
  if (force || distance < threshold) {
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
  item.textContent = isSelf ? msg.text : `${msg.user}: ${msg.text}`;
  item.dataset.id = msg._id;
  item.dataset.sender = msg.user;

  if (isSelf && msg.status) {
    const statusSpan = document.createElement('span');
    statusSpan.className = 'status-badge';
    statusSpan.textContent =
      msg.status === 'sent' ? '✓' :
      msg.status === 'delivered' ? '✓✓' :
      msg.status === 'seen' ? '✓✓ Seen' : '';
    item.appendChild(statusSpan);
  }

  if (isSelf) {
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.onclick = () => socket.emit('delete message', msg._id);
    item.appendChild(delBtn);
  }

  messagesList.appendChild(item);
}

newMessageBadge.addEventListener('click', () => scrollToBottom(true));

messagesList.addEventListener('scroll', () => {
  const isAtBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 100;
  if (isAtBottom) newMessageBadge.style.display = 'none';

  messagesList.querySelectorAll('li').forEach(item => {
    const rect = item.getBoundingClientRect();
    const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (visible && item.dataset.id && item.dataset.sender !== username) {
      socket.emit('message seen', item.dataset.id);
    }
  });
});

// ✅ Form Events
document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('input');
  const text = input.value.trim();
  if (!selectedContact) return alert('Select a contact to chat with.');
  if (text) {
    socket.emit('chat message', { to: selectedContact, text });
    input.value = '';
    socket.emit('typing', false);
  }
});

document.getElementById('input').addEventListener('input', () => {
  socket.emit('typing', true);
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Logout?')) {
    fetch('/logout').then(() => window.location.href = '/login.html');
  }
});

// ✅ Session + Socket Start
initSessionAndStart(user => {
  username = user;
  document.getElementById('chat-username').textContent = `Chat with ${username}`;
  statusDot.textContent = 'Online';
  statusDot.classList.replace('offline', 'online');
  socket.connect();
  loadingOverlay.classList.add('hidden');
});

// ✅ Contact selector
fetch('/user/approved')
  .then(res => res.json())
  .then(contacts => {
    const selector = document.getElementById('contactSelector');
    contacts.forEach(contact => {
      const option = document.createElement('option');
      option.value = contact;
      option.textContent = contact;
      selector.appendChild(option);
    });

    selector.addEventListener('change', () => {
      selectedContact = selector.value;
      document.getElementById('chat-username').textContent = `Chat with ${selectedContact}`;
    });
  });

// ✅ Add contact button
addContactBtn.addEventListener('click', () => {
  const contactId = newContactId.value.trim();
  if (!contactId) return;
  sendContactRequest(contactId)
    .then(text => {
      alert(text);
      newContactId.value = '';
      loadSidebarContacts();
    })
    .catch(err => alert(err.message));
});

// ✅ Sidebar handling
function toggleSidebar() {
  document.getElementById('contactsSidebar').classList.toggle('hidden');
}

document.getElementById('addContactFormSidebar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const contactId = document.getElementById('contactIdSidebar').value.trim();
  if (!contactId) return;

  const text = await sendContactRequest(contactId);
  alert(text);
  document.getElementById('contactIdSidebar').value = '';
  loadSidebarContacts();
});

window.approveRequest = async (contactId) => {
  await approveContact(contactId);
  loadSidebarContacts();
};

window.cancelRequest = async (contactId) => {
  await cancelContact(contactId);
  loadSidebarContacts();
};

async function loadSidebarContacts() {
  const contacts = await fetchAllContacts();
  const pendingList = document.getElementById('pendingListSidebar');
  const receivedList = document.getElementById('receivedListSidebar');
  const approvedList = document.getElementById('approvedListSidebar');

  pendingList.innerHTML = '';
  receivedList.innerHTML = '';
  approvedList.innerHTML = '';

  contacts.forEach(contact => {
    const li = document.createElement('li');
    li.textContent = contact.userId;

    if (contact.status === 'pending') {
      li.innerHTML += ` <button onclick="cancelRequest('${contact.userId}')">Cancel</button>`;
      pendingList.appendChild(li);
    } else if (contact.status === 'received') {
      li.innerHTML += ` <button onclick="approveRequest('${contact.userId}')">Approve</button>`;
      receivedList.appendChild(li);
    } else if (contact.status === 'approved') {
      approvedList.appendChild(li);
    }
  });
}

loadSidebarContacts();