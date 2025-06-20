document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');

  // Create feedback message element
  const message = document.createElement('div');
  message.style.marginTop = '10px';
  message.style.fontSize = '14px';
  message.style.color = 'red';
  form.appendChild(message);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    message.style.color = 'black';
    message.textContent = 'Registering...';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Client-side check
    if (!data.userId || !data.email || !data.password) {
      message.style.color = 'red';
      message.textContent = 'Please fill in all fields.';
      return;
    }

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.redirected) {
        window.location.href = response.url;
      } else {
        const text = await response.text();
        message.style.color = 'red';
        message.textContent = text || 'Registration failed.';
      }
    } catch (err) {
      console.error('Register error:', err);
      message.style.color = 'red';
      message.textContent = 'An error occurred. Please try again.';
    }
  });
});