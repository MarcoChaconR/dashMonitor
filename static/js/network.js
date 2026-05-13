function fetchNetworkConfig() {
  apiFetch('/api/network/config').then(function(data) {
    renderNetworkConfig(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function renderNetworkConfig(data) {
  document.getElementById('net-hostname').textContent = data.hostname || '-';

  var dnsList = document.getElementById('net-dns-list');
  dnsList.innerHTML = '';
  if (data.dns_servers && data.dns_servers.length > 0) {
    data.dns_servers.forEach(function(s) {
      var li = document.createElement('li');
      li.className = 'list-group-item py-1';
      li.textContent = s;
      dnsList.appendChild(li);
    });
  } else {
    dnsList.innerHTML = '<li class="list-group-item py-1 text-muted">No configurados</li>';
  }

  var container = document.getElementById('net-interfaces');
  container.innerHTML = '';
  if (data.interfaces) {
    data.interfaces.forEach(function(iface) {
      var col = document.createElement('div');
      col.className = 'col-12 col-md-6';
      var statusClass = iface.state === 'UP' ? 'bg-success' : 'bg-secondary';
      var ips = '';
      if (iface.ipv4 && iface.ipv4.length > 0) {
        iface.ipv4.forEach(function(ip) {
          var netmask = ip.netmask ? '/' + ip.netmask : '';
          ips += '<div><small class="text-muted">IPv4:</small> ' + escapeHtml(ip.address) + netmask + '</div>';
        });
      }
      if (iface.ipv6 && iface.ipv6.length > 0) {
        iface.ipv6.forEach(function(ip) {
          ips += '<div><small class="text-muted">IPv6:</small> ' + escapeHtml(ip.address) + '</div>';
        });
      }
      col.innerHTML =
        '<div class="card p-3 h-100">' +
          '<div class="d-flex justify-content-between align-items-start">' +
            '<h6 class="mb-2">' + escapeHtml(iface.name) + '</h6>' +
            '<span class="badge ' + statusClass + '">' + iface.state + '</span>' +
          '</div>' +
          (iface.mac ? '<div><small class="text-muted">MAC:</small> ' + escapeHtml(iface.mac) + '</div>' : '') +
          '<div><small class="text-muted">MTU:</small> ' + iface.mtu + '</div>' +
          (iface.speed ? '<div><small class="text-muted">Speed:</small> ' + iface.speed + ' Mb/s</div>' : '') +
          ips +
        '</div>';
      container.appendChild(col);
    });
  }

  var tbody = document.getElementById('net-routes-tbody');
  tbody.innerHTML = '';
  if (data.routing) {
    data.routing.forEach(function(route) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(route.destination || '') + '</td>' +
        '<td>' + escapeHtml(route.gateway || '-') + '</td>' +
        '<td>' + escapeHtml(route.interface || '') + '</td>';
      tbody.appendChild(tr);
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var link = document.querySelector('.nav-link[data-section="network-config"]');
  if (link) {
    link.addEventListener('click', function() { fetchNetworkConfig(); });
  }
});
