// contactsCore.js

// ✅ Get current user session info
export async function fetchCurrentUser() {
  const res = await fetch('/api/user');
  if (!res.ok) throw new Error('User not authenticated');
  return res.json();
}

// ✅ Fetch all contacts (supports array or object format)
export async function fetchAllContacts() {
  const res = await fetch('/contacts/list');
  if (!res.ok) throw new Error('Failed to fetch contacts');
  const data = await res.json();
  return Array.isArray(data) ? data : data.contacts;
}

// ✅ Send a contact request
export async function sendContactRequest(contactId) {
  if (!contactId || contactId.trim() === '') {
    throw new Error('Please enter a valid contact ID');
  }

  const res = await fetch('/contacts/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ to: contactId }),
  });

  const text = await res.text();

  if (!res.ok) {
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || 'Failed to send request');
    } catch {
      throw new Error(text);
    }
  }

  return text;
}

// ✅ Approve a contact request
export async function approveContact(contactId) {
  const res = await fetch('/contacts/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ from: contactId }), // ✅ match backend format
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to approve contact');
  }
}

// ✅ Cancel/reject a contact request
export async function cancelContact(contactId) {
  const res = await fetch('/contacts/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ from: contactId }), // ✅ match backend format
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to cancel contact');
  }
}

export async function setupContactsPage({
  formId,
  inputId,
  messageId,
  currentUserDisplayId,
  pendingListId,
  receivedListId,
  approvedListId
}) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const message = document.getElementById(messageId);
  const pendingList = document.getElementById(pendingListId);
  const receivedList = document.getElementById(receivedListId);
  const approvedList = document.getElementById(approvedListId);
  const currentUserDisplay = document.getElementById(currentUserDisplayId);

  let currentUser = '';

  try {
    const user = await fetchCurrentUser();
    currentUser = user.username;
    if (currentUserDisplay) currentUserDisplay.textContent = currentUser;
    await renderContacts();
  } catch (err) {
    console.error('Auth error:', err);
    window.location.href = '/login.html';
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const contactId = input.value.trim();
      if (!contactId) return;

      try {
        const msg = await sendContactRequest(contactId);
        message.textContent = msg;
        input.value = '';
        await renderContacts();
      } catch (err) {
        message.textContent = err.message;
      }
    });
  }

  async function renderContacts() {
    const contacts = await fetchAllContacts();

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

  // Expose approve/reject handlers globally
  window.approveRequest = async (id) => {
    await approveContact(id);
    await renderContacts();
  };

  window.cancelRequest = async (id) => {
    await cancelContact(id);
    await renderContacts();
  };
}