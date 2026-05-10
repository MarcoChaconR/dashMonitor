const allProcesses = [];
let currentSort = 'cpu';
let currentOrder = 'desc';

function renderProcesses(data) {
  allProcesses.length = 0;
  data.processes.forEach(function(p) { allProcesses.push(p); });
  applyFilter();
}

function applyFilter() {
  const q = (document.getElementById('proc-filter').value || '').toLowerCase();
  const filtered = q ? allProcesses.filter(function(p) { return p.name.toLowerCase().includes(q); }) : allProcesses;
  const tbody = document.getElementById('proc-tbody');
  tbody.innerHTML = '';
  filtered.forEach(function(p) { tbody.appendChild(renderRow(p)); });
}

function renderRow(proc) {
  const tr = document.createElement('tr');
  const cpuClass = proc.cpu_percent > 80 ? 'cpu-crit' : (proc.cpu_percent > 50 ? 'cpu-warn' : 'cpu-ok');
  const statusClass = proc.status === 'running' ? 'bg-success' : 'bg-secondary';
  tr.innerHTML =
    '<td>' + proc.pid + '</td>' +
    '<td>' + escapeHtml(proc.name) + '</td>' +
    '<td>' + escapeHtml(proc.username) + '</td>' +
    '<td class="' + cpuClass + '">' + proc.cpu_percent.toFixed(1) + '</td>' +
    '<td>' + proc.memory_percent.toFixed(1) + '</td>' +
    '<td>' + proc.memory_mb.toFixed(1) + '</td>' +
    '<td><span class="badge ' + statusClass + '">' + proc.status + '</span></td>' +
    '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(proc.command) + '</td>' +
    '<td><button class="btn btn-sm btn-outline-danger kill-btn" data-pid="' + proc.pid + '" data-name="' + escapeHtml(proc.name) + '"><i class="bi bi-x-circle"></i></button></td>';
  tr.querySelector('.kill-btn').addEventListener('click', function() {
    confirmKill(proc.pid, proc.name);
  });
  return tr;
}

function confirmKill(pid, name) {
  Swal.fire({
    title: '¿Terminar proceso?',
    text: 'PID ' + pid + ' (' + name + ')',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f85149',
    confirmButtonText: 'Sí, terminar',
    cancelButtonText: 'Cancelar'
  }).then(function(result) {
    if (result.isConfirmed) {
      apiFetch('/api/processes/' + pid, { method: 'DELETE' })
        .then(function(resp) {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Proceso ' + pid + ' terminado', showConfirmButton: false, timer: 3000 });
        })
        .catch(function(err) {
          Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error: ' + err.message, showConfirmButton: false, timer: 5000 });
        });
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateSortIndicators() {
  document.querySelectorAll('th.sortable').forEach(function(th) {
    var span = th.querySelector('.sort-indicator');
    var field = th.getAttribute('data-sort');
    if (field === currentSort) {
      span.textContent = currentOrder === 'desc' ? ' ▼' : ' ▲';
    } else {
      span.textContent = '';
    }
  });
}

function setSort(field) {
  if (field === currentSort) {
    currentOrder = currentOrder === 'desc' ? 'asc' : 'desc';
  } else {
    currentSort = field;
    currentOrder = 'desc';
  }
  document.getElementById('proc-sort').value = currentSort;
  updateSortIndicators();
  if (state.token) fetchProcesses();
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('proc-filter').addEventListener('input', applyFilter);
  document.getElementById('proc-sort').addEventListener('change', function() {
    setSort(this.value);
  });
  document.querySelectorAll('th.sortable').forEach(function(th) {
    th.addEventListener('click', function() {
      setSort(this.getAttribute('data-sort'));
    });
  });
});
