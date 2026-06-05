// ===== Certificate Verification Page =====

document.addEventListener('DOMContentLoaded', function () {
  // Load certificates from GitHub raw URL (bypasses Pages cache) and local JSON
  loadCertificatesFromRemote().then(function () {
    // Check if there's a query in the URL hash
    var hash = window.location.hash.slice(1);
    if (hash) {
      document.getElementById('verify-input').value = decodeURIComponent(hash);
      performSearch(decodeURIComponent(hash));
    }
  });

  document.getElementById('verify-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var query = document.getElementById('verify-input').value.trim();
    if (query) {
      performSearch(query);
    }
  });
});

/**
 * Fetch certificates from GitHub raw content (always fresh, no CDN cache)
 * AND the locally served JSON file. Merges all sources with localStorage
 * so no data is ever lost regardless of sync state.
 */
function loadCertificatesFromRemote() {
  var rawUrl = 'https://raw.githubusercontent.com/jubin-ts/panama-maritime/main/data/certificates.json?t=' + Date.now();
  var localUrl = 'data/certificates.json?t=' + Date.now();

  var fetchRemote = fetch(rawUrl)
    .then(function (res) { return res.json(); })
    .catch(function () { return []; });

  var fetchLocal = fetch(localUrl)
    .then(function (res) { return res.json(); })
    .catch(function () { return []; });

  return Promise.all([fetchRemote, fetchLocal]).then(function (results) {
    var remoteCerts = Array.isArray(results[0]) ? results[0] : [];
    var localFileCerts = Array.isArray(results[1]) ? results[1] : [];
    var storedCerts = getAllCertificates();

    // Merge all sources by id (union) — no data is lost
    var idMap = {};
    remoteCerts.forEach(function (c) { if (c && c.id) idMap[c.id] = c; });
    localFileCerts.forEach(function (c) { if (c && c.id && !idMap[c.id]) idMap[c.id] = c; });
    storedCerts.forEach(function (c) { if (c && c.id && !idMap[c.id]) idMap[c.id] = c; });

    var merged = Object.keys(idMap).map(function (k) { return idMap[k]; });
    if (merged.length > 0) {
      localStorage.setItem('pmts_certificates', JSON.stringify(merged));
    }
  });
}

function performSearch(query) {
  var resultContainer = document.getElementById('verify-result');
  var certs = getAllCertificates();
  var normalizedQuery = query.toLowerCase().replace(/\s+/g, '');

  var matches = certs.filter(function (c) {
    var passport = (c.passportId || '').toLowerCase().replace(/\s+/g, '');
    var regCode  = (c.registerCode || '').toLowerCase().replace(/\s+/g, '');
    return passport === normalizedQuery ||
           regCode === normalizedQuery ||
           passport.indexOf(normalizedQuery) !== -1 ||
           regCode.indexOf(normalizedQuery) !== -1 ||
           normalizedQuery.indexOf(passport) !== -1 && passport.length > 0 ||
           normalizedQuery.indexOf(regCode) !== -1 && regCode.length > 0;
  });

  if (matches.length === 0) {
    resultContainer.innerHTML =
      '<div class="verify-not-found">' +
        '<div class="icon">&#9888;&#65039;</div>' +
        '<h3>No Certificate Found</h3>' +
        '<p>No certificate matches the provided Passport / ID or Register Code.</p>' +
        '<p class="hint">Please check the number and try again, or contact Panama Maritime Training Services.</p>' +
      '</div>';
    return;
  }

  var html = matches.map(function (cert) {
    return renderCertCard(cert);
  }).join('');

  resultContainer.innerHTML = html;
}

function renderCertCard(cert) {
  var fields = [
    { label: "Participant's Name",           value: cert.participantName },
    { label: "Participant's Passport / ID",  value: cert.passportId      },
    { label: "Nationality",                  value: cert.nationality     },
    { label: "Course Name",                  value: cert.courseName      },
    { label: "Certificate Type",             value: cert.certType        },
    { label: "Register Code",               value: cert.registerCode    },
    { label: "Certificate Date of Issuance", value: formatDate(cert.issueDate) },
    { label: "Expiry Date",                  value: cert.expiryDate ? formatDate(cert.expiryDate) : '' },
    { label: "Issuing Officer",              value: cert.issuingOfficer  }
  ].filter(function (f) {
    return f.value && String(f.value).trim() !== '';
  });

  var fieldRows = fields.map(function (f) {
    return '<div class="cert-field-row">' +
      '<div class="cert-field-label">' + esc(f.label) + ':</div>' +
      '<div class="cert-field-value">' + esc(f.value)  + '</div>' +
    '</div>';
  }).join('');

  var detailsUrl = generateDetailsUrl(cert);

  return '<div class="cert-card verify-result-card">' +
    '<div class="cert-card-watermark"><img src="logo.png" alt=""></div>' +
    '<div class="cert-card-header">' +
      '<div class="cert-title">PMTS Authentic Certificate <span style="color:#28a745;">&#10004;</span></div>' +
    '</div>' +
    '<div class="cert-fields">' + fieldRows + '</div>' +
    '<div class="verify-card-actions">' +
      '<a href="' + esc(detailsUrl) + '" class="btn btn-primary btn-sm" target="_blank">View Full Certificate</a>' +
    '</div>' +
  '</div>';
}

function esc(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
