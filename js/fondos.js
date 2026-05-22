let fondosData = [];

// Configuración de requisas — se guarda en localStorage
let reglasRequisa = JSON.parse(localStorage.getItem("reglasRequisa") || JSON.stringify({
  modo: "proporcional", // "proporcional" | "orden"
  intocables: ["Vivienda", "Salud", "Educación", "Pago TCs"],
  requisables: [], // se infiere de fondosData si está vacío
  orden: []        // solo para modo "orden"
}));

function guardarReglasRequisa() {
  localStorage.setItem("reglasRequisa", JSON.stringify(reglasRequisa));
}

async function cargarFondos() {
  fondosData = await leerHoja(CONFIG.sheets.fondos) || [];
  return fondosData;
}

function formatCLP(n) {
  const num = parseInt(n) || 0;
  return "$" + num.toLocaleString("es-CL");
}

function pctFondo(f) {
  const presup  = parseInt(f["Presupuesto Mensual"]) || 0;
  const saldo   = parseInt(f["Saldo Actual"]) || 0;
  const gastado = presup - saldo;
  if (presup === 0) return 0;
  return Math.min(100, Math.round((gastado / presup) * 100));
}

function colorFondo(pct) {
  if (pct >= 100) return "var(--red)";
  if (pct >= 80)  return "var(--yellow)";
  return "var(--green)";
}

function semaforo(pct) {
  if (pct >= 100) return "🔴";
  if (pct >= 80)  return "🟡";
  return "🟢";
}

// ── Calcular requisa proporcional ──────────────────────────────────────────
function calcularRequisa(nombreFondo, montoSobregasto) {
  if (montoSobregasto <= 0) return [];

  // Fondos requisables: los que no son intocables y tienen saldo > 0
  const candidatos = fondosData.filter(f => {
    const nombre = f["Fondo"];
    if (nombre === nombreFondo) return false;
    if (reglasRequisa.intocables.includes(nombre)) return false;
    const saldo = parseInt(f["Saldo Actual"]) || 0;
    return saldo > 0;
  });

  if (candidatos.length === 0) return [];

  if (reglasRequisa.modo === "proporcional") {
    const totalDisponible = candidatos.reduce((s, f) => s + (parseInt(f["Saldo Actual"]) || 0), 0);
    if (totalDisponible === 0) return [];

    let restante = montoSobregasto;
    const requisas = candidatos.map((f, i) => {
      const saldo = parseInt(f["Saldo Actual"]) || 0;
      const pct   = saldo / totalDisponible;
      const monto = i === candidatos.length - 1
        ? restante // último toma el resto para evitar redondeo
        : Math.round(montoSobregasto * pct);
      restante -= monto;
      return { fondo: f["Fondo"], monto: Math.min(monto, saldo) };
    }).filter(r => r.monto > 0);

    return requisas;

  } else { // modo orden
    const orden = reglasRequisa.orden.length > 0
      ? reglasRequisa.orden
      : candidatos.map(f => f["Fondo"]);

    let restante = montoSobregasto;
    const requisas = [];

    for (const nombre of orden) {
      if (restante <= 0) break;
      const f = fondosData.find(f => f["Fondo"] === nombre);
      if (!f) continue;
      const saldo = parseInt(f["Saldo Actual"]) || 0;
      if (saldo <= 0) continue;
      const monto = Math.min(restante, saldo);
      requisas.push({ fondo: nombre, monto });
      restante -= monto;
    }

    return requisas;
  }
}

// ── Aplicar requisa ────────────────────────────────────────────────────────
function aplicarRequisa(requisas) {
  for (const r of requisas) {
    const idx = fondosData.findIndex(f => f["Fondo"] === r.fondo);
    if (idx < 0) continue;
    const nuevoSaldo = (parseInt(fondosData[idx]["Saldo Actual"]) || 0) - r.monto;
    fondosData[idx]["Saldo Actual"] = nuevoSaldo;
    // Registrar cuánto cedió este fondo (para el gráfico)
    const cedido = parseInt(fondosData[idx]["_cedido"] || 0) + r.monto;
    fondosData[idx]["_cedido"] = cedido;
    syncCelda(CONFIG.sheets.fondos, `D${idx + 3}`, nuevoSaldo);
  }
}

// ── Abonar a un fondo ──────────────────────────────────────────────────────
function abonarFondo(nombreFondo, monto) {
  const idx = fondosData.findIndex(f => f["Fondo"] === nombreFondo);
  if (idx < 0) return;
  const nuevoSaldo = (parseInt(fondosData[idx]["Saldo Actual"]) || 0) + monto;
  fondosData[idx]["Saldo Actual"] = nuevoSaldo;
  syncCelda(CONFIG.sheets.fondos, `D${idx + 3}`, nuevoSaldo);
}

// ── Descontar de un fondo (retorna sobregasto si hay) ─────────────────────
function descontarFondo(nombreFondo, monto) {
  const idx = fondosData.findIndex(f => f["Fondo"] === nombreFondo);
  if (idx < 0) return 0;
  const saldoActual = parseInt(fondosData[idx]["Saldo Actual"]) || 0;
  const nuevoSaldo  = saldoActual - monto;
  fondosData[idx]["Saldo Actual"] = nuevoSaldo;
  syncCelda(CONFIG.sheets.fondos, `D${idx + 3}`, nuevoSaldo);
  return nuevoSaldo < 0 ? Math.abs(nuevoSaldo) : 0; // retorna sobregasto
}
