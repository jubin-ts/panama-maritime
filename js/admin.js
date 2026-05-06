// ===== Admin Panel Logic =====

var currentCertData = null;

document.addEventListener('DOMContentLoaded', function () {
  // Default issue date to today
  var today = new Date().toISOString().split('T')[0];
  document.getElementById('issue-date').value = today;

  renderCertificatesList();
  bindEvents();
});

function bindEvents() {
  document.getElementById('cert-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('btn-clear').addEventListener('click', clearForm);
  document.getElementById('btn-gen-code').addEventListener('click', function () {
    var courseCode = document.getElementById('course-code').value;
    document.getElementById('register-code').value = generateRegisterCode(courseCode);
  });
  document.getElementById('btn-download-qr').addEventListener('click', downloadQR);
  document.getElementById('btn-view-cert').addEventListener('click', viewCertificate);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('qr-modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
}

// ── Form handling ─────────────────────────────────────────────────────────────

function handleFormSubmit(e) {
  e.preventDefault();

  var name      = document.getElementById('participant-name').value.trim();
  var passport  = document.getElementById('passport-id').value.trim();
  var course    = document.getElementById('course-name').value.trim();
  var issueDate = document.getElementById('issue-date').value;

  if (!name || !passport || !course || !issueDate) {
    showNotification('Please fill in all required fields (*).', 'error');
    return;
  }

  // Auto-generate register code if empty
  var regCode = document.getElementById('register-code').value.trim();
  if (!regCode) {
    regCode = generateRegisterCode(document.getElementById('course-code').value);
    document.getElementById('register-code').value = regCode;
  }

  var cert = {
    id:               document.getElementById('cert-id').value || null,
    participantName:  name.toUpperCase(),
    passportId:       passport,
    courseName:       course,
    courseCode:       document.getElementById('course-code').value.trim(),
    registerCode:     regCode,
    issueDate:        issueDate,
    expiryDate:       document.getElementById('expiry-date').value,
    certType:         document.getElementById('cert-type').value,
    nationality:      document.getElementById('nationality').value.trim(),
    issuingOfficer:   document.getElementById('issuing-officer').value.trim()
  };

  var saved = saveCertificate(cert);
  renderCertificatesList();
  showQRModal(saved);
  showNotification('Certificate saved successfully!', 'success');
}

function clearForm() {
  document.getElementById('cert-id').value            = '';
  document.getElementById('participant-name').value   = '';
  document.getElementById('passport-id').value        = '';
  document.getElementById('course-name').value        = '';
  document.getElementById('course-code').value        = '';
  document.getElementById('register-code').value      = '';
  document.getElementById('expiry-date').value        = '';
  document.getElementById('cert-type').value          = '';
  document.getElementById('nationality').value        = '';
  document.getElementById('issuing-officer').value    = '';
  document.getElementById('form-title').textContent   = 'New Certificate';
  var today = new Date().toISOString().split('T')[0];
  document.getElementById('issue-date').value = today;
}

// ── Edit / Delete ─────────────────────────────────────────────────────────────

function editCertificate(id) {
  var cert = getCertificateById(id);
  if (!cert) return;
  document.getElementById('cert-id').value           = cert.id;
  document.getElementById('participant-name').value  = cert.participantName  || '';
  document.getElementById('passport-id').value       = cert.passportId       || '';
  document.getElementById('course-name').value       = cert.courseName       || '';
  document.getElementById('course-code').value       = cert.courseCode       || '';
  document.getElementById('register-code').value     = cert.registerCode     || '';
  document.getElementById('issue-date').value        = cert.issueDate        || '';
  document.getElementById('expiry-date').value       = cert.expiryDate       || '';
  document.getElementById('cert-type').value         = cert.certType         || '';
  document.getElementById('nationality').value       = cert.nationality      || '';
  document.getElementById('issuing-officer').value   = cert.issuingOfficer   || '';
  document.getElementById('form-title').textContent  = 'Edit Certificate';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function confirmDelete(id) {
  if (confirm('Delete this certificate? This cannot be undone.')) {
    deleteCertificate(id);
    renderCertificatesList();
    showNotification('Certificate deleted.', 'success');
  }
}

// ── QR Code modal ─────────────────────────────────────────────────────────────

function showQRForCert(id) {
  var cert = getCertificateById(id);
  if (cert) showQRModal(cert);
}

function showQRModal(cert) {
  currentCertData = cert;
  var url = generateDetailsUrl(cert);

  document.getElementById('qr-modal-name').textContent  = cert.participantName;
  document.getElementById('qr-url-display').textContent = url;

  // Clear previous QR code
  var container = document.getElementById('qr-container');
  container.innerHTML = '';

  // Render new QR code
  /* global QRCode */
  new QRCode(container, {
    text:         url,
    width:        240,
    height:       240,
    colorDark:    '#1a3a6b',
    colorLight:   '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  document.getElementById('qr-modal').classList.add('active');
}

function downloadQR() {
  var canvas = document.querySelector('#qr-container canvas');
  var img    = document.querySelector('#qr-container img');
  var dataUrl;

  if (canvas) {
    dataUrl = canvas.toDataURL('image/png');
  } else if (img) {
    var c = document.createElement('canvas');
    c.width  = img.naturalWidth  || 240;
    c.height = img.naturalHeight || 240;
    c.getContext('2d').drawImage(img, 0, 0);
    dataUrl = c.toDataURL('image/png');
  } else {
    return;
  }

  var name = currentCertData
    ? (currentCertData.registerCode || 'certificate').replace(/\//g, '-')
    : 'certificate';

  var link = document.createElement('a');
  link.download = 'PMTS-QR-' + name + '.png';
  link.href     = dataUrl;
  link.click();
}

function viewCertificate() {
  if (!currentCertData) return;
  window.open(generateDetailsUrl(currentCertData), '_blank');
}

function closeModal() {
  document.getElementById('qr-modal').classList.remove('active');
  currentCertData = null;
}

// ── Render certificates list ──────────────────────────────────────────────────

function renderCertificatesList() {
  var certs     = getAllCertificates();
  var container = document.getElementById('certs-container');
  var countEl   = document.getElementById('cert-count');

  countEl.textContent = certs.length + ' record' + (certs.length !== 1 ? 's' : '');

  if (certs.length === 0) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<div class="icon">📋</div>' +
        '<p>No certificates yet. Use the form above to create one.</p>' +
      '</div>';
    return;
  }

  var rows = certs.slice().reverse().map(function (cert) {
    return '<tr>' +
      '<td>' + esc(cert.participantName  || '—') + '</td>' +
      '<td>' + esc(cert.passportId       || '—') + '</td>' +
      '<td>' + esc(cert.registerCode     || '—') + '</td>' +
      '<td>' + formatDate(cert.issueDate)         + '</td>' +
      '<td>' + esc(cert.courseName       || '—') + '</td>' +
      '<td>' +
        '<div class="actions-cell">' +
          '<button class="btn btn-primary btn-sm" onclick="showQRForCert(\'' + cert.id + '\')">🔳 QR</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="editCertificate(\'' + cert.id + '\')">✏️ Edit</button>' +
          '<button class="btn btn-danger btn-sm" onclick="confirmDelete(\'' + cert.id + '\')">🗑</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  container.innerHTML =
    '<div class="certs-table-wrapper">' +
      '<table class="certs-table">' +
        '<thead><tr>' +
          '<th>Participant Name</th>' +
          '<th>Passport / ID</th>' +
          '<th>Register Code</th>' +
          '<th>Issue Date</th>' +
          '<th>Course</th>' +
          '<th>Actions</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';
}

function esc(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
