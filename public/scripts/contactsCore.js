// scripts/contactsCore.js
export function setupContactsPage(config) {
  const {
    formId,
    inputId,
    messageId,
    currentUserDisplayId,
    pendingListId,
    receivedListId,
    approvedListId
  } = config;

  const addForm = document.getElementById(formId);
  const contactIdInput = document.getElementById(inputId);
  const message = document.getElementById(messageId);
  const pendingList = document.getElementById(pendingListId);
  const receivedList = document.getElementById(receivedListId);
  const approvedList = document.getElementById(approvedListId);
  const currentUserDisplay = currentUserDisplayId ? document.getElementById(currentUserDisplayId) : null;

  let currentUser = '';

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
      fetchContacts();
    })
    .catch(err => {
      console.error('User not logged in:', err);
      window.location.href = '/login.html';
    });

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
    if (message) message.textContent = text;
    contactIdInput.value = '';
    fetchContacts();
  });

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
}