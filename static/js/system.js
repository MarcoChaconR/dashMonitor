function fetchSystemInfo() {
  apiFetch('/api/system/info').then(function(data) {
    renderSystemInfo(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function renderSystemInfo(data) {
  document.getElementById('sys-hostname').textContent = data.os.hostname || '-';
  document.getElementById('sys-os').textContent = data.os.name || '-';
  document.getElementById('sys-kernel').textContent = data.os.kernel || '-';
  document.getElementById('sys-arch').textContent = data.os.architecture || '-';
  document.getElementById('sys-datetime').textContent = new Date(data.datetime).toLocaleString('es-ES');
  document.getElementById('sys-cpu-model').textContent = data.hardware.cpu_model || '-';
  document.getElementById('sys-cpu-cores').textContent = (data.hardware.cpu_cores_physical || '?') + ' f\u00edsicos / ' + (data.hardware.cpu_cores_logical || '?') + ' l\u00f3gicos';
  document.getElementById('sys-ram').textContent = (data.hardware.ram_total_gb || '0') + ' GB';
  document.getElementById('sys-packages').textContent = data.total_packages ?? '-';
  document.getElementById('sys-processes').textContent = data.total_processes ?? '-';

  var tbody = document.getElementById('sys-disks-tbody');
  tbody.innerHTML = '';
  if (data.storage && data.storage.length > 0) {
    data.storage.forEach(function(disk) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(disk.device) + '</td>' +
        '<td>' + escapeHtml(disk.mountpoint) + '</td>' +
        '<td>' + escapeHtml(disk.fstype) + '</td>' +
        '<td>' + disk.total_gb + ' GB</td>';
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Sin datos</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var link = document.querySelector('.nav-link[data-section="system"]');
  if (link) {
    link.addEventListener('click', function() { fetchSystemInfo(); });
  }
});
