let chartGastos = null;
let chartDeuda  = null;
let chartFondos = null;

function destruirChart(c) { if (c) c.destroy(); return null; }

function renderChartGastosPorFondo(canvasId) {
  chartGastos = destruirChart(chartGastos);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const fondos  = STATE.fondos.filter(f => (f.saldoActual || 0) < (f.pctPresupuesto || 0) || true);
  const labels  = fondos.map(f => f.nombre);
  const gastado = fondos.map(f => {
    const presup = f.montoPresupuestoCalc || 0;
    return Math.max(0, presup - (f.saldoActual || 0));
  });
  chartGastos = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: gastado, backgroundColor: fondos.map(f => f.color || "#4f8ef7"), borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "65%",
      plugins: {
        legend: { position:"bottom", labels:{ color:"#aaa", font:{size:11}, padding:8 } },
        tooltip: { callbacks:{ label: c => ` ${formatCLP(c.raw)}` } }
      }
    }
  });
}

function renderChartDeuda(canvasId) {
  chartDeuda = destruirChart(chartDeuda);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const tcs    = STATE.tcs.filter(tc => tc.activa);
  const labels = tcs.map(tc => tc.nombre);
  const usados = tcs.map(tc => tc.usado || 0);
  const libres = tcs.map(tc => Math.max(0, (tc.cupo||0) - (tc.usado||0)));
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
        y: { stacked:true, ticks:{ callback: v=>formatCLP(v), color:"#aaa" }, grid:{color:"rgba(255,255,255,.05)"} }
      },
      plugins: {
        legend: { position:"bottom", labels:{color:"#aaa"} },
        tooltip: { callbacks:{ label: c=>` ${c.dataset.label}: ${formatCLP(c.raw)}` } }
      }
    }
  });
}

// Gráfico de fondos — dos barras finas por fondo:
// Barra 1: Gastado (verde) + Sobregasto (rojo) apiladas
// Barra 2: Presupuesto (referencia, gris tenue)
function renderChartFondos(canvasId) {
  chartFondos = destruirChart(chartFondos);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const fondos     = STATE.fondos;
  // Cada fondo ocupa 2 posiciones en el eje Y: "Nombre" y "" (la barra de referencia)
  const labels     = [];
  const gastadoD   = [];
  const sobreD     = [];
  const presupD    = [];
  const vacioD     = [];

  fondos.forEach(f => {
    const presup  = f.montoPresupuestoCalc || 0;
    const saldo   = f.saldoActual || 0;
    const gastado = Math.max(0, presup - saldo);
    const sobre   = Math.max(0, -saldo);

    // Fila 1: ejecución real
    labels.push(f.nombre);
    gastadoD.push(gastado);
    sobreD.push(sobre);
    presupD.push(0);
    vacioD.push(0);

    // Fila 2: presupuesto referencial (más delgada visualmente usando barPercentage)
    labels.push("");
    gastadoD.push(0);
    sobreD.push(0);
    presupD.push(presup);
    vacioD.push(0);
  });

  chartFondos = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Gastado",    data:gastadoD, backgroundColor:"#2ecc71", borderRadius:2, stack:"real",  barPercentage:0.5 },
        { label:"Sobregasto", data:sobreD,   backgroundColor:"#e74c3c", borderRadius:2, stack:"real",  barPercentage:0.5 },
        { label:"Presupuesto",data:presupD,  backgroundColor:"rgba(255,255,255,0.15)", borderRadius:2, stack:"meta", barPercentage:0.3 }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { stacked:true, ticks:{ callback:v=>formatCLP(v), color:"#aaa", maxTicksLimit:5 }, grid:{color:"rgba(255,255,255,.05)"} },
        y: { stacked:true, grid:{display:false}, ticks:{ color:"#ccc", font:{size:11} } }
      },
      plugins: {
        legend: { position:"bottom", labels:{ color:"#aaa", font:{size:11},
          filter: item => item.text !== "" } // ocultar datasets vacíos
        },
        tooltip: { callbacks:{ label: c => c.raw > 0 ? ` ${c.dataset.label}: ${formatCLP(c.raw)}` : "" } }
      }
    }
  });
}
