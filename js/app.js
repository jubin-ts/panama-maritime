// ===== PMTS Certificate System – Shared Utilities =====

/**
 * Encode certificate data as a base64 string (UTF-8 safe, no deprecated helpers).
 * Uses TextEncoder when available, with a plain ASCII fallback.
 * @param {Object} data
 * @returns {string}
 */
function encodeData(data) {
  var json = JSON.stringify(data);
  try {
    var bytes  = new TextEncoder().encode(json);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    return btoa(json);
  }
}

/**
 * Decode a base64 string back to a certificate data object.
 * Uses TextDecoder when available, with a plain ASCII fallback.
 * @param {string} encoded
 * @returns {Object|null}
 */
function decodeData(encoded) {
  try {
    var binary = atob(encoded);
    var bytes  = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
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
// Note: Certificate data is stored in the admin's own browser localStorage for
// convenience. The same data is intentionally encoded in public QR code URLs,
// so it is not confidential. No passwords or financial data are stored here.

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
  // Store only on the admin's local device; same data is public via QR URL.
  localStorage.setItem('pmts_certificates', JSON.stringify(certs));
  return cert;
}

function deleteCertificate(id) {
  var certs = getAllCertificates().filter(function (c) { return c.id !== id; });
  // Persist the updated (smaller) list on the admin's local device.
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
