var logRefreshInterval = null;

function loadLogSources() {
  apiFetch('/api/logs').then(function(data) {
    var sel = document.getElementById('log-source');
    sel.innerHTML = '';
    data.sources.forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name + ' (' + (s.size_bytes / 1024).toFixed(0) + ' KB)';
      sel.appendChild(opt);
    });
    loadLogContent();
  }).catch(function() {});
}

function loadLogContent() {
  var source = document.getElementById('log-source').value;
  var lines = document.getElementById('log-lines').value || 50;
  var filter = document.getElementById('log-filter').value || '';
  apiFetch('/api/logs/' + encodeURIComponent(source) + '?lines=' + lines + '&filter=' + encodeURIComponent(filter))
    .then(function(data) {
      var out = document.getElementById('log-output');
      if (data.error) {
        out.textContent = 'Error: ' + data.error;
        return;
      }
      out.textContent = data.lines.join('').replace(/\n$/, '');
      out.scrollTop = out.scrollHeight;
      document.getElementById('log-info').textContent = 'Mostrando ' + data.showing + ' de ' + data.total + ' líneas — ' + data.path;
    }).catch(function() {});
}

function startLogTail() {
  stopLogTail();
  logRefreshInterval = setInterval(loadLogContent, 5000);
}

function stopLogTail() {
  if (logRefreshInterval) {
    clearInterval(logRefreshInterval);
    logRefreshInterval = null;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('log-source').addEventListener('change', loadLogContent);
  document.getElementById('log-lines').addEventListener('change', loadLogContent);
  document.getElementById('log-filter').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loadLogContent();
  });
  document.getElementById('log-refresh-btn').addEventListener('click', loadLogContent);
  document.getElementById('log-tail').addEventListener('change', function() {
    if (this.checked) startLogTail(); else stopLogTail();
  });
  document.getElementById('log-custom-btn').addEventListener('click', function() {
    Swal.fire({
      title: 'Ruta personalizada',
      input: 'text',
      inputPlaceholder: '/var/log/apache2/error.log',
      showCancelButton: true,
      confirmButtonText: 'Ver',
      cancelButtonText: 'Cancelar'
    }).then(function(result) {
      if (result.isConfirmed && result.value) {
        var lines = document.getElementById('log-lines').value || 50;
        apiFetch('/api/logs-custom?lines=' + lines + '&path=' + encodeURIComponent(result.value))
          .then(function(data) {
            var out = document.getElementById('log-output');
            if (data.error) {
              out.textContent = 'Error: ' + data.error;
              return;
            }
            out.textContent = data.lines.join('').replace(/\n$/, '');
            out.scrollTop = out.scrollHeight;
            document.getElementById('log-info').textContent = 'Mostrando ' + data.showing + ' de ' + data.total + ' líneas — ' + data.path;
          }).catch(function() {});
      }
    });
  });
  loadLogSources();
});
