document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const userId = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message');

  message.textContent = ''; // Clear previous messages

  // ✅ Basic validation
  if (!userId || !password || !email) {
    message.style.color = 'red';
    message.textContent = 'All fields are required.';
    return;
  }

  // ✅ Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    message.style.color = 'red';
    message.textContent = 'Please enter a valid email address.';
    return;
  }

  // ✅ Submit form data
  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ userId, password, email }),
    });

    if (res.redirected) {
      // Redirect to chat page
      window.location.href = res.url;
    } else {
      // Show error from server
      const text = await res.text();
      message.style.color = 'red';
      message.textContent = text;
    }
  } catch (err) {
    console.error('Registration failed:', err);
    message.style.color = 'red';
    message.textContent = 'Something went wrong. Please try again.';
  }
});