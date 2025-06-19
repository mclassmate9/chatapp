document.getElementById('registerForm').addEventListener('submit', function (e) {
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  if (password !== confirmPassword) {
    e.preventDefault(); // Stop form from submitting
    alert('Passwords do not match.');
    return;
  }

  // You can add more validations here if needed (e.g. username/email format)
});
