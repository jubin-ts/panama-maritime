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
 * Fetch certificates from GitHub raw content (always fresh, no CDN cache).
 * Merges with any local data to avoid data loss.
 * Falls back to the local data/certificates.json if GitHub is unreachable.
 */
function loadCertificatesFromRemote() {
  var rawUrl = 'https://raw.githubusercontent.com/jubin-ts/panama-maritime/main/data/certificates.json?t=' + Date.now();
  return fetch(rawUrl)
    .then(function (res) { return res.json(); })
    .then(function (remoteCerts) {
      if (Array.isArray(remoteCerts) && remoteCerts.length > 0) {
        // Merge remote with local (keep union of both)
        var local = getAllCertificates();
        var idMap = {};
        remoteCerts.forEach(function (c) { idMap[c.id] = c; });
        local.forEach(function (c) { if (!idMap[c.id]) idMap[c.id] = c; });
        var merged = Object.keys(idMap).map(function (k) { return idMap[k]; });
        localStorage.setItem('pmts_certificates', JSON.stringify(merged));
      }
    })
    .catch(function () {
      // Fallback to local JSON file
      return loadCertificatesFromJSON();
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
           regCode.indexOf(normalizedQuery) !== -1;
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
