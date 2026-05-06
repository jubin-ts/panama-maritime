// ===== PMTS Certificate System – Shared Utilities =====

/**
 * Encode certificate data as a URL-safe base64 string (UTF-8 safe).
 * @param {Object} data
 * @returns {string}
 */
function encodeData(data) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  } catch (e) {
    return btoa(JSON.stringify(data));
  }
}

/**
 * Decode a base64 string back to a certificate data object.
 * @param {string} encoded
 * @returns {Object|null}
 */
function decodeData(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch (e) {
    try {
      return JSON.parse(atob(encoded));
    } catch (e2) {
      return null;
    }
  }
}

/**
 * Return the base URL of the current page (everything up to and including the last /).
 * Works on both local file:// and GitHub Pages (https://).
 * @returns {string}
 */
function getBasePath() {
  // Strip the filename (and any query/hash) so we get the directory URL.
  return window.location.href.replace(/[?#].*$/, '').replace(/\/[^/]*$/, '/');
}

/**
 * Build the public certificate URL encoding all data in the hash.
 * @param {Object} data
 * @returns {string}
 */
function generateDetailsUrl(data) {
  return getBasePath() + 'details.html#' + encodeData(data);
}

/**
 * Generate a unique PMTS register code.
 * @param {string} [courseCode]
 * @returns {string}
 */
function generateRegisterCode(courseCode) {
  var now  = new Date();
  var yy   = String(now.getFullYear()).slice(2);
  var mm   = String(now.getMonth() + 1).padStart(2, '0');
  var seq  = String(Math.floor(Math.random() * 90000) + 10000);
  var code = ((courseCode || 'WER').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'WER').slice(0, 6);
  return 'PMTS/' + code + '/' + yy + '-' + mm + '-' + seq;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function getAllCertificates() {
  try {
    return JSON.parse(localStorage.getItem('pmts_certificates') || '[]');
  } catch (e) {
    return [];
  }
}

function saveCertificate(cert) {
  var certs = getAllCertificates();
  cert.id        = cert.id        || String(Date.now());
  cert.createdAt = cert.createdAt || new Date().toISOString();
  var idx = certs.findIndex(function (c) { return c.id === cert.id; });
  if (idx >= 0) {
    certs[idx] = cert;
  } else {
    certs.push(cert);
  }
  localStorage.setItem('pmts_certificates', JSON.stringify(certs));
  return cert;
}

function deleteCertificate(id) {
  var certs = getAllCertificates().filter(function (c) { return c.id !== id; });
  localStorage.setItem('pmts_certificates', JSON.stringify(certs));
}

function getCertificateById(id) {
  return getAllCertificates().find(function (c) { return c.id === id; }) || null;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string (YYYY-MM-DD) as "02 February 2023".
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Show an alert notification at the top of the admin page.
 * @param {string} message
 * @param {'success'|'error'} type
 */
function showNotification(message, type) {
  var el = document.getElementById('notification');
  if (!el) return;
  el.className = 'alert alert-' + type;
  el.textContent = message;
  el.style.display = 'flex';
  setTimeout(function () { el.style.display = 'none'; }, 4000);
}
