function fetchStorage() {
  apiFetch('/api/storage').then(function(data) {
    renderStorage(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function renderStorage(data) {
  var tbody = document.getElementById('storage-blocks-tbody');
  tbody.innerHTML = '';
  if (data.blocks && data.blocks.length > 0) {
    data.blocks.forEach(function(b) {
      var usage = (data.usage || []).find(function(u) { return u.source === '/dev/' + b.name || u.target === b.mountpoint; });
      var pct = usage ? parseInt(usage.use_pct) : 0;
      var barColor = pct > 90 ? 'bg-danger' : pct > 70 ? 'bg-warning' : 'bg-success';
      var mount = b.mountpoint || '-';
      if (usage && usage.target) mount = usage.target;
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' + escapeHtml(b.name) + '</strong>' + (b.model ? '<br><small class="text-muted">' + escapeHtml(b.model) + '</small>' : '') + '</td>' +
        '<td>' + escapeHtml(b.fstype || '-') + '</td>' +
        '<td>' + (b.size || '-') + '</td>' +
        '<td>' + escapeHtml(mount) + '</td>' +
        '<td>' + (usage ? '<div class="d-flex align-items-center gap-2"><div class="progress flex-grow-1" style="height:8px;"><div class="progress-bar ' + barColor + '" style="width:' + pct + '%"></div></div><small>' + usage.use_pct + '</small></div>' : '-') + '</td>' +
        '<td><small>' + escapeHtml(b.uuid || '-') + '</small></td>';
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Sin datos</td></tr>';
  }

  var ftbody = document.getElementById('storage-fstab-tbody');
  ftbody.innerHTML = '';
  if (data.fstab && data.fstab.length > 0) {
    data.fstab.forEach(function(e) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><code>' + escapeHtml(e.device) + '</code></td>' +
        '<td>' + escapeHtml(e.mountpoint) + '</td>' +
        '<td>' + escapeHtml(e.fstype) + '</td>' +
        '<td><small>' + escapeHtml(e.options) + '</small></td>';
      ftbody.appendChild(tr);
    });
  } else {
    ftbody.innerHTML = '<tr><td colspan="4" class="text-muted">Sin entradas</td></tr>';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('storage-refresh-btn').addEventListener('click', fetchStorage);
  var link = document.querySelector('.nav-link[data-section="storage"]');
  if (link) link.addEventListener('click', function() { fetchStorage(); });
});
