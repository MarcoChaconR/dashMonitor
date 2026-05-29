function fetchUsers() {
  apiFetch('/api/users').then(function(users) {
    renderUsers(users);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error al cargar usuarios', showConfirmButton: false, timer: 3000 });
  });
}

function renderUsers(users) {
  var tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '';
  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Sin usuarios</td></tr>';
    return;
  }
  users.forEach(function(u) {
    var groupBadges = '';
    if (u.groups) {
      groupBadges = u.groups.map(function(g) {
        var cls = (g === 'wheel' || g === 'sudo') ? 'badge bg-warning text-dark me-1' : 'badge bg-secondary me-1';
        return '<span class="' + cls + '">' + escapeHtml(g) + '</span>';
      }).join('');
    }
    var isSpecial = u.uid < 1000 || u.username === 'root';
    var deleteBtn = '';
    if (u.username !== 'root' && !isSpecial) {
      deleteBtn = '<button class="btn btn-sm btn-outline-danger delete-user-btn" data-username="' + escapeHtml(u.username) + '"><i class="bi bi-trash"></i></button>';
    }
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + escapeHtml(u.username) + '</strong>' + (isSpecial ? ' <span class="badge bg-info text-dark">sistema</span>' : '') + '</td>' +
      '<td>' + u.uid + '</td>' +
      '<td>' + groupBadges + '</td>' +
      '<td><code>' + escapeHtml(u.shell) + '</code></td>' +
      '<td><small>' + escapeHtml(u.home) + '</small></td>' +
      '<td class="text-end">' + deleteBtn + '</td>';
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.delete-user-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      confirmDeleteUser(this.getAttribute('data-username'));
    });
  });
}

function confirmDeleteUser(username) {
  Swal.fire({
    title: 'Eliminar usuario',
    html: '¿Está seguro de eliminar al usuario <strong>' + escapeHtml(username) + '</strong>?<br><small class="text-danger">Esta acción eliminará su home y es irreversible.</small>',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    confirmButtonColor: '#dc3545',
    cancelButtonText: 'Cancelar'
  }).then(function(result) {
    if (result.isConfirmed) {
      apiFetch('/api/users/' + encodeURIComponent(username), { method: 'DELETE' }).then(function(data) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: data.message, showConfirmButton: false, timer: 3000 });
        fetchUsers();
      }).catch(function(err) {
        if (err.message === 'Sesión expirada') return;
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: err.message, showConfirmButton: false, timer: 3000 });
      });
    }
  });
}

function showCreateUserModal() {
  fetch('/api/system/info', {
    headers: { 'Authorization': 'Bearer ' + (state.token || '') }
  }).then(function(r) { return r.json(); }).then(function(sysInfo) {
    var allowGroup = (sysInfo.os && sysInfo.os.name && sysInfo.os.name.toLowerCase().indexOf('alpine') !== -1) ? 'wheel' : 'sudo';
    var groupsHtml = '<small class="text-muted d-block mb-2">Grupo por defecto: <strong>' + allowGroup + '</strong> (acceso sudo)</small>';

    Swal.fire({
      title: 'Nuevo usuario',
      html:
        '<div class="text-start">' +
        '<div class="mb-3">' +
        '<label class="form-label">Usuario</label>' +
        '<input id="swal-username" class="form-control" placeholder="Nombre de usuario">' +
        '</div>' +
        '<div class="mb-3">' +
        '<label class="form-label">Contraseña</label>' +
        '<input id="swal-password" type="password" class="form-control" placeholder="Mínimo 4 caracteres">' +
        '</div>' +
        groupsHtml +
        '</div>',
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      preConfirm: function() {
        var username = document.getElementById('swal-username').value.trim();
        var password = document.getElementById('swal-password').value;
        if (!username) { Swal.showValidationMessage('El nombre de usuario es requerido'); return false; }
        if (!password || password.length < 4) { Swal.showValidationMessage('La contraseña debe tener al menos 4 caracteres'); return false; }
        return { username: username, password: password, groups: [allowGroup] };
      }
    }).then(function(result) {
      if (result.isConfirmed) {
        apiFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.value)
        }).then(function(data) {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: data.message, showConfirmButton: false, timer: 3000 });
          fetchUsers();
        }).catch(function(err) {
          if (err.message === 'Sesión expirada') return;
          Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: err.message, showConfirmButton: false, timer: 3000 });
        });
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('users-add-btn').addEventListener('click', showCreateUserModal);

  document.getElementById('users-refresh-btn').addEventListener('click', function() {
    fetchUsers();
  });

  var link = document.querySelector('.nav-link[data-section="users"]');
  if (link) {
    link.addEventListener('click', function() { fetchUsers(); });
  }
});
