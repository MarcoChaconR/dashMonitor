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

function logout() {
  state.token = null;
  state.consoleToken = null;
  clearTokens();
  stopPolling();
  window.location.href = '/login';
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

  var seconds = data.uptime_seconds;
  var years = Math.floor(seconds / 31536000);
  seconds %= 31536000;
  var months = Math.floor(seconds / 2592000);
  seconds %= 2592000;
  var days = Math.floor(seconds / 86400);
  seconds %= 86400;
  var hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  var minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  var parts = [];
  if (years > 0) parts.push(years + 'a');
  if (months > 0) parts.push(months + 'm');
  if (days > 0) parts.push(days + 'd');
  if (hours > 0) parts.push(hours + 'h');
  if (minutes > 0 || parts.length > 0) parts.push(minutes + 'min');
  parts.push(seconds + 's');

  document.getElementById('navbar-uptime').textContent = parts.join(' ');
}

function activateSession() {
  setUsername();
  startPolling();
  fetchMetrics();
  fetchProcesses();
}

function restoreSession() {
  var token = getToken();
  var refreshToken = getRefreshToken();
  if (!token) {
    window.location.href = '/login';
    return;
  }
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
    }).catch(function() {
      window.location.href = '/login';
    });
  } else {
    window.location.href = '/login';
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
      if (section === 'logs') loadLogSources();
      if (section === 'users') fetchUsers();
      if (section === 'services') fetchServicesWithCache();
      if (section === 'cron') fetchCron();
      if (section === 'files') fetchFiles('/etc');
      if (section === 'console') document.getElementById('console-input').focus();
      if (section === 'system') fetchSystemInfo();
    });
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
