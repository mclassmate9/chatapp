document.addEventListener('DOMContentLoaded', () => {
  const addForm = document.getElementById('addContactForm');
  const contactIdInput = document.getElementById('contactId');
  const message = document.getElementById('message');
  const pendingList = document.getElementById('pendingList');
  const receivedList = document.getElementById('receivedList');
  const approvedList = document.getElementById('approvedList');

  // Fetch and render contacts
  async function fetchContacts() {
    const res = await fetch('/user/contacts');
    const contacts = await res.json();

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

  // Send contact request
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

  // Expose global approve and cancel
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

  fetchContacts();
});

// 🔄 Load pending requests
function loadPendingRequests() {
  fetch('/contacts/pending')
    .then(res => res.json())
    .then(data => {
      const pendingList = document.getElementById('pendingList');
      pendingList.innerHTML = '';

      data.pending.forEach(requester => {
        const li = document.createElement('li');
        li.textContent = requester + ' ';

        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = '✅ Accept';
        acceptBtn.onclick = () => handleRequest('accept', requester);

        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = '❌ Reject';
        rejectBtn.onclick = () => handleRequest('reject', requester);

        li.appendChild(acceptBtn);
        li.appendChild(rejectBtn);
        pendingList.appendChild(li);
      });
    });
}

// 🔁 Accept or Reject Request
function handleRequest(action, fromUser) {
  fetch(`/contacts/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ from: fromUser })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadPendingRequests(); // refresh list
    })
    .catch(err => alert('Error: ' + err.message));
}

// 🔃 Load when chat loads
loadPendingRequests();