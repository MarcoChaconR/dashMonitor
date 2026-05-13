function fetchFirewallRules() {
  apiFetch('/api/firewall/rules').then(function(data) {
    renderFirewallRules(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function renderFirewallRules(data) {
  var tbody = document.getElementById('fw-ports-tbody');
  tbody.innerHTML = '';
  if (data.listening_ports && data.listening_ports.length > 0) {
    document.getElementById('fw-no-ports').classList.add('d-none');
    data.listening_ports.forEach(function(p) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(String(p.port)) + '</td>' +
        '<td>' + escapeHtml(p.address) + '</td>' +
        '<td>' + escapeHtml(p.process || '-') + '</td>';
      tbody.appendChild(tr);
    });
  } else {
    document.getElementById('fw-no-ports').classList.remove('d-none');
  }

  var container = document.getElementById('fw-iptables');
  container.innerHTML = '';
  if (data.iptables && data.iptables.length > 0) {
    data.iptables.forEach(function(chain) {
      var card = document.createElement('div');
      card.className = 'card p-3 mb-2';
      var rulesHtml = '';
      if (chain.rules && chain.rules.length > 0) {
        rulesHtml = '<div class="table-wrap"><table class="table table-sm mb-0"><thead><tr><th>Target</th><th>Prot</th><th>In</th><th>Out</th><th>Source</th><th>Dest</th></tr></thead><tbody>';
        chain.rules.forEach(function(r) {
          rulesHtml += '<tr><td>' + escapeHtml(r.target) + '</td><td>' + escapeHtml(r.prot) + '</td><td>' + escapeHtml(r.in_) + '</td><td>' + escapeHtml(r.out) + '</td><td>' + escapeHtml(r.source) + '</td><td>' + escapeHtml(r.destination) + '</td></tr>';
        });
        rulesHtml += '</tbody></table></div>';
      } else {
        rulesHtml = '<small class="text-muted">Sin reglas</small>';
      }
      card.innerHTML =
        '<h6 class="mb-2">Chain ' + escapeHtml(chain.name) +
        ' <span class="badge bg-secondary">policy ' + escapeHtml(chain.policy) + '</span></h6>' +
        rulesHtml;
      container.appendChild(card);
    });
  } else {
    container.innerHTML = '<div class="card p-3"><small class="text-muted">iptables no disponible</small></div>';
  }

  var nftPre = document.getElementById('fw-nftables');
  if (data.nftables) {
    nftPre.textContent = data.nftables;
    nftPre.classList.remove('d-none');
  } else {
    nftPre.classList.add('d-none');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var link = document.querySelector('.nav-link[data-section="firewall"]');
  if (link) {
    link.addEventListener('click', function() { fetchFirewallRules(); });
  }
});
