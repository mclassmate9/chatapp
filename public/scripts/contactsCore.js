// contactsCore.js
export async function fetchCurrentUser() {
  const res = await fetch('/api/user');
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

export async function fetchAllContacts() {
  const res = await fetch('/user/contacts');
  return res.json();
}

export async function sendContactRequest(contactId) {
  const res = await fetch('/user/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  });
  return res.text();
}

export async function approveContact(contactId) {
  await fetch('/user/contacts/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  });
}

export async function cancelContact(contactId) {
  await fetch('/user/contacts/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  });
}