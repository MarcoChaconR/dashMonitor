Chart.defaults.color = '#6c757d';
Chart.defaults.borderColor = '#dee2e6';
Chart.defaults.animation = false;

const history = { cpu: [], ram: [], disk: [], net: [], temp: [] };

function getHistoryPoints() { return 30; }

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



const centerTextPlugin = {
  id: 'centerText',
  beforeDraw: function(chart) {
    var width = chart.chartArea ? (chart.chartArea.right - chart.chartArea.left) : chart.width;
    var height = chart.chartArea ? (chart.chartArea.bottom - chart.chartArea.top) : chart.height;
    var ctx = chart.ctx;
    ctx.save();
    var data = chart.data.datasets[0].data;
    var total = data[0] + data[1];
    var pct = total > 0 ? Math.round(data[0] / total * 100) : 0;
    var centerX = chart.getDatasetMeta(0).data[0].x;
    var centerY = chart.getDatasetMeta(0).data[0].y;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#212529';
    ctx.fillText(pct + '%', centerX, centerY - 8);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#6c757d';
    ctx.fillText(data[0].toFixed(1) + ' / ' + total.toFixed(1) + ' GB', centerX, centerY + 18);
    ctx.restore();
  }
};

function createRAMDonut(ctx) {
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Usado', 'Disponible'],
      datasets: [{ data: [0, 1], backgroundColor: ['#dc3545', '#198754'], borderWidth: 0 }]
    },
    plugins: [centerTextPlugin],
    options: {
      responsive: true, maintainAspectRatio: true,
      cutout: '75%',
      rotation: -Math.PI / 2,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return ctx.label + ': ' + ctx.parsed.toFixed(1) + ' GB'; } } } }
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

function createDiskBarChart(ctx) {
  return new Chart(ctx, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: true,
      indexAxis: 'y',
      scales: { x: { min: 0, max: 100, title: { display: true, text: 'Uso %' } } },
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
let cpuCharts = [], ramDonutChart, ramHistChart, diskBarChart, diskIOChart, networkChart, tempChart;
let miniCPUChart, miniRAMChart;

function updateAllCharts(data) {
  push(history.cpu, data.cpu.percent_total);
  push(history.ram, data.memory.percent);
  push(history.disk, data.disk.length > 0 ? data.disk[0].percent : 0);
  const netTotal = data.network.reduce((s, n) => s + n.recv_rate_kb_s, 0);
  push(history.net, netTotal);
  push(history.temp, data.temperature.cpu_celsius || 0);

  const labels = history.cpu.map(function() { return ''; });

  var cores = data.cpu.percent_per_core;
  if (cpuCharts.length !== cores.length) {
    var container = document.getElementById('cpu-charts');
    container.innerHTML = '';
    cpuCharts = [];
    cores.forEach(function(_, i) {
      var col = document.createElement('div');
      col.className = 'col-md-' + (cores.length <= 2 ? '6' : '4');
      var card = document.createElement('div');
      card.className = 'card p-2';
      var title = document.createElement('h6');
      title.className = 'mb-2 text-center';
      title.textContent = 'Núcleo ' + i;
      card.appendChild(title);
      var canvas = document.createElement('canvas');
      canvas.id = 'core-chart-' + i;
      card.appendChild(canvas);
      col.appendChild(card);
      container.appendChild(col);
      cpuCharts.push(new Chart(canvas, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Núcleo ' + i, data: [], borderColor: '#0d6efd', backgroundColor: 'rgba(13,110,253,0.1)', fill: true, pointRadius: 0 }] },
        options: {
          responsive: true, maintainAspectRatio: true,
          scales: { y: { min: 0, max: 100 } },
          plugins: { legend: { display: false } }
        }
      }));
    });
  }
  cores.forEach(function(coreVal, i) {
    cpuCharts[i].data.labels = labels;
    cpuCharts[i].data.datasets[0].data.push(coreVal);
    var max = getHistoryPoints();
    if (cpuCharts[i].data.datasets[0].data.length > max) cpuCharts[i].data.datasets[0].data.shift();
    cpuCharts[i].update('none');
  });

  if (ramDonutChart) {
    ramDonutChart.data.datasets[0].data = [data.memory.used_gb, data.memory.available_gb];
    ramDonutChart.update('none');
  }

  if (ramHistChart) {
    ramHistChart.data.labels = labels;
    ramHistChart.data.datasets[0].data = history.ram.slice();
    ramHistChart.update('none');
  }

  if (diskBarChart) {
    var partitions = data.disk;
    diskBarChart.data.labels = partitions.map(function(p) { return p.mountpoint; });
    var colors = partitions.map(function(p) { return p.percent > 80 ? '#dc3545' : (p.percent > 60 ? '#ffc107' : '#198754'); });
    diskBarChart.data.datasets = [{
      label: 'Uso %',
      data: partitions.map(function(p) { return p.percent; }),
      backgroundColor: colors,
      borderWidth: 0,
      borderRadius: 4
    }];
    diskBarChart.update('none');
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

  ramDonutChart = createRAMDonut(document.getElementById('ram-donut-chart'));
  ramHistChart = createRAMHistChart(document.getElementById('ram-hist-chart'));
  diskBarChart = createDiskBarChart(document.getElementById('disk-bar-chart'));
  diskIOChart = createDiskIOChart(document.getElementById('disk-io-chart'));
  networkChart = createNetworkChart(document.getElementById('network-chart'));
  tempChart = createTempChart(document.getElementById('temp-chart'));
  miniCPUChart = createLineChart(document.getElementById('mini-cpu-chart'));
  miniRAMChart = createRAMHistChart(document.getElementById('mini-ram-chart'));
}
