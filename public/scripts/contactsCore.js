// ✅ Get current logged-in user
export async function fetchCurrentUser() {
  const res = await fetch('/api/user');
  if (!res.ok) throw new Error('User not logged in');
  return res.json();
}

// ✅ Get all contact statuses (pending, received, approved)
export async function fetchAllContacts() {
  const res = await fetch('/contacts/list');
  if (!res.ok) throw new Error('Failed to fetch contacts');
  const data = await res.json();

  // Ensure consistent format
  return Array.isArray(data.contacts)
  ? data.contacts
  : Array.isArray(data)
  ? data
  : [];
}

// ✅ Send contact request
export async function sendContactRequest(contactId) {
  const res = await fetch('/contacts/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send request');
  return data.message || 'Request sent';
}

// ✅ Approve received request
export async function approveContact(contactId) {
  const res = await fetch('/contacts/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to approve');
  return data.message || 'Approved successfully';
}

// ✅ Cancel a request (pending or reject received)
export async function cancelContact(contactId) {
  const res = await fetch('/contacts/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reject');
  return data.message || 'Rejected successfully';
}