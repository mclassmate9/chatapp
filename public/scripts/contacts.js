document.addEventListener('DOMContentLoaded', () => {
  const addForm = document.getElementById('addContactForm');
  const contactIdInput = document.getElementById('contactId');
  const message = document.getElementById('message');
  const pendingList = document.getElementById('pendingList');
  const receivedList = document.getElementById('receivedList');
  const approvedList = document.getElementById('approvedList');
  const currentUserDisplay = document.getElementById('currentUser'); // optional

  let currentUser = '';

  // ✅ Step 1: Verify user session
  fetch('/api/user')
    .then(res => {
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    })
    .then(data => {
      currentUser = data.username;
      if (currentUserDisplay) {
        currentUserDisplay.textContent = currentUser;
      }
      fetchContacts(); // ✅ now load contacts
    })
    .catch(err => {
      console.error('User not logged in:', err);
      window.location.href = '/login.html';
    });

  // ✅ Step 2: Fetch and render contacts
  async function fetchContacts() {
    const res = await fetch('/user/contacts');
    const contacts = await res.json();

    pendingList.innerHTML = '';
    receivedList.innerHTML = '';
    approvedList.innerHTML = '';

    contacts.forEach(contact => {
      const li = document.createElement('li');
      li.textContent = contact.userId;

      if (contact.status === 'pending' && contact.sentBy === currentUser) {
        li.innerHTML += ` <button onclick="cancelRequest('${contact.userId}')">Cancel</button>`;
        pendingList.appendChild(li);
      } else if (contact.status === 'pending' && contact.sentBy !== currentUser) {
        li.innerHTML += ` <button onclick="approveRequest('${contact.userId}')">Approve</button>`;
        receivedList.appendChild(li);
      } else if (contact.status === 'approved') {
        approvedList.appendChild(li);
      }
    });
  }

  // ✅ Step 3: Send contact request
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const contactId = contactIdInput.value.trim();
    if (!contactId) return;

    const res = await fetch('/user/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
    });

    const text = await res.text();
    message.textContent = text;
    contactIdInput.value = '';
    fetchContacts();
  });

  // ✅ Step 4: Expose global approve and cancel
  window.approveRequest = async (contactId) => {
    await fetch('/user/contacts/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
    });
    fetchContacts();
  };

  window.cancelRequest = async (contactId) => {
    await fetch('/user/contacts/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
    });
    fetchContacts();
  };
});