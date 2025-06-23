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
  const res = await fetch('/contacts/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: contactId }), // ✅ fixed key to match backend
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);
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