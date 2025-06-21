// contactsCore.js

export async function fetchCurrentUser() {
  const res = await fetch('/api/user');
  if (!res.ok) throw new Error('Not authenticated');
  return await res.json();
}

export async function fetchAllContacts() {
  const res = await fetch('/user/contacts');
  return await res.json();
}

export async function sendContactRequest(contactId) {
  const res = await fetch('/user/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId })
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.text();
}

export async function approveContact(contactId) {
  const res = await fetch('/user/contacts/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId })
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.text();
}

export async function cancelContact(contactId) {
  const res = await fetch('/user/contacts/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId })
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.text();
}

// ✅ Ensure session is valid, then run the callback with username
export async function initSessionAndStart(callback) {
  try {
    const res = await fetch('/api/user');
    if (!res.ok) throw new Error('Not authenticated');
    const data = await res.json();

    if (typeof callback === 'function') {
      callback(data.username);
    }
  } catch (err) {
    console.error('Session check failed:', err);
    window.location.href = '/login.html';
  }
}