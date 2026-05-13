const commandHistory = [];
let historyIndex = -1;
let consoleToken = null;
let consoleCountdown = null;

function requestConsoleAuth() {
  Swal.fire({
    title: 'Autenticación de consola',
    input: 'password',
    inputLabel: 'Ingrese su PIN de consola',
    showCancelButton: true,
    confirmButtonText: 'Autenticar',
    cancelButtonText: 'Cancelar',
    inputValidator: function(v) { if (!v) return 'Debe ingresar un PIN'; }
  }).then(function(result) {
    if (result.isConfirmed) {
      apiFetch('/auth/console-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: result.value })
      }).then(function(data) {
        consoleToken = data.console_token;
        localStorage.setItem('dashmonitor_console_token', data.console_token);
        document.getElementById('console-input').disabled = false;
        document.getElementById('console-input').focus();
        startConsoleCountdown(data.expires_in);
        printConsole('\n' + '✔ Consola autenticada por ' + Math.floor(data.expires_in / 60) + ' min');
      }).catch(function(err) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'PIN inválido', showConfirmButton: false, timer: 3000 });
      });
    }
  });
}

function startConsoleCountdown(seconds) {
  if (consoleCountdown) clearInterval(consoleCountdown);
  const timerEl = document.getElementById('console-timer');
  function tick() {
    if (seconds <= 0) {
      clearInterval(consoleCountdown);
      consoleToken = null;
      localStorage.removeItem('dashmonitor_console_token');
      document.getElementById('console-input').disabled = true;
      timerEl.textContent = '(expirado)';
      printConsole('\n' + '⚠ Token de consola expirado. Autentíquese de nuevo.');
      return;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    timerEl.textContent = '(' + m + ':' + (s < 10 ? '0' : '') + s + ')';
    seconds--;
  }
  tick();
  consoleCountdown = setInterval(tick, 1000);
}

function executeCommand(command) {
  if (!consoleToken) {
    printConsole('\n' + '⚠ Debe autenticarse primero (PIN)');
    return;
  }
  printConsole('\n$ ' + command);
  fetch('/api/console', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + consoleToken
    },
    body: JSON.stringify({ command: command, timeout: 30 })
  }).then(function(r) { return r.json().then(function(d) { return { status: r.status, body: d }; }); })
    .then(function(res) {
      if (res.status >= 400) {
        const msg = res.body.detail ? (res.body.detail.message || res.body.detail) : JSON.stringify(res.body);
        printConsole('⚠ ' + msg);
      } else {
        if (res.body.stdout) printConsole(res.body.stdout.replace(/\n$/, ''));
        if (res.body.stderr) printConsole('⚠ ' + res.body.stderr.replace(/\n$/, ''));
        printConsole('[' + res.body.execution_ms + 'ms, código: ' + res.body.exit_code + ']');
      }
    })
    .catch(function(err) {
      printConsole('⚠ Error de conexión: ' + err.message);
    });
}

function printConsole(text) {
  const el = document.getElementById('console-output');
  el.textContent += text + '\n';
  el.scrollTop = el.scrollHeight;
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('console-auth-btn').addEventListener('click', requestConsoleAuth);

  document.getElementById('console-clear-btn').addEventListener('click', function() {
    document.getElementById('console-output').textContent = '';
  });

  const input = document.getElementById('console-input');
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      if (!cmd) return;
      commandHistory.push(cmd);
      historyIndex = commandHistory.length;
      input.value = '';
      executeCommand(cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = commandHistory[historyIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= commandHistory.length - 1) {
        historyIndex = commandHistory.length;
        input.value = '';
      } else {
        historyIndex++;
        input.value = commandHistory[historyIndex];
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      document.getElementById('console-output').textContent = '';
    }
  });
});
