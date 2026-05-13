const state = {
  token: null,
  consoleToken: null,
  paused: false,
  lastActivity: Date.now(),
  hostname: '',
  intervalMs: 3000
};

function getToken() { return localStorage.getItem('dashmonitor_token'); }
function getRefreshToken() { return localStorage.getItem('dashmonitor_refresh'); }
function getConsoleToken() { return localStorage.getItem('dashmonitor_console_token'); }
function setTokens(at, rt) {
  if (at) localStorage.setItem('dashmonitor_token', at);
  if (rt) localStorage.setItem('dashmonitor_refresh', rt);
}
function clearTokens() {
  localStorage.removeItem('dashmonitor_token');
  localStorage.removeItem('dashmonitor_refresh');
  localStorage.removeItem('dashmonitor_console_token');
}

let metricsInterval = null;
let processesInterval = null;

function apiFetch(url, options) {
  options = options || {};
  options.headers = options.headers || {};
  options.headers['Authorization'] = 'Bearer ' + state.token;
  return fetch(url, options).then(function(r) {
    if (r.status === 401) {
      logout();
      throw new Error('Sesión expirada');
    }
    return r.json().then(function(d) {
      if (!r.ok) {
        const msg = d.detail || d.message || 'Error ' + r.status;
        throw new Error(msg);
      }
      return d;
    });
  });
}

function login(username, password) {
  return fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username, password: password })
  }).then(function(r) {
    return r.json().then(function(d) {
      if (!r.ok) throw new Error(d.detail || 'Error de autenticación');
      return d;
    });
  }).then(function(data) {
    state.token = data.access_token;
    setTokens(data.access_token, data.refresh_token);
    setUsername();
    document.getElementById('login-overlay').classList.add('d-none');
    document.getElementById('login-error').classList.add('d-none');
    startPolling();
    fetchMetrics();
    fetchProcesses();
  });
}

function logout() {
  state.token = null;
  state.consoleToken = null;
  clearTokens();
  stopPolling();
  document.getElementById('login-overlay').classList.remove('d-none');
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('navbar-username').textContent = '';
}

function showSection(name) {
  document.querySelectorAll('.section').forEach(function(el) { el.classList.add('d-none'); });
  var section = document.getElementById('section-' + name);
  if (section) section.classList.remove('d-none');
  document.querySelectorAll('.nav-link').forEach(function(el) { el.classList.remove('active'); });
  var link = document.querySelector('.nav-link[data-section="' + name + '"]');
  if (link) link.classList.add('active');
}

function setPollingInterval(ms) {
  if ([1000, 2000, 3000, 5000].indexOf(ms) === -1) return;
  state.intervalMs = ms;
  localStorage.setItem('dashmonitor_interval', ms);
  if (state.token) {
    stopPolling();
    startPolling();
  }
}

function startPolling() {
  if (metricsInterval) clearInterval(metricsInterval);
  if (processesInterval) clearInterval(processesInterval);
  metricsInterval = setInterval(function() {
    if (state.paused) return;
    if (Date.now() - state.lastActivity > 1200000) {
      state.paused = true;
      document.getElementById('pause-badge').classList.remove('d-none');
      return;
    }
    fetchMetrics();
    var tokenRefreshTime = Date.now() + 480 * 60 * 1000 - 15 * 60 * 1000;
    var tokenAge = Date.now() - tokenRefreshTime; // not quite right
    var refreshToken = getRefreshToken();
    if (refreshToken && state.token) {
      var payload = parseJWT(state.token);
      if (payload && payload.exp) {
        var expMs = payload.exp * 1000;
        if (Date.now() > expMs - 900000) {
          fetch('/auth/refresh', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + refreshToken }
          }).then(function(r) { return r.json(); }).then(function(d) {
            if (d.access_token) {
              state.token = d.access_token;
              setTokens(d.access_token, d.refresh_token);
            }
          }).catch(function() {});
        }
      }
    }
  }, state.intervalMs);
  processesInterval = setInterval(function() {
    if (state.paused) return;
    fetchProcesses();
  }, state.intervalMs * 2);
}

function stopPolling() {
  if (metricsInterval) { clearInterval(metricsInterval); metricsInterval = null; }
  if (processesInterval) { clearInterval(processesInterval); processesInterval = null; }
}

function parseJWT(token) {
  try {
    var parts = token.split('.');
    return JSON.parse(atob(parts[1]));
  } catch(e) { return null; }
}

function fetchMetrics() {
  apiFetch('/api/metrics').then(function(data) {
    state.hostname = data.hostname;
    updateNavbarInfo(data);
    updateAllCharts(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function fetchProcesses() {
  apiFetch('/api/processes?sort=' + currentSort + '&order=' + currentOrder).then(function(data) {
    renderProcesses(data);
  }).catch(function(err) {
    if (err.message === 'Sesión expirada') return;
  });
}

function setUsername() {
  var payload = parseJWT(state.token);
  document.getElementById('navbar-username').textContent = payload && payload.sub ? payload.sub : '';
}

function updateNavbarInfo(data) {
  document.getElementById('navbar-hostname').textContent = data.hostname;
  var uptime = data.uptime_seconds;
  var h = Math.floor(uptime / 3600);
  var m = Math.floor((uptime % 3600) / 60);
  document.getElementById('navbar-uptime').textContent = h + 'h ' + m + 'm';
}

function activateSession() {
  var savedConsoleToken = getConsoleToken();
  if (savedConsoleToken) {
    var cp = parseJWT(savedConsoleToken);
    if (cp && cp.exp && Date.now() < cp.exp * 1000) {
      state.consoleToken = savedConsoleToken;
      if (typeof consoleToken !== 'undefined') {
        consoleToken = savedConsoleToken;
        if (typeof startConsoleCountdown === 'function') {
          startConsoleCountdown(cp.exp - Math.floor(Date.now() / 1000));
        }
        document.getElementById('console-input').disabled = false;
      }
    } else {
      localStorage.removeItem('dashmonitor_console_token');
    }
  }
  setUsername();
  document.getElementById('login-overlay').classList.add('d-none');
  document.getElementById('login-error').classList.add('d-none');
  startPolling();
  fetchMetrics();
  fetchProcesses();
}

function restoreSession() {
  var token = getToken();
  var refreshToken = getRefreshToken();
  if (!token) return;
  var payload = parseJWT(token);
  if (payload && payload.exp && Date.now() < payload.exp * 1000) {
    state.token = token;
    activateSession();
    return;
  }
  if (refreshToken) {
    fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + refreshToken }
    }).then(function(r) {
      return r.json().then(function(d) {
        if (!r.ok) throw new Error('Refresh failed');
        return d;
      });
    }).then(function(data) {
      state.token = data.access_token;
      setTokens(data.access_token, data.refresh_token);
      activateSession();
    }).catch(function() {});
  }
}

function initApp() {
  var savedInterval = parseInt(localStorage.getItem('dashmonitor_interval'), 10);
  if ([1000, 2000, 3000, 5000].indexOf(savedInterval) === -1) savedInterval = 3000;
  state.intervalMs = savedInterval;
  document.getElementById('interval-select').value = String(savedInterval / 1000);

  initCharts();
  restoreSession();

  document.querySelectorAll('.nav-link[data-section]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      var section = this.getAttribute('data-section');
      showSection(section);
      if (section === 'packages') fetchPackages();
    });
  });

  document.getElementById('login-btn').addEventListener('click', function() {
    var user = document.getElementById('login-user').value.trim();
    var pass = document.getElementById('login-pass').value;
    if (!user || !pass) {
      document.getElementById('login-error').textContent = 'Complete ambos campos';
      document.getElementById('login-error').classList.remove('d-none');
      return;
    }
    document.getElementById('login-error').classList.add('d-none');
    login(user, pass).catch(function(err) {
      document.getElementById('login-error').textContent = err.message;
      document.getElementById('login-error').classList.remove('d-none');
    });
  });

  document.getElementById('login-pass').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });

  document.getElementById('logout-btn').addEventListener('click', logout);

  document.getElementById('interval-select').addEventListener('change', function() {
    setPollingInterval(parseInt(this.value) * 1000);
  });

  ['mousemove', 'click', 'keydown'].forEach(function(ev) {
    document.addEventListener(ev, function() {
      state.lastActivity = Date.now();
      if (state.paused) {
        state.paused = false;
        document.getElementById('pause-badge').classList.add('d-none');
      }
    });
  });

  showSection('dashboard');
}

document.addEventListener('DOMContentLoaded', initApp);
