// ===== PMTS Certificate System – Shared Utilities =====

// ── Loading screen dismiss ────────────────────────────────────────────────────
(function () {
  window.addEventListener('load', function () {
    var loader = document.getElementById('loading-screen');
    if (loader) {
      setTimeout(function () {
        loader.classList.add('fade-out');
      }, 800);
    }
  });
})();

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

// ── Data storage (JSON file + localStorage) ───────────────────────────────────
// Certificates are stored in localStorage for immediate admin use.
// A JSON file (data/certificates.json) serves as the persistent backup.
// On load, data from the JSON file is merged into localStorage.
// Admin can export current data to update the JSON file in the repo.

var _certsLoaded = false;

function loadCertificatesFromJSON() {
  if (_certsLoaded) return Promise.resolve();
  _certsLoaded = true;
  return fetch('data/certificates.json')
    .then(function (res) { return res.json(); })
    .then(function (jsonCerts) {
      if (!Array.isArray(jsonCerts) || jsonCerts.length === 0) return;
      var local = getAllCertificates();
      var localIds = {};
      local.forEach(function (c) { localIds[c.id] = true; });
      var merged = local.slice();
      jsonCerts.forEach(function (c) {
        if (!localIds[c.id]) merged.push(c);
      });
      localStorage.setItem('pmts_certificates', JSON.stringify(merged));
    })
    .catch(function () { /* JSON file not available or empty */ });
}

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
  syncToGitHub();
  return cert;
}

function deleteCertificate(id) {
  var certs = getAllCertificates().filter(function (c) { return c.id !== id; });
  localStorage.setItem('pmts_certificates', JSON.stringify(certs));
  syncToGitHub();
}

function getCertificateById(id) {
  return getAllCertificates().find(function (c) { return c.id === id; }) || null;
}

function exportCertificatesJSON() {
  var certs = getAllCertificates();
  var json = JSON.stringify(certs, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'certificates.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importCertificatesJSON(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) { reject('Invalid format'); return; }
        var local = getAllCertificates();
        var localIds = {};
        local.forEach(function (c) { localIds[c.id] = true; });
        imported.forEach(function (c) {
          if (!localIds[c.id]) local.push(c);
        });
        localStorage.setItem('pmts_certificates', JSON.stringify(local));
        resolve(local.length);
      } catch (err) { reject(err); }
    };
    reader.readAsText(file);
  });
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

// ── GitHub Sync ───────────────────────────────────────────────────────────────
// Pushes current certificates to data/certificates.json in the GitHub repo
// so the verify page (and any visitor) can access them on the live site.

var GITHUB_REPO = 'jubin-ts/panama-maritime';
var GITHUB_FILE_PATH = 'data/certificates.json';

function getGitHubToken() {
  return localStorage.getItem('pmts_github_token') || '';
}

function setGitHubToken(token) {
  localStorage.setItem('pmts_github_token', token);
}

var _syncRetryCount = 0;
var _syncPending = false;

function syncToGitHub() {
  var token = getGitHubToken();
  if (!token) return Promise.resolve();
  if (_syncPending) return Promise.resolve();
  _syncPending = true;

  var certs = getAllCertificates();
  var content = btoa(unescape(encodeURIComponent(JSON.stringify(certs, null, 2))));
  var apiUrl = 'https://api.github.com/repos/' + GITHUB_REPO + '/contents/' + GITHUB_FILE_PATH;

  // First get the current file SHA (required for updates)
  return fetch(apiUrl, {
    headers: { 'Authorization': 'token ' + token }
  })
  .then(function (res) { return res.json(); })
  .then(function (data) {
    var sha = data.sha || undefined;
    var body = {
      message: 'Update certificates data',
      content: content,
      branch: 'main'
    };
    if (sha) body.sha = sha;

    return fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  })
  .then(function (res) {
    _syncPending = false;
    if (res.ok) {
      _syncRetryCount = 0;
      showNotification('✓ Certificates synced to cloud.', 'success');
    } else {
      handleSyncFailure('Sync failed (HTTP ' + res.status + ')');
    }
  })
  .catch(function (err) {
    _syncPending = false;
    handleSyncFailure('Sync error: ' + err.message);
  });
}

function handleSyncFailure(reason) {
  _syncRetryCount++;
  console.warn('GitHub sync attempt ' + _syncRetryCount + ':', reason);
  if (_syncRetryCount <= 3) {
    // Auto-retry after a delay
    setTimeout(function () { syncToGitHub(); }, 3000 * _syncRetryCount);
    showNotification('⚠ Sync failed, retrying... (attempt ' + _syncRetryCount + '/3)', 'error');
  } else {
    _syncRetryCount = 0;
    showNotification('❌ Sync failed after 3 attempts. Data is saved locally. Please check your token or internet.', 'error');
  }
}

/**
 * Merge remote certificates with local ones (union by id). Prevents data loss
 * if either side has certificates the other doesn't.
 */
function mergeCertificates(remoteCerts) {
  var local = getAllCertificates();
  var idMap = {};
  // Local data takes priority (admin may have unsaved edits)
  local.forEach(function (c) { idMap[c.id] = c; });
  // Add remote-only certificates
  remoteCerts.forEach(function (c) {
    if (!idMap[c.id]) idMap[c.id] = c;
  });
  var merged = Object.keys(idMap).map(function (k) { return idMap[k]; });
  localStorage.setItem('pmts_certificates', JSON.stringify(merged));
  return merged;
}
