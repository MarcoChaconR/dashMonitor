var alertConfig = null;

function fetchAlertConfig() {
  apiFetch('/api/alerts/config').then(function(data) {
    alertConfig = data;
    renderAlertConfig(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function renderAlertConfig(config) {
  var container = document.getElementById('alerts-config-body');
  var types = [
    { key: 'cpu', label: 'CPU (%)', icon: 'cpu' },
    { key: 'memory', label: 'Memoria (%)', icon: 'memory' },
    { key: 'disk', label: 'Disco (%)', icon: 'hdd' },
    { key: 'temperature', label: 'Temperatura (°C)', icon: 'thermometer-half' },
  ];

  container.innerHTML = types.map(function(t) {
    var c = config[t.key] || {};
    return '<div class="card p-3 mb-2">' +
      '<div class="d-flex align-items-center gap-3">' +
        '<i class="bi bi-' + t.icon + ' fs-5"></i>' +
        '<div class="flex-grow-1"><strong>' + t.label + '</strong></div>' +
        '<div class="form-check form-switch">' +
          '<input class="form-check-input alert-toggle" type="checkbox" data-key="' + t.key + '" ' + (c.enabled !== false ? 'checked' : '') + '>' +
        '</div>' +
      '</div>' +
      '<div class="row mt-2 g-2">' +
        '<div class="col-6">' +
          '<label class="form-label small">Warning</label>' +
          '<input type="number" class="form-control form-control-sm alert-warning" data-key="' + t.key + '" value="' + (c.warning || 0) + '">' +
        '</div>' +
        '<div class="col-6">' +
          '<label class="form-label small">Critical</label>' +
          '<input type="number" class="form-control form-control-sm alert-critical" data-key="' + t.key + '" value="' + (c.critical || 0) + '">' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  container.querySelectorAll('.alert-toggle, .alert-warning, .alert-critical').forEach(function(el) {
    el.addEventListener('change', collectAndSave);
  });
}

function collectAndSave() {
  var config = {};
  ['cpu', 'memory', 'disk', 'temperature'].forEach(function(key) {
    config[key] = {
      enabled: document.querySelector('.alert-toggle[data-key="' + key + '"]').checked,
      warning: parseInt(document.querySelector('.alert-warning[data-key="' + key + '"]').value) || 0,
      critical: parseInt(document.querySelector('.alert-critical[data-key="' + key + '"]').value) || 0,
    };
  });

  apiFetch('/api/alerts/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  }).then(function() {
    alertConfig = config;
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Umbrales guardados', showConfirmButton: false, timer: 2000 });
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function showAlertToast(alert) {
  var levelIcon = alert.level === 'critical' ? 'error' : 'warning';
  var title = alert.type.toUpperCase() + ' ' + alert.level + ' (' + alert.value + '%)';
  Swal.fire({ toast: true, position: 'top-end', icon: levelIcon, title: title, showConfirmButton: false, timer: 5000 });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function() {
  var link = document.querySelector('.nav-link[data-section="alerts"]');
  if (link) link.addEventListener('click', function() { fetchAlertConfig(); });
});
