document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const userId = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value;
  const email = document.getElementById('email').value.trim();

  if (!userId || !password || !email) {
    alert("All fields are required.");
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, password, email })
    });

    const data = await res.json();

    if (res.ok) {
      alert('✅ Registration successful! Please log in.');
      window.location.href = '/login.html';
    } else {
      alert(`❌ ${data.message || 'Registration failed'}`);
    }
  } catch (err) {
    console.error('Registration error:', err);
    alert('❌ Something went wrong. Please try again.');
  }
});