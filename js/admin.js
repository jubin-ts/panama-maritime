// ===== Admin Panel Logic =====

var currentCertData = null;

document.addEventListener('DOMContentLoaded', function () {
  // Default issue date to today
  var today = new Date().toISOString().split('T')[0];
  document.getElementById('issue-date').value = today;

  // Load certificates from JSON file and remote, then render
  loadCertificatesFromJSON().then(function () {
    return loadRemoteAndMerge();
  }).then(function () {
    renderCertificatesList();
  });
  bindEvents();
});

/**
 * Fetch from GitHub raw URL and merge with local data on admin load.
 * Ensures admin always sees ALL certificates even if localStorage was cleared.
 */
function loadRemoteAndMerge() {
  var token = getGitHubToken();
  if (!token) return Promise.resolve();
  var rawUrl = 'https://raw.githubusercontent.com/jubin-ts/panama-maritime/main/data/certificates.json?t=' + Date.now();
  return fetch(rawUrl)
    .then(function (res) { return res.json(); })
    .then(function (remoteCerts) {
      if (Array.isArray(remoteCerts) && remoteCerts.length > 0) {
        mergeCertificates(remoteCerts);
      }
    })
    .catch(function () { /* offline — use local only */ });
}

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
  document.getElementById('btn-export').addEventListener('click', exportCertificatesJSON);
  document.getElementById('btn-import').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    importCertificatesJSON(file).then(function (count) {
      renderCertificatesList();
      showNotification('Imported successfully! Total: ' + count + ' certificates.', 'success');
    }).catch(function () {
      showNotification('Failed to import. Check the file format.', 'error');
    });
    e.target.value = '';
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

  // Build table via DOM (not innerHTML) for the action buttons to avoid
  // injecting cert.id into inline onclick attributes.
  var wrapper = document.createElement('div');
  wrapper.className = 'certs-table-wrapper';

  var table = document.createElement('table');
  table.className = 'certs-table';
  table.innerHTML =
    '<thead><tr>' +
      '<th>Participant Name</th>' +
      '<th>Passport / ID</th>' +
      '<th>Register Code</th>' +
      '<th>Issue Date</th>' +
      '<th>Course</th>' +
      '<th>Actions</th>' +
    '</tr></thead>';

  var tbody = document.createElement('tbody');

  certs.slice().reverse().forEach(function (cert) {
    var tr = document.createElement('tr');

    // Text cells – set via textContent so no HTML injection is possible.
    var cells = [
      cert.participantName || '—',
      cert.passportId      || '—',
      cert.registerCode    || '—',
      formatDate(cert.issueDate),
      cert.courseName      || '—'
    ];
    cells.forEach(function (text) {
      var td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    });

    // Action buttons – use data-id attribute; click handled by event delegation.
    var tdActions  = document.createElement('td');
    var actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions-cell';

    var btnQr = document.createElement('button');
    btnQr.className = 'btn btn-primary btn-sm';
    btnQr.textContent = '🔳 QR';
    btnQr.dataset.action = 'qr';
    btnQr.dataset.id     = cert.id;

    var btnEdit = document.createElement('button');
    btnEdit.className = 'btn btn-secondary btn-sm';
    btnEdit.textContent = '✏️ Edit';
    btnEdit.dataset.action = 'edit';
    btnEdit.dataset.id     = cert.id;

    var btnDel = document.createElement('button');
    btnDel.className = 'btn btn-danger btn-sm';
    btnDel.textContent = '🗑';
    btnDel.dataset.action = 'delete';
    btnDel.dataset.id     = cert.id;

    actionsDiv.appendChild(btnQr);
    actionsDiv.appendChild(btnEdit);
    actionsDiv.appendChild(btnDel);
    tdActions.appendChild(actionsDiv);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.innerHTML = '';
  container.appendChild(wrapper);
}

// Event delegation for table action buttons
document.addEventListener('click', function (e) {
  var btn = e.target.closest('button[data-action]');
  if (!btn) return;
  var action = btn.dataset.action;
  var id     = btn.dataset.id;
  if (action === 'qr')     showQRForCert(id);
  if (action === 'edit')   editCertificate(id);
  if (action === 'delete') confirmDelete(id);
});

// ── GitHub Sync UI ────────────────────────────────────────────────────────────

(function () {
  var setupBtn  = document.getElementById('btn-setup-token');
  var statusEl  = document.getElementById('sync-status');
  if (!setupBtn) return;

  updateSyncStatus();

  setupBtn.addEventListener('click', function () {
    var current = getGitHubToken();
    var token = prompt(
      'Enter your GitHub Personal Access Token (with repo content write access).\n\n' +
      'This is stored only in your browser and used to sync certificates to the repository.\n\n' +
      'Current: ' + (current ? '••••' + current.slice(-4) : 'Not set'),
      current || ''
    );
    if (token !== null) {
      setGitHubToken(token.trim());
      updateSyncStatus();
      if (token.trim()) {
        syncToGitHub();
        showNotification('GitHub token saved. Certificates will now sync automatically.', 'success');
      } else {
        showNotification('GitHub token removed. Auto-sync disabled.', 'error');
      }
    }
  });

  function updateSyncStatus() {
    var token = getGitHubToken();
    if (token) {
      statusEl.innerHTML = '<span style="color:var(--success);">● Sync active</span>';
    } else {
      statusEl.innerHTML = '<span style="color:var(--text-light);">○ Sync not configured</span>';
    }
  }
})();

function esc(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
