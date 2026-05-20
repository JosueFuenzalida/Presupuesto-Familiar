let tcsData = [];
let debitosData = [];

async function cargarTCs() {
  tcsData = await leerHoja(CONFIG.sheets.tcs) || [];
  return tcsData;
}

async function cargarDebitos() {
  debitosData = await leerHoja(CONFIG.sheets.debitos) || [];
  return debitosData;
}

function pctUsoTC(tc) {
  const cupo  = parseInt(tc["Cupo"]) || 0;
  const usado = parseInt(tc["Usado"])      || 0;
  if (cupo === 0) return 0;
  return Math.round((usado / cupo) * 100);
}

function estadoTC(pct) {
  if (pct >= 80) return { label: "URGENTE", color: "#E53935", icon: "🔴" };
  if (pct >= 40) return { label: "ALERTA",  color: "#FB8C00", icon: "🟡" };
  return           { label: "OK",      color: "#43A047", icon: "🟢" };
}

function totalDeuda() {
  return tcsData.reduce((sum, tc) => sum + (parseInt(tc["Usado"]) || 0), 0);
}

function totalCupo() {
  return tcsData.reduce((sum, tc) => sum + (parseInt(tc["Cupo"]) || 0), 0);
}

function totalDisponibleTC() {
  return tcsData.reduce((sum, tc) => {
    const cupo  = parseInt(tc["Cupo"]) || 0;
    const usado = parseInt(tc["Usado"])      || 0;
    return sum + Math.max(0, cupo - usado);
  }, 0);
}

function totalMantencion() {
  return tcsData
    .filter(tc => tc["Activa"] === "SI")
    .reduce((sum, tc) => sum + (parseInt(tc["Mantención"]) || 0), 0);
}

function totalCaja() {
  return debitosData
    .filter(d => d["Activa"] === "SI")
    .reduce((sum, d) => sum + (parseInt(d["Saldo Actual"]) || 0), 0);
}

async function actualizarSaldoTC(nombreTC, nuevoUsado) {
  const idx = tcsData.findIndex(tc => tc["Nombre"] === nombreTC);
  if (idx < 0) return false;
  tcsData[idx]["Usado"] = nuevoUsado;
  const filaExcel = idx + 3;
  return actualizarCelda(CONFIG.sheets.tcs, `D${filaExcel}`, nuevoUsado);
}

async function actualizarSaldoDebito(nombreCuenta, nuevoSaldo) {
  const idx = debitosData.findIndex(d => d["Nombre"] === nombreCuenta);
  if (idx < 0) return false;
  debitosData[idx]["Saldo Actual"] = nuevoSaldo;
  const filaExcel = idx + 3;
  return actualizarCelda(CONFIG.sheets.debitos, `C${filaExcel}`, nuevoSaldo);
}
