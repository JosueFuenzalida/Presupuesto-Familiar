let chartGastos = null;
let chartDeuda   = null;
let chartFondos  = null;

const COLORES = [
  "#1565C0","#2E7D32","#F57F17","#AD1457","#6A1B9A",
  "#00838F","#E64A19","#4527A0","#558B2F","#00695C"
];

function destruirChart(chart) {
  if (chart) { chart.destroy(); }
  return null;
}

function renderChartGastosPorFondo(canvasId) {
  chartGastos = destruirChart(chartGastos);
  const labels  = fondosData.map(f => f["Fondo"]);
  const gastado = fondosData.map(f => {
    const presup = parseInt(f["Presupuesto Mensual"]) || 0;
    const saldo  = parseInt(f["Saldo Actual"]) || 0;
    return Math.max(0, presup - saldo);
  });
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartGastos = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: gastado, backgroundColor: COLORES, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 11 }, padding: 10 } },
        tooltip: { callbacks: { label: c => ` ${formatCLP(c.raw)}` } }
      }
    }
  });
}

function renderChartDeuda(canvasId) {
  chartDeuda = destruirChart(chartDeuda);
  const tcsActivas = tcsData.filter(tc => tc["Activa"] === "SI");
  const labels  = tcsActivas.map(tc => tc["Nombre"]);
  const usados  = tcsActivas.map(tc => parseInt(tc["Usado"]) || 0);
  const libres  = tcsActivas.map(tc => Math.max(0, (parseInt(tc["Cupo Total"]) || 0) - (parseInt(tc["Usado"]) || 0)));
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartDeuda = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Usado",     data: usados, backgroundColor: "#E53935", borderRadius: 4 },
        { label: "Disponible",data: libres, backgroundColor: "#81C784", borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, ticks: { callback: v => formatCLP(v) }, grid: { color: "rgba(0,0,0,.06)" } }
      },
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatCLP(c.raw)}` } }
      }
    }
  });
}

function renderChartFondos(canvasId) {
  chartFondos = destruirChart(chartFondos);
  const labels   = fondosData.map(f => f["Fondo"]);
  const presups  = fondosData.map(f => parseInt(f["Presupuesto Mensual"]) || 0);
  const saldos   = fondosData.map(f => parseInt(f["Saldo Actual"]) || 0);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartFondos = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Presupuesto", data: presups, backgroundColor: "#90CAF9", borderRadius: 4 },
        { label: "Disponible",  data: saldos,  backgroundColor: "#A5D6A7", borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: v => formatCLP(v) }, grid: { color: "rgba(0,0,0,.06)" } }
      },
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatCLP(c.raw)}` } }
      }
    }
  });
}
