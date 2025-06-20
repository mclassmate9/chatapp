const socket = io();
  let username = '';
  let typingTimeout;
  let selectedContact = null;

  const messagesList = document.getElementById('messages');
  const typingIndicator = document.getElementById('typingIndicator');
  const statusDot = document.getElementById('user-status');
  const newMessageBadge = document.getElementById('newMessageBadge');
  const loadingOverlay = document.getElementById('loadingOverlay');

const contactList = document.getElementById('contactList');
const newContactId = document.getElementById('newContactId');
const addContactBtn = document.getElementById('addContactBtn');


  socket.on('connect', () => {
    loadingOverlay.classList.add('hidden');
  });

  socket.on('connect_error', () => {
    loadingOverlay.classList.remove('hidden');
  });

  socket.on('disconnect', () => {
    loadingOverlay.classList.remove('hidden');
  });

  function scrollToBottom(force = false) {
  const scrollThreshold = 150; // px from bottom
  const distanceFromBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight;

  if (force || distanceFromBottom < scrollThreshold) {
    messagesList.scrollTop = messagesList.scrollHeight;
    newMessageBadge.style.display = 'none';
  } else {
    newMessageBadge.style.display = 'block';
  }
}

  newMessageBadge.addEventListener('click', () => scrollToBottom(true));

  messagesList.addEventListener('scroll', () => {
    const isAtBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 100;
    if (isAtBottom) newMessageBadge.style.display = 'none';

    // Check visibility to emit "seen"
    const messageItems = messagesList.querySelectorAll('li');
    messageItems.forEach(item => {
      const rect = item.getBoundingClientRect();
      const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;

      if (visible && item.dataset.id && item.dataset.sender !== username) {
        socket.emit('message seen', item.dataset.id);
      }
    });
  });

  function addMessage(msg) {

    function addMessage(msg) {
  if ((msg.user !== username && msg.user !== selectedContact) ||
      (msg.user === username && msg.to !== selectedContact)) {
    return; // skip unrelated messages
  }
    const item = document.createElement('li');
    const isSelf = msg.user === username;
    item.classList.add(isSelf ? 'message-sent' : 'message-received');
    item.textContent = isSelf ? msg.text : `${msg.user}: ${msg.text}`;
    item.dataset.id = msg._id;
    item.dataset.sender = msg.user;

    // Add status badge
    if (isSelf && msg.status) {
      const statusSpan = document.createElement('span');
      statusSpan.className = 'status-badge';
      statusSpan.textContent =
        msg.status === 'sent' ? '✓' :
        msg.status === 'delivered' ? '✓✓' :
        msg.status === 'seen' ? '✓✓ Seen' : '';
      item.appendChild(statusSpan);
    }

    // Add delete button
    if (isSelf) {
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.style.marginLeft = '10px';
      delBtn.style.background = 'transparent';
      delBtn.style.border = 'none';
      delBtn.style.cursor = 'pointer';
      delBtn.onclick = () => socket.emit('delete message', msg._id);
      item.appendChild(delBtn);
    }

    messagesList.appendChild(item);
  }

  socket.on('not-authenticated', () => window.location.href = '/login.html');

  socket.on('chat history', (messages) => {
    messagesList.innerHTML = '';
    messages.forEach(addMessage);
    scrollToBottom(true);
  });

  
socket.on('chat message', (msg) => {
  addMessage(msg);
  
  // Handle delivery/seen
  if (msg.user !== username) {
    socket.emit('message delivered', msg._id);
    const isAtBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 150;
    if (isAtBottom) {
      socket.emit('message seen', msg._id);
    }
  }

  scrollToBottom(); // ✅ only scroll if near bottom
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

  document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('input');
  const messageText = input.value.trim();

  if (!selectedContact) {
    alert('Please select a contact to chat with.');
    return;
  }

  if (messageText) {
    socket.emit('chat message', {
      to: selectedContact,
      text: messageText
    });

    input.value = '';
    socket.emit('typing', false);
  }
});

  document.getElementById('input').addEventListener('input', () => {
    socket.emit('typing', true);
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      fetch('/logout').then(() => (window.location.href = '/login.html'));
    }
  });

    console.log("Checking user session...");
fetch('/api/user')
  .then(res => {
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  })
  .then(data => {
    username = data.username;
    document.getElementById('chat-username').textContent = `Chat with ${username}`;
    statusDot.classList.replace('offline', 'online');
    statusDot.textContent = 'Online';

    // Now that user is authenticated, connect with Socket.io
    socket.connect();  // if you're preventing auto-connect
    loadingOverlay.classList.add('hidden');
  })
  .catch(err => {
    console.error('Auth-check failed:', err);
    window.location.href = '/login.html';
  });
  

// Fetch approved contacts
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
      refreshChat(); // Filter messages
    });
  });

// Load contacts
fetch('/api/contacts')
  .then(res => res.json())
  .then(contacts => {
    contacts.forEach(contact => {
      const li = document.createElement('li');
      li.textContent = contact;
      li.addEventListener('click', () => {
        // Placeholder: later we load that user's chat
        alert(`Open chat with ${contact}`);
      });
      contactList.appendChild(li);
    });
  });

// Add contact
addContactBtn.addEventListener('click', () => {
  const contactId = newContactId.value.trim();
  if (!contactId) return;

  fetch('/api/contacts/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ contactId })
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to add contact');
      const li = document.createElement('li');
      li.textContent = contactId;
      li.addEventListener('click', () => {
        alert(`Open chat with ${contactId}`);
      });
      contactList.appendChild(li);
      newContactId.value = '';
    })
    .catch(err => alert(err.message));
});
