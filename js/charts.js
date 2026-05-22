let chartGastos = null;
let chartDeuda  = null;
let chartFondos = null;

const COLORES = ["#4f8ef7","#2ecc71","#f39c12","#e74c3c","#9b59b6","#1abc9c","#e67e22","#3498db","#27ae60","#e91e63"];

function destruirChart(c) { if (c) c.destroy(); return null; }

// ── Gráfico dona — gastos por fondo ───────────────────────────────────────
function renderChartGastosPorFondo(canvasId) {
  chartGastos = destruirChart(chartGastos);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const labels  = fondosData.map(f => f["Fondo"]);
  const gastado = fondosData.map(f => {
    const presup = parseInt(f["Presupuesto Mensual"]) || 0;
    const saldo  = parseInt(f["Saldo Actual"]) || 0;
    return Math.max(0, presup - saldo);
  });
  chartGastos = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: gastado, backgroundColor: COLORES, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "65%",
      plugins: {
        legend: { position:"bottom", labels:{ color:"#aaa", font:{size:11}, padding:10 } },
        tooltip: { callbacks:{ label: c => ` ${formatCLP(c.raw)}` } }
      }
    }
  });
}

// ── Gráfico barras TCs ─────────────────────────────────────────────────────
function renderChartDeuda(canvasId) {
  chartDeuda = destruirChart(chartDeuda);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const tcsActivas = tcsData.filter(tc => tc["Activa"] === "SI");
  const labels = tcsActivas.map(tc => tc["Nombre"]);
  const usados = tcsActivas.map(tc => parseInt(tc["Usado"]) || 0);
  const libres = tcsActivas.map(tc => Math.max(0, (parseInt(tc["Cupo"]) || 0) - (parseInt(tc["Usado"]) || 0)));
  chartDeuda = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Usado",      data:usados, backgroundColor:"#e74c3c", borderRadius:4 },
        { label:"Disponible", data:libres, backgroundColor:"#2ecc71", borderRadius:4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { stacked:true, grid:{display:false}, ticks:{color:"#aaa"} },
        y: { stacked:true, ticks:{ callback: v => formatCLP(v), color:"#aaa" }, grid:{color:"rgba(255,255,255,.06)"} }
      },
      plugins: {
        legend: { position:"bottom", labels:{color:"#aaa"} },
        tooltip: { callbacks:{ label: c => ` ${c.dataset.label}: ${formatCLP(c.raw)}` } }
      }
    }
  });
}

// ── Gráfico horizontal fondos — Presupuesto / Aportado / Gastado ──────────
function renderChartFondos(canvasId) {
  chartFondos = destruirChart(chartFondos);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels     = fondosData.map(f => f["Fondo"]);
  const presupuesto= fondosData.map(f => parseInt(f["Presupuesto Mensual"]) || 0);
  const saldos     = fondosData.map(f => parseInt(f["Saldo Actual"]) || 0);
  const gastado    = fondosData.map((f,i) => Math.max(0, presupuesto[i] - saldos[i]));
  const sobregasto = fondosData.map((f,i) => Math.max(0, -saldos[i])); // saldo negativo = sobregasto

  chartFondos = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Gastado",     data:gastado,     backgroundColor:"#2ecc71", borderRadius:2 },
        { label:"Sobregasto",  data:sobregasto,  backgroundColor:"#e74c3c", borderRadius:2 },
        { label:"Disponible",  data:saldos.map(s=>Math.max(0,s)), backgroundColor:"#333", borderRadius:2 }
      ]
    },
    options: {
      indexAxis: "y", // ← barras horizontales
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { stacked:true, ticks:{ callback: v => formatCLP(v), color:"#aaa" }, grid:{color:"rgba(255,255,255,.06)"} },
        y: { stacked:true, grid:{display:false}, ticks:{color:"#ccc", font:{size:11}} }
      },
      plugins: {
        legend: { position:"bottom", labels:{color:"#aaa", font:{size:11}} },
        tooltip: { callbacks:{ label: c => ` ${c.dataset.label}: ${formatCLP(c.raw)}` } }
      }
    }
  });
}
