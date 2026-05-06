// ===== Certificate Details / Public Verification Page =====

document.addEventListener('DOMContentLoaded', function () {
  var container = document.getElementById('cert-card-container');
  var printBar  = document.getElementById('cert-print-bar');
  var hash      = window.location.hash.slice(1);

  if (!hash) {
    // No certificate data — redirect to home page
    window.location.href = 'index.html';
    return;
  }

  var data = decodeData(hash);
  if (!data) {
    // Invalid data — redirect to home page
    window.location.href = 'index.html';
    return;
  }

  renderCertificate(container, data);
  printBar.style.display = 'flex';
});

// ── Render helpers ────────────────────────────────────────────────────────────

function renderCertificate(container, d) {
  var fields = [
    { label: "Participant's Name",            value: d.participantName },
    { label: "Participant's Passport / ID",   value: d.passportId      },
    { label: "Nationality",                   value: d.nationality     },
    { label: "Course Name",                   value: d.courseName      },
    { label: "Certificate Type",              value: d.certType        },
    { label: "Register Code",                 value: d.registerCode    },
    { label: "Certificate Date of Issuance",  value: formatDate(d.issueDate) },
    { label: "Expiry Date",                   value: d.expiryDate ? formatDate(d.expiryDate) : '' },
    { label: "Issuing Officer",               value: d.issuingOfficer  }
  ].filter(function (f) {
    return f.value && String(f.value).trim() !== '';
  });

  var fieldRows = fields.map(function (f) {
    return '<div class="cert-field-row">' +
      '<div class="cert-field-label">' + esc(f.label) + ':</div>' +
      '<div class="cert-field-value">' + esc(f.value)  + '</div>' +
    '</div>';
  }).join('');

  container.innerHTML =
    '<div class="cert-card">' +
      /* Watermark inside the card */
      '<div class="cert-card-watermark">' +
        '<img src="logo.png" alt="">' +
      '</div>' +
      /* Header */
      '<div class="cert-card-header">' +
        '<div class="cert-title">PMTS Authentic Certificate</div>' +
      '</div>' +
      /* Status row */
      '<div class="cert-status-row">' +
        '<span class="cert-status-icon">&#10004;</span>' +
        '<span class="cert-status-text">Authentic Certificate</span>' +
      '</div>' +
      /* Fields */
      '<div class="cert-fields">' + fieldRows + '</div>' +
    '</div>';
}

function renderNotFound(container, message) {
  container.innerHTML =
    '<div class="cert-card">' +
      '<div class="cert-not-found">' +
        '<div class="icon">&#9888;&#65039;</div>' +
        '<h3 style="color:#1a3a6b;margin-bottom:10px;">Certificate Not Found</h3>' +
        '<p>' + esc(message) + '</p>' +
        '<p style="margin-top:14px;font-size:.86rem;color:#7a9ab8;">' +
          'Please scan the QR code again or contact Panama Maritime Training Services.' +
        '</p>' +
        '<a href="index.html" class="btn btn-outline" style="margin-top:20px;">← Home</a>' +
      '</div>' +
    '</div>';
}

function esc(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
