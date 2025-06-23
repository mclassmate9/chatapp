// contactsCore.js

export async function fetchCurrentUser() {
  const res = await fetch('/api/user');
  if (!res.ok) throw new Error('User not authenticated');
  return res.json();
}

export async function fetchAllContacts() {
  const res = await fetch('/contacts/list');
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
}

export async function sendContactRequest(contactId) {
  const res = await fetch('/user/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text;
}

export async function approveContact(contactId) {
  const res = await fetch('/user/contacts/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to approve contact');
  }
}

export async function cancelContact(contactId) {
  const res = await fetch('/user/contacts/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to cancel contact');
  }
}
