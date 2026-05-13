function fetchPackages(refresh) {
  refresh = refresh || false;
  var url = '/api/packages/info';
  if (refresh) url += '?refresh=true';
  apiFetch(url).then(function(data) {
    renderPackages(data);
  }).catch(function(err) {
    if (err.message === 'Sesion expirada') return;
  });
}

function renderPackages(data) {
  document.getElementById('pkg-total').textContent = data.total_packages;
  document.getElementById('pkg-updates').textContent = data.updates_available;
  var lastUpdate = document.getElementById('pkg-last-update');
  if (data.last_update_time) {
    var d = new Date(data.last_update_time);
    lastUpdate.textContent = d.toLocaleString('es-ES');
  } else {
    lastUpdate.textContent = '--';
  }

  var tbody = document.getElementById('pkg-tbody');
  var noUpdates = document.getElementById('pkg-no-updates');

  tbody.innerHTML = '';
  if (data.updates && data.updates.length > 0) {
    noUpdates.classList.add('d-none');
    data.updates.forEach(function(pkg) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(pkg.name) + '</td>' +
        '<td>' + escapeHtml(pkg.current_version) + '</td>' +
        '<td>' + escapeHtml(pkg.new_version) + '</td>';
      tbody.appendChild(tr);
    });
  } else {
    noUpdates.classList.remove('d-none');
  }
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('pkg-refresh-btn').addEventListener('click', function() {
    fetchPackages(true);
  });
});
