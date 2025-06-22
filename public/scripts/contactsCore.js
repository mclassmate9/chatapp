// contactsCore.js

export async function fetchCurrentUser() {
  const res = await fetch('/api/user');
  if (!res.ok) throw new Error('User not authenticated');
  return res.json();
}

// ✅ Unified safe fetch helper
async function safeJson(res) {
  const contentType = res.headers.get('content-type');
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  throw new Error('Invalid JSON response');
}

// ✅ Fetch all contact data (pending, received, approved)
export async function fetchAllContacts() {
  const res = await fetch('/contacts/list');
  const data = await safeJson(res);

  // Ensures we return a flat array of contacts
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.contacts)) return data.contacts;

  // Handle legacy formats or fallback
  return [];
}

// ✅ Send contact request
export async function sendContactRequest(targetUserId) {
  const res = await fetch('/contacts/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: targetUserId })
  });

  const data = await safeJson(res);
  return data.message || 'Request sent';
}

// ✅ Approve contact request
export async function approveContact(fromUserId) {
  const res = await fetch('/contacts/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromUserId })
  });

  const data = await safeJson(res);
  return data.message || 'Contact approved';
}

// ✅ Cancel pending or received request
export async function cancelContact(targetUserId) {
  const res = await fetch('/contacts/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: targetUserId })
  });

  const data = await safeJson(res);
  return data.message || 'Request canceled';
}