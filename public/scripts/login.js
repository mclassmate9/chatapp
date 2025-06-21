document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const message = document.getElementById('loginMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = new URLSearchParams();
    for (const [key, value] of formData) {
      data.append(key, value);
    }

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data,
      });

      const text = await res.text();

      if (res.redirected) {
        // ✅ On success, redirect to chat
        window.location.href = res.url;
      } else {
        // ❌ Show error message returned from server
        message.innerHTML = text;
      }
    } catch (err) {
      message.textContent = 'Something went wrong. Try again.';
      console.error(err);
    }
  });
});