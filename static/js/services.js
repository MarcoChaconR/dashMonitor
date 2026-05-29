var servicesPending = {};

function fetchServices() {
  apiFetch('/api/services').then(function(data) {
    renderServices(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function renderServices(services) {
  var tbody = document.getElementById('svc-tbody');
  tbody.innerHTML = '';
  if (!services || services.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Sin servicios</td></tr>';
    return;
  }
  services.forEach(function(s) {
    var statusBadge = '';
    switch (s.status) {
      case 'active': statusBadge = '<span class="badge bg-success">activo</span>'; break;
      case 'inactive': statusBadge = '<span class="badge bg-secondary">inactivo</span>'; break;
      case 'failed': statusBadge = '<span class="badge bg-danger">falló</span>'; break;
      default: statusBadge = '<span class="badge bg-warning text-dark">' + escapeHtml(s.status) + '</span>';
    }

    var actions = '';
    var pending = servicesPending[s.name];
    if (pending) {
      actions = '<span class="text-muted small">' + pending + '...</span>';
    } else {
      if (s.status === 'active') {
        actions = '<button class="btn btn-sm btn-outline-warning svc-stop me-1" data-name="' + escapeHtml(s.name) + '">stop</button>' +
                  '<button class="btn btn-sm btn-outline-info svc-restart" data-name="' + escapeHtml(s.name) + '">restart</button>';
      } else {
        actions = '<button class="btn btn-sm btn-outline-success svc-start" data-name="' + escapeHtml(s.name) + '">start</button>';
      }
    }

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + escapeHtml(s.name) + '</strong>' + (s.description ? '<br><small class="text-muted">' + escapeHtml(s.description) + '</small>' : '') + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' + actions + '</td>';
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.svc-start').forEach(function(btn) {
    btn.addEventListener('click', function() { svcAction(this.getAttribute('data-name'), 'start'); });
  });
  tbody.querySelectorAll('.svc-stop').forEach(function(btn) {
    btn.addEventListener('click', function() { svcAction(this.getAttribute('data-name'), 'stop'); });
  });
  tbody.querySelectorAll('.svc-restart').forEach(function(btn) {
    btn.addEventListener('click', function() { svcAction(this.getAttribute('data-name'), 'restart'); });
  });
}

function svcAction(name, action) {
  servicesPending[name] = action;
  renderServices(currentServicesCache);
  apiFetch('/api/services/' + encodeURIComponent(name) + '/' + action, { method: 'POST' }).then(function() {
    delete servicesPending[name];
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: name + ': ' + action + ' ejecutado', showConfirmButton: false, timer: 2000 });
    fetchServices();
  }).catch(function(err) {
    delete servicesPending[name];
    if (err.message === 'Sesión expirada') return;
    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: err.message, showConfirmButton: false, timer: 3000 });
    fetchServices();
  });
}

var currentServicesCache = [];

function fetchServicesWithCache() {
  apiFetch('/api/services').then(function(data) {
    currentServicesCache = data;
    renderServices(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('svc-refresh-btn').addEventListener('click', fetchServicesWithCache);
  document.getElementById('svc-filter').addEventListener('input', function() {
    var q = this.value.toLowerCase();
    var filtered = currentServicesCache.filter(function(s) { return s.name.toLowerCase().indexOf(q) !== -1; });
    renderServices(filtered);
  });

  var link = document.querySelector('.nav-link[data-section="services"]');
  if (link) {
    link.addEventListener('click', function() { fetchServicesWithCache(); });
  }
});
