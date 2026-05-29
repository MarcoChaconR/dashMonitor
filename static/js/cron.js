function fetchCron() {
  apiFetch('/api/cron?source=root').then(function(data) {
    renderCron(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function renderCron(jobs) {
  var tbody = document.getElementById('cron-tbody');
  tbody.innerHTML = '';
  if (!jobs || jobs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No hay tareas cron para root</td></tr>';
    return;
  }
  jobs.forEach(function(j, i) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><code>' + escapeHtml(j.schedule) + '</code></td>' +
      '<td><code>' + escapeHtml(j.command) + '</code></td>' +
      '<td><small>' + escapeHtml(j.user || 'root') + '</small></td>' +
      '<td>' +
        '<button class="btn btn-sm btn-outline-secondary run-cron-btn me-1" data-cmd="' + escapeHtml(j.command) + '"><i class="bi bi-play-fill"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger delete-cron-btn" data-index="' + i + '"><i class="bi bi-trash"></i></button>' +
      '</td>';
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.run-cron-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      executeCronNow(this.getAttribute('data-cmd'));
    });
  });
  tbody.querySelectorAll('.delete-cron-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      confirmDeleteCron(parseInt(this.getAttribute('data-index')));
    });
  });
}

function executeCronNow(cmd) {
  apiFetch('/api/cron/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: cmd })
  }).then(function(data) {
    var output = 'Ejecución:\n';
    if (data.stdout) output += data.stdout;
    if (data.stderr) output += '\n' + data.stderr;
    output += '\nExit: ' + data.exit_code;
    Swal.fire({ title: 'Resultado', text: output, icon: 'info', confirmButtonText: 'Cerrar' });
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function confirmDeleteCron(index) {
  Swal.fire({
    title: 'Eliminar tarea cron',
    text: '¿Está seguro de eliminar esta tarea?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    confirmButtonColor: '#dc3545',
    cancelButtonText: 'Cancelar'
  }).then(function(result) {
    if (result.isConfirmed) {
      apiFetch('/api/cron/' + index + '?source=root', { method: 'DELETE' }).then(function() {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarea eliminada', showConfirmButton: false, timer: 2000 });
        fetchCron();
      }).catch(function(err) {
        if (err.message === 'Sesión expirada') return;
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: err.message, showConfirmButton: false, timer: 3000 });
      });
    }
  });
}

function showAddCronModal() {
  Swal.fire({
    title: 'Nueva tarea cron',
    html:
      '<div class="text-start">' +
      '<div class="mb-3">' +
      '<label class="form-label">Schedule (ej: 0 2 * * *)</label>' +
      '<input id="swal-cron-schedule" class="form-control" placeholder="* * * * *">' +
      '</div>' +
      '<div class="mb-3">' +
      '<label class="form-label">Comando</label>' +
      '<input id="swal-cron-command" class="form-control" placeholder="/ruta/al/comando">' +
      '</div>' +
      '</div>',
    showCancelButton: true,
    confirmButtonText: 'Agregar',
    cancelButtonText: 'Cancelar',
    preConfirm: function() {
      var schedule = document.getElementById('swal-cron-schedule').value.trim();
      var command = document.getElementById('swal-cron-command').value.trim();
      if (!schedule) { Swal.showValidationMessage('El schedule es requerido'); return false; }
      if (!command) { Swal.showValidationMessage('El comando es requerido'); return false; }
      return { schedule: schedule, command: command, source: 'root' };
    }
  }).then(function(result) {
    if (result.isConfirmed) {
      apiFetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      }).then(function(data) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: data.message, showConfirmButton: false, timer: 2000 });
        fetchCron();
      }).catch(function(err) {
        if (err.message === 'Sesión expirada') return;
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: err.message, showConfirmButton: false, timer: 3000 });
      });
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('cron-add-btn').addEventListener('click', showAddCronModal);
  document.getElementById('cron-refresh-btn').addEventListener('click', fetchCron);

  var link = document.querySelector('.nav-link[data-section="cron"]');
  if (link) {
    link.addEventListener('click', function() { fetchCron(); });
  }
});
