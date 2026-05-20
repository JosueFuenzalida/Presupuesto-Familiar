let fondosData = [];

async function cargarFondos() {
  fondosData = await leerHoja(CONFIG.sheets.fondos) || [];
  return fondosData;
}

function formatCLP(n) {
  const num = parseInt(n) || 0;
  return "$" + num.toLocaleString("es-CL");
}

function pctFondo(f) {
  const presup = parseInt(f["Presupuesto Mensual"]) || 0;
  const saldo  = parseInt(f["Saldo Actual"]) || 0;
  const gastado = presup - saldo;
  if (presup === 0) return 0;
  return Math.min(100, Math.round((gastado / presup) * 100));
}

function colorFondo(pct) {
  if (pct >= 100) return "#E53935";
  if (pct >= 80)  return "#FB8C00";
  if (pct >= 40)  return "#FDD835";
  return "#43A047";
}

function semaforo(pct) {
  if (pct >= 100) return "🔴";
  if (pct >= 80)  return "🔴";
  if (pct >= 40)  return "🟡";
  return "🟢";
}

async function descontarFondo(nombreFondo, monto) {
  const idx = fondosData.findIndex(f => f["Fondo"] === nombreFondo);
  if (idx < 0) return false;
  const saldoActual = parseInt(fondosData[idx]["Saldo Actual"]) || 0;
  const nuevoSaldo  = saldoActual - monto;
  fondosData[idx]["Saldo Actual"] = nuevoSaldo;
  // fila en Excel: idx + 3 (1 título + 1 header + 1-based)
  const filaExcel = idx + 3;
  return actualizarCelda(CONFIG.sheets.fondos, `D${filaExcel}`, nuevoSaldo);
}

async function abonarFondo(nombreFondo, monto) {
  const idx = fondosData.findIndex(f => f["Fondo"] === nombreFondo);
  if (idx < 0) return false;
  const saldoActual = parseInt(fondosData[idx]["Saldo Actual"]) || 0;
  const nuevoSaldo  = saldoActual + monto;
  fondosData[idx]["Saldo Actual"] = nuevoSaldo;
  const filaExcel = idx + 3;
  return actualizarCelda(CONFIG.sheets.fondos, `D${filaExcel}`, nuevoSaldo);
}
