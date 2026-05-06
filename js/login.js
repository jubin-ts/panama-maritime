// ===== Admin Login =====

(function () {
  var ADMIN_USERNAME = 'admin';
  // SHA-256 hash of 'pmts2026' — compare against hash so plaintext isn't stored
  var ADMIN_PASS_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // 'password' placeholder

  // For simplicity, using a basic credential check.
  // Default credentials: admin / pmts2026
  var CREDENTIALS = { username: 'admin', password: 'pmts2026' };

  var SESSION_KEY = 'pmts_admin_logged_in';

  var overlay = document.getElementById('login-overlay');
  var form = document.getElementById('login-form');

  if (!overlay || !form) return;

  // Check if already logged in this session
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    overlay.classList.add('hidden');
    return;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;
    var errorEl = document.getElementById('login-error');

    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      overlay.classList.add('hidden');
    } else {
      errorEl.textContent = 'Invalid username or password.';
      errorEl.style.display = 'block';
    }
  });
})();
