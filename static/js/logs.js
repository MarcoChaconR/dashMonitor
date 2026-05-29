var logRefreshInterval = null;
var logSearchTimeout = null;

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
      var text = data.lines.join('').replace(/\n$/, '');
      out.innerHTML = highlightLog(text);
      out.scrollTop = out.scrollHeight;
      document.getElementById('log-info').textContent = data.showing + ' de ' + data.total + ' lineas - ' + data.path;
    }).catch(function() {});
}

function highlightLog(text) {
  text = escapeHtml(text);
  text = text.replace(/(ERROR|CRITICAL|FATAL|FAIL|ERR|PANIC)/gi, '<span class="log-error">$1</span>');
  text = text.replace(/(WARNING|WARN)/gi, '<span class="log-warn">$1</span>');
  text = text.replace(/(INFO|NOTICE)/gi, '<span class="log-info">$1</span>');
  text = text.replace(/(DEBUG|TRACE)/gi, '<span class="log-debug">$1</span>');
  return text;
}

function startLogTail() {
  stopLogTail();
  logRefreshInterval = setInterval(loadLogContent, 3000);
  document.getElementById('log-tail-label').textContent = 'Tail (ON)';
  document.getElementById('log-tail-label').classList.remove('text-muted');
  document.getElementById('log-tail-label').classList.add('text-success');
}

function stopLogTail() {
  if (logRefreshInterval) {
    clearInterval(logRefreshInterval);
    logRefreshInterval = null;
  }
  document.getElementById('log-tail-label').textContent = 'Tail (OFF)';
  document.getElementById('log-tail-label').classList.remove('text-success');
  document.getElementById('log-tail-label').classList.add('text-muted');
}

function exportLogs() {
  var text = document.getElementById('log-output').textContent;
  var blob = new Blob([text], { type: 'text/plain' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dashmonitor-logs-' + new Date().toISOString().slice(0, 19) + '.txt';
  a.click();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('log-source').addEventListener('change', loadLogContent);
  document.getElementById('log-lines').addEventListener('change', loadLogContent);

  document.getElementById('log-filter').addEventListener('input', function() {
    if (logSearchTimeout) clearTimeout(logSearchTimeout);
    logSearchTimeout = setTimeout(loadLogContent, 500);
  });

  document.getElementById('log-refresh-btn').addEventListener('click', loadLogContent);

  document.getElementById('log-tail').addEventListener('change', function() {
    if (this.checked) startLogTail(); else stopLogTail();
  });

  document.getElementById('log-export-btn').addEventListener('click', exportLogs);

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
            out.innerHTML = highlightLog(data.lines.join('').replace(/\n$/, ''));
            out.scrollTop = out.scrollHeight;
            document.getElementById('log-info').textContent = data.showing + ' de ' + data.total + ' lineas - ' + data.path;
          }).catch(function() {});
      }
    });
  });
});
