Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#30363d';
Chart.defaults.animation = false;

const history = { cpu: [], ram: [], disk: [], net: [], temp: [] };

function getHistoryPoints() { return Math.ceil(300000 / state.intervalMs); }

function push(arr, val) { arr.push(val); const max = getHistoryPoints(); if (arr.length > max) arr.shift(); }

function createLineChart(ctx, datasetsOpts) {
  return new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: { y: { min: 0, max: 100 } },
      plugins: { legend: { display: false } },
      elements: { point: { radius: 0 } }
    }
  });
}

function createCPUChart(ctx) {
  return new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: { y: { min: 0, max: 100 } },
      plugins: { legend: { position: 'bottom' } },
      elements: { point: { radius: 0 } }
    }
  });
}

function createRAMDonut(ctx) {
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Usado', 'Disponible'],
      datasets: [{ data: [0, 1], backgroundColor: ['#f85149', '#3fb950'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      cutout: '75%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ctx.parsed + ' GB'; } } } }
    }
  });
}

function createRAMHistChart(ctx) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{ label: 'RAM %', data: [], borderColor: '#388bfd', backgroundColor: 'rgba(56,139,253,0.15)', fill: true, pointRadius: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: { y: { min: 0, max: 100 } },
      plugins: { legend: { display: false } }
    }
  });
}

function createDiskIOChart(ctx) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Lectura', data: [], borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,0.15)', fill: true, pointRadius: 0 },
        { label: 'Escritura', data: [], borderColor: '#db6d28', backgroundColor: 'rgba(219,109,40,0.15)', fill: true, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: { y: { min: 0 } },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function createNetworkChart(ctx) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Recibido', data: [], borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,0.15)', fill: true, pointRadius: 0 },
        { label: 'Enviado', data: [], borderColor: '#bc8cff', backgroundColor: 'rgba(188,140,255,0.15)', fill: true, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: { y: { min: 0 } },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function createTempChart(ctx) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{ label: 'Temperatura °C', data: [], borderColor: '#f85149', pointRadius: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: { y: { min: 20, max: 100 } },
      plugins: {
        legend: { display: false },
        annotation: {
          annotations: {
            warnZone: { type: 'box', yMin: 70, yMax: 85, backgroundColor: 'rgba(210,153,34,0.1)', borderWidth: 0, drawTime: 'beforeDatasetsDraw' },
            critZone: { type: 'box', yMin: 85, yMax: 100, backgroundColor: 'rgba(248,81,73,0.1)', borderWidth: 0, drawTime: 'beforeDatasetsDraw' }
          }
        }
      }
    }
  });
}

let lastTempAlert = 0;
let cpuChart, ramDonutChart, ramHistChart, diskIOChart, networkChart, tempChart;
let miniCPUChart, miniRAMChart;

function updateAllCharts(data) {
  push(history.cpu, data.cpu.percent_total);
  push(history.ram, data.memory.percent);
  push(history.disk, data.disk.length > 0 ? data.disk[0].percent : 0);
  const netTotal = data.network.reduce((s, n) => s + n.recv_rate_kb_s, 0);
  push(history.net, netTotal);
  push(history.temp, data.temperature.cpu_celsius || 0);

  const labels = history.cpu.map(function() { return ''; });

  if (cpuChart) {
    const cores = data.cpu.percent_per_core;
    if (cpuChart.data.datasets.length !== cores.length) {
      cpuChart.data.datasets = cores.map(function(_, i) {
        return {
          label: 'Núcleo ' + i,
          data: [],
          borderColor: ['#388bfd','#3fb950','#d29922','#f85149','#db6d28','#bc8cff','#e6edf3','#8b949e'][i % 8],
          fill: false, pointRadius: 0
        };
      });
    }
    cpuChart.data.labels = labels;
    cores.forEach(function(_, i) {
      const val = history.cpu[history.cpu.length - 1] / cores.length;
      cpuChart.data.datasets[i].data.push(val);
      const max = getHistoryPoints();
      if (cpuChart.data.datasets[i].data.length > max) cpuChart.data.datasets[i].data.shift();
    });
    cpuChart.update('none');
  }

  if (ramDonutChart) {
    ramDonutChart.data.datasets[0].data = [data.memory.used_gb, data.memory.available_gb];
    ramDonutChart.update('none');
  }

  if (ramHistChart) {
    ramHistChart.data.labels = labels;
    ramHistChart.data.datasets[0].data = history.ram.slice();
    ramHistChart.update('none');
  }

  if (diskIOChart) {
    diskIOChart.data.labels = labels;
    const readRate = data.disk.length > 0 ? data.disk[0].read_mb_s : 0;
    const writeRate = data.disk.length > 0 ? data.disk[0].write_mb_s : 0;
    push(diskIOChart.data.datasets[0].data, readRate);
    push(diskIOChart.data.datasets[1].data, writeRate);
    diskIOChart.update('none');
  }

  if (networkChart) {
    networkChart.data.labels = labels;
    const recvRate = data.network.reduce(function(s, n) { return s + n.recv_rate_kb_s; }, 0);
    const sentRate = data.network.reduce(function(s, n) { return s + n.sent_rate_kb_s; }, 0);
    push(networkChart.data.datasets[0].data, recvRate);
    push(networkChart.data.datasets[1].data, sentRate);
    networkChart.update('none');
  }

  if (tempChart) {
    tempChart.data.labels = labels;
    tempChart.data.datasets[0].data = history.temp.slice();
    tempChart.update('none');
  }

  if (miniCPUChart) {
    miniCPUChart.data.labels = labels;
    if (miniCPUChart.data.datasets.length === 0) {
      miniCPUChart.data.datasets.push({ label: 'CPU %', data: [], borderColor: '#388bfd', fill: false, pointRadius: 0 });
    }
    miniCPUChart.data.datasets[0].data = history.cpu.slice();
    miniCPUChart.update('none');
  }

  if (miniRAMChart) {
    miniRAMChart.data.labels = labels;
    if (miniRAMChart.data.datasets.length === 0) {
      miniRAMChart.data.datasets.push({ label: 'RAM %', data: [], borderColor: '#3fb950', fill: false, pointRadius: 0 });
    }
    miniRAMChart.data.datasets[0].data = history.ram.slice();
    miniRAMChart.update('none');
  }

  document.getElementById('dash-cpu').textContent = data.cpu.percent_total.toFixed(1) + '%';
  document.getElementById('dash-ram').textContent = data.memory.percent.toFixed(1) + '%';
  const diskPct = data.disk.length > 0 ? data.disk[0].percent : 0;
  document.getElementById('dash-disk').textContent = diskPct.toFixed(1) + '%';
  const tempVal = data.temperature.cpu_celsius;
  const tempEl = document.getElementById('dash-temp');
  tempEl.textContent = tempVal !== null ? tempVal.toFixed(1) + '°C' : '--';
  tempEl.className = 'mb-0' + (tempVal !== null ? (tempVal > 85 ? ' cpu-crit' : tempVal > 70 ? ' cpu-warn' : ' cpu-ok') : '');

  const now = Date.now();
  if (data.temperature.cpu_celsius !== null && data.temperature.cpu_celsius > 85 && now - lastTempAlert > 300000) {
    lastTempAlert = now;
    Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Temperatura crítica: ' + data.temperature.cpu_celsius + '°C', showConfirmButton: false, timer: 5000 });
  }
}

function initCharts() {
  cpuChart = createCPUChart(document.getElementById('cpu-chart'));
  ramDonutChart = createRAMDonut(document.getElementById('ram-donut-chart'));
  ramHistChart = createRAMHistChart(document.getElementById('ram-hist-chart'));
  diskIOChart = createDiskIOChart(document.getElementById('disk-io-chart'));
  networkChart = createNetworkChart(document.getElementById('network-chart'));
  tempChart = createTempChart(document.getElementById('temp-chart'));
  miniCPUChart = createLineChart(document.getElementById('mini-cpu-chart'));
  miniRAMChart = createRAMHistChart(document.getElementById('mini-ram-chart'));
}
