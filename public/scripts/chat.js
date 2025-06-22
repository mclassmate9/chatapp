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
const notificationSound = new Audio('/pop.mp3');

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
    const isAtBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 150;

    if (isAtBottom) {
      socket.emit('message seen', msg._id);
    }

    notificationSound.play().catch(err => console.warn('🔇 Sound play blocked:', err));
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
  const isFromMe = msg.user === username;
  const isToMe = msg.to === username;
  const isRelevant = (isFromMe && msg.to === selectedContact) || (isToMe && msg.user === selectedContact);
  if (!isRelevant) return;

  const item = document.createElement('li');
  const isSelf = isFromMe;

  item.classList.add(isSelf ? 'message-sent' : 'message-received');
  item.dataset.id = msg._id;
  item.dataset.sender = msg.user;
  item.textContent = isSelf ? msg.text : `${msg.user}: ${msg.text}`;

  if (isSelf) {
    const statusSpan = document.createElement('span');
    statusSpan.className = 'status-badge';
    statusSpan.textContent = msg.status === 'seen' ? '✓✓ Seen' :
                             msg.status === 'delivered' ? '✓✓' : '✓';
    item.appendChild(statusSpan);

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.onclick = () => socket.emit('delete message', msg._id);
    delBtn.style.marginLeft = '10px';
    delBtn.style.background = 'transparent';
    delBtn.style.border = 'none';
    delBtn.style.cursor = 'pointer';
    item.appendChild(delBtn);
  }

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
  const isAtBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 100;
  if (isAtBottom) newMessageBadge.style.display = 'none';

  const messageItems = messagesList.querySelectorAll('li');
  messageItems.forEach(item => {
    const rect = item.getBoundingClientRect();
    const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    const sender = item.dataset.sender;

    if (
      visible &&
      item.dataset.id &&
      sender !== username &&
      sender === selectedContact
    ) {
      socket.emit('message seen', item.dataset.id);
    }
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to logout?')) {
    fetch('/logout').then(() => window.location.href = '/login.html');
  }
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
fetch('/contacts/list')
  .then(res => res.json())
  .then(data => {
    const contacts = Array.isArray(data) ? data : data.contacts || [];
    contactSelector.innerHTML = '';

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
  })
  .catch(err => {
    console.error('Failed to load approved contacts:', err);
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

// ✅ Load Sidebar Contacts
async function loadSidebarContacts() {
  try {
    const result = await fetchAllContacts();
    const contacts = Array.isArray(result) ? result : result.contacts || [];

    ['pendingListSidebar', 'receivedListSidebar', 'approvedListSidebar'].forEach(id =>
      document.getElementById(id).innerHTML = ''
    );

    contacts.forEach(contact => {
      const li = document.createElement('li');
      li.textContent = contact.userId;

      if (contact.status === 'pending') {
        li.innerHTML += ` <button onclick="cancelRequest('${contact.userId}')">Cancel</button>`;
        document.getElementById('pendingListSidebar').appendChild(li);
      } else if (contact.status === 'received') {
        li.innerHTML += ` <button onclick="approveRequest('${contact.userId}')">Approve</button>`;
        document.getElementById('receivedListSidebar').appendChild(li);
      } else if (contact.status === 'approved') {
        document.getElementById('approvedListSidebar').appendChild(li);
      }
    });
  } catch (err) {
    console.error('❌ Failed to load sidebar contacts:', err);
  }
}

loadSidebarContacts();