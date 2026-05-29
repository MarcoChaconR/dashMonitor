var currentFilePath = '/etc';

function fetchFiles(path) {
  path = path || currentFilePath;
  apiFetch('/api/files?path=' + encodeURIComponent(path)).then(function(data) {
    currentFilePath = data.path;
    renderFileBrowser(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: err.message, showConfirmButton: false, timer: 3000 });
  });
}

function renderFileBrowser(data) {
  document.getElementById('files-path').textContent = data.path;

  var parentBtn = document.getElementById('files-parent-btn');
  if (data.parent) {
    parentBtn.classList.remove('d-none');
    parentBtn.setAttribute('data-path', data.parent);
  } else {
    parentBtn.classList.add('d-none');
  }

  var tbody = document.getElementById('files-tbody');
  tbody.innerHTML = '';
  if (!data.entries.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Directorio vacío</td></tr>';
    return;
  }
  data.entries.forEach(function(e) {
    var icon = e.is_dir ? '<i class="bi bi-folder-fill text-warning me-2"></i>' : '<i class="bi bi-file-earmark text-muted me-2"></i>';
    var size = e.is_dir ? '-' : (e.size < 1024 ? e.size + ' B' : e.size < 1048576 ? (e.size / 1024).toFixed(1) + ' KB' : (e.size / 1048576).toFixed(1) + ' MB');
    var clickable = e.is_dir || (e.readable && !e.is_dir);
    var nameHtml = clickable
      ? '<a href="#" class="file-entry" data-path="' + escapeHtml(e.path) + '" data-is-dir="' + e.is_dir + '">' + icon + escapeHtml(e.name) + '</a>'
      : '<span class="text-muted">' + icon + escapeHtml(e.name) + '</span>';

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + nameHtml + '</td>' +
      '<td><small>' + e.mode + '</small></td>' +
      '<td>' + e.owner + '</td>' +
      '<td>' + size + '</td>' +
      '<td><small>' + e.mtime + '</small></td>';
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.file-entry').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      var path = this.getAttribute('data-path');
      var isDir = this.getAttribute('data-is-dir') === 'true';
      if (isDir) {
        fetchFiles(path);
      } else {
        readFileContent(path);
      }
    });
  });
}

function readFileContent(path) {
  document.getElementById('files-viewer').classList.remove('d-none');
  document.getElementById('files-viewer-name').textContent = path;
  document.getElementById('files-viewer-content').textContent = 'Cargando...';

  apiFetch('/api/files/read?path=' + encodeURIComponent(path)).then(function(data) {
    document.getElementById('files-viewer-name').textContent = data.name + ' (' + data.size + ' bytes, ' + data.mode + ')';
    document.getElementById('files-viewer-content').textContent = data.content;
    document.getElementById('files-viewer-content').scrollTop = 0;
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
    document.getElementById('files-viewer-content').textContent = 'Error: ' + err.message;
  });
}

function closeFileViewer() {
  document.getElementById('files-viewer').classList.add('d-none');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('files-parent-btn').addEventListener('click', function() {
    fetchFiles(this.getAttribute('data-path'));
  });

  document.getElementById('files-refresh-btn').addEventListener('click', function() {
    fetchFiles(currentFilePath);
  });

  document.getElementById('files-home-btn').addEventListener('click', function() {
    fetchFiles('/etc');
  });

  document.getElementById('files-close-viewer-btn').addEventListener('click', closeFileViewer);

  var link = document.querySelector('.nav-link[data-section="files"]');
  if (link) {
    link.addEventListener('click', function() { fetchFiles('/etc'); });
  }
});
