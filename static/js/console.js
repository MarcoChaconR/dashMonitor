var commandHistory = [];
var historyIndex = -1;

function executeCommand(command) {
  printConsole('\n$ ' + command);
  fetch('/api/console', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (state.token || '')
    },
    body: JSON.stringify({ command: command, timeout: 30 })
  }).then(function(r) { return r.json().then(function(d) { return { status: r.status, body: d }; }); })
    .then(function(res) {
      if (res.status === 401) {
        printConsole('⚠ Sesión expirada. Recargue la página.');
        return;
      }
      if (res.status >= 400) {
        var msg = res.body.detail ? (res.body.detail.message || res.body.detail) : JSON.stringify(res.body);
        printConsole('⚠ ' + msg);
      } else {
        if (res.body.stdout) printConsole(res.body.stdout.replace(/\n$/, ''));
        if (res.body.stderr) printConsole(res.body.stderr.replace(/\n$/, ''));
        printConsole('[' + res.body.execution_ms + 'ms, exit: ' + res.body.exit_code + ']');
      }
    })
    .catch(function(err) {
      printConsole('⚠ Error de conexión: ' + err.message);
    });
}

function printConsole(text) {
  var el = document.getElementById('console-output');
  el.textContent += text + '\n';
  el.scrollTop = el.scrollHeight;
}

document.addEventListener('DOMContentLoaded', function() {
  var input = document.getElementById('console-input');
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var cmd = input.value.trim();
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

  document.getElementById('console-clear-btn').addEventListener('click', function() {
    document.getElementById('console-output').textContent = '';
  });
});
