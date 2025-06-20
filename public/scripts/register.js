document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const userId = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message');

  if (!userId || !password || !email) {
    message.style.color = 'red';
    message.textContent = 'All fields are required.';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    message.style.color = 'red';
    message.textContent = 'Invalid email format.';
    return;
  }

  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ userId, password, email }),
    });

    if (res.redirected) {
      window.location.href = res.url;
    } else {
      const text = await res.text();
      message.style.color = 'red';
      message.textContent = text;
    }
  } catch (err) {
    message.style.color = 'red';
    message.textContent = 'Error during registration.';
    console.error(err);
  }
});