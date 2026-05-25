// ══ PAGOS DE TC Y LOG ══════════════════════════════════════════════════════

// El log vive en STATE.log — array de entradas
// Cada entrada: { id, fecha, tipo, descripcion, monto, fondoNombre, tcNombre, debitoNombre, cartola }
// cartola: número de cartola al que pertenece (0 = sin cerrar)

if (!STATE.log) STATE.log = [];
if (!STATE.cartolas) STATE.cartolas = [];
if (!STATE.proximaCartola) STATE.proximaCartola = 1;

// ── Agregar entrada al log ─────────────────────────────────────────────────
function logEntry(tipo, descripcion, monto, extra) {
  const entry = {
    id:          uid(),
    fecha:       hoyFormato() + " " + new Date().toLocaleTimeString("es-CL", {hour:"2-digit",minute:"2-digit"}),
    tipo,        // "gasto_tc" | "pago_tc" | "ingreso" | "ajuste"
    descripcion,
    monto,
    cartola:     0, // sin cerrar
    ...extra
  };
  if (!STATE.log) STATE.log = [];
  STATE.log.unshift(entry); // más reciente primero
  marcarDirty();
  return entry;
}

// ── Registrar pago de TC ───────────────────────────────────────────────────
function iniciarPagoTC(tcNombre) {
  const tc = STATE.tcs.find(t => t.nombre === tcNombre);
  if (!tc) return;

  const modal = document.getElementById("modal-pago-tc");
  document.getElementById("pago-tc-nombre").textContent  = tcNombre;
  document.getElementById("pago-tc-saldo").textContent   = formatCLP(tc.usado || 0);
  document.getElementById("pago-tc-monto").value         = Math.max(10000, Math.round((tc.usado||0)*0.03));
  document.getElementById("pago-tc-monto").max           = tc.usado || 0;

  // Poblar débitos
  const selDebito = document.getElementById("pago-tc-debito");
  selDebito.innerHTML = STATE.debitos.filter(d=>d.activa!==false)
    .map(d=>`<option value="${d.nombre}">${d.nombre} (${formatCLP(d.saldo||0)})</option>`).join("");

  // Poblar fondo origen
  const selFondo = document.getElementById("pago-tc-fondo");
  selFondo.innerHTML = STATE.fondos
    .map(f=>`<option value="${f.nombre}">${f.nombre} (${formatCLP(f.saldoActual||0)})</option>`).join("");

  // Seleccionar "Pago Deudas" por defecto si existe
  const pagoDeudas = STATE.fondos.find(f => f.nombre.toLowerCase().includes("deuda") || f.nombre.toLowerCase().includes("pago"));
  if (pagoDeudas) selFondo.value = pagoDeudas.nombre;

  modal.dataset.tc = tcNombre;
  modal.style.display = "flex";
}

function cerrarModalPagoTC() {
  document.getElementById("modal-pago-tc").style.display = "none";
}

function confirmarPagoTC() {
  const tcNombre    = document.getElementById("modal-pago-tc").dataset.tc;
  const monto       = parseInt(document.getElementById("pago-tc-monto").value) || 0;
  const debitoNombre= document.getElementById("pago-tc-debito").value;
  const fondoNombre = document.getElementById("pago-tc-fondo").value;

  if (!monto || monto <= 0) { mostrarError("Monto inválido"); return; }

  const tc     = STATE.tcs.find(t => t.nombre === tcNombre);
  const debito = STATE.debitos.find(d => d.nombre === debitoNombre);
  const fondo  = STATE.fondos.find(f => f.nombre === fondoNombre);

  if (!tc)     { mostrarError("TC no encontrada"); return; }
  if (!debito) { mostrarError("Cuenta débito no encontrada"); return; }
  if (!fondo)  { mostrarError("Fondo no encontrado"); return; }

  // Aplicar cambios en STATE
  tc.usado              = Math.max(0, (tc.usado||0) - monto);
  debito.saldo          = (debito.saldo||0) - monto;
  fondo.saldoActual     = (fondo.saldoActual||0) - monto;

  // Log
  logEntry("pago_tc",
    `Pago ${tcNombre} desde ${debitoNombre}`,
    monto,
    { tcNombre, debitoNombre, fondoNombre }
  );

  // Excel
  agregarGasto([
    hoyFormato(), fondoNombre, "Pago TC", monto,
    "Débito", debitoNombre, "No", `Pago TC ${tcNombre}`, ""
  ]);

  marcarDirty();
  cerrarModalPagoTC();
  mostrarExito(`Pago de ${formatCLP(monto)} a ${tcNombre} registrado ✓`);
  renderDeuda();
  renderDashboard();
}

// ── Vista Log ──────────────────────────────────────────────────────────────
function renderLog() {
  const el = document.getElementById("lista-log");
  if (!el) return;

  const log = STATE.log || [];

  if (!log.length) {
    el.innerHTML = `<div style="color:var(--text3);text-align:center;padding:30px 0;font-size:14px">Sin transacciones registradas</div>`;
    return;
  }

  // Agrupar por cartola
  const sinCerrar = log.filter(e => e.cartola === 0);
  const cerradas  = log.filter(e => e.cartola > 0);

  let html = "";

  if (sinCerrar.length) {
    html += `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--accent)">Período actual — sin cerrar (${sinCerrar.length})</div>
      <button class="btn btn-primary btn-sm" onclick="cerrarDia()">Cerrar día →</button>
    </div>
    ${sinCerrar.map(e => renderLogEntry(e)).join("")}`;
  }

  // Cartolas cerradas agrupadas
  const numCartolas = [...new Set(cerradas.map(e=>e.cartola))].sort((a,b)=>b-a);
  numCartolas.forEach(num => {
    const entries  = cerradas.filter(e=>e.cartola===num);
    const cartola  = STATE.cartolas?.find(c=>c.numero===num);
    html += `
    <div style="margin-top:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:13px;font-weight:600;color:var(--text2)">Cartola ${num} — ${cartola?.fechaCierre||""}</div>
        <button class="btn btn-ghost btn-sm" onclick="descargarCartola(${num})">⬇ Descargar</button>
      </div>
      ${entries.map(e => renderLogEntry(e)).join("")}
    </div>`;
  });

  el.innerHTML = html;
}

function renderLogEntry(e) {
  const iconos = { gasto_tc:"💳", pago_tc:"✅", ingreso:"💵", ajuste:"✏️" };
  const colors = { gasto_tc:"var(--red)", pago_tc:"var(--green)", ingreso:"var(--green)", ajuste:"var(--yellow)" };
  const signo  = e.tipo === "ingreso" || e.tipo === "pago_tc" ? "+" : "-";
  return `
  <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
    <span style="font-size:16px;flex-shrink:0">${iconos[e.tipo]||"•"}</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;color:var(--text)">${e.descripcion}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">
        ${e.fecha}${e.fondoNombre?` · ${e.fondoNombre}`:""}${e.tcNombre?` · ${e.tcNombre}`:""}
      </div>
    </div>
    <div style="font-size:15px;font-weight:600;color:${colors[e.tipo]||"var(--text)"};flex-shrink:0">
      ${signo}${formatCLP(e.monto)}
    </div>
  </div>`;
}

// ── Cerrar día / Generar cartola ──────────────────────────────────────────
function cerrarDia() {
  const sinCerrar = (STATE.log||[]).filter(e=>e.cartola===0);
  if (!sinCerrar.length) { mostrarError("No hay transacciones pendientes de cerrar"); return; }

  if (!confirm(`¿Cerrar el día? Se generará la Cartola ${STATE.proximaCartola||1} con ${sinCerrar.length} transacciones.`)) return;

  const numCartola = STATE.proximaCartola || 1;
  const fechaCierre = hoyFormato() + " " + new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});

  // Marcar entradas con número de cartola
  STATE.log.forEach(e => { if (e.cartola === 0) e.cartola = numCartola; });

  // Registrar cartola
  if (!STATE.cartolas) STATE.cartolas = [];
  STATE.cartolas.push({ numero: numCartola, fechaCierre, cantEntradas: sinCerrar.length });
  STATE.proximaCartola = numCartola + 1;

  marcarDirty();
  mostrarExito(`Cartola ${numCartola} generada ✓`);
  renderLog();
  descargarCartola(numCartola);
}

// ── Descargar cartola como .txt ───────────────────────────────────────────
function descargarCartola(numCartola) {
  const cartola  = STATE.cartolas?.find(c=>c.numero===numCartola);
  const entries  = (STATE.log||[]).filter(e=>e.cartola===numCartola);
  if (!entries.length) { mostrarError("Cartola vacía"); return; }

  const sep    = "─".repeat(50);
  const fecha  = cartola?.fechaCierre || hoyFormato();
  const usuario= obtenerUsuario() || "—";

  const gastosTc  = entries.filter(e=>e.tipo==="gasto_tc");
  const pagosTc   = entries.filter(e=>e.tipo==="pago_tc");
  const ingresos  = entries.filter(e=>e.tipo==="ingreso");
  const ajustes   = entries.filter(e=>e.tipo==="ajuste");

  let txt = `PRESUPUESTO FAMILIAR — CARTOLA ${numCartola}\n`;
  txt += `Fecha cierre: ${fecha}\n`;
  txt += `Usuario: ${usuario}\n`;
  txt += sep + "\n\n";

  if (gastosTc.length) {
    txt += `GASTOS CON TARJETA DE CRÉDITO:\n`;
    gastosTc.forEach(e => {
      txt += `  ${e.fecha.padEnd(16)} ${(e.descripcion||"").padEnd(30)} ${(e.fondoNombre||"").padEnd(18)} → ${(e.tcNombre||"").padEnd(15)} ${formatCLP(e.monto)}\n`;
    });
    txt += "\n";
  }

  if (pagosTc.length) {
    txt += `PAGOS DE TARJETAS:\n`;
    pagosTc.forEach(e => {
      txt += `  ${e.fecha.padEnd(16)} ${(e.tcNombre||"").padEnd(20)} desde ${(e.debitoNombre||"").padEnd(18)} ${formatCLP(e.monto)}\n`;
    });
    txt += "\n";
  }

  if (ingresos.length) {
    txt += `INGRESOS:\n`;
    ingresos.forEach(e => {
      txt += `  ${e.fecha.padEnd(16)} ${(e.descripcion||"").padEnd(30)} +${formatCLP(e.monto)}\n`;
    });
    txt += "\n";
  }

  if (ajustes.length) {
    txt += `AJUSTES MANUALES:\n`;
    ajustes.forEach(e => {
      txt += `  ${e.fecha.padEnd(16)} ${(e.fondoNombre||"").padEnd(20)} ${formatCLP(e.monto)}\n`;
    });
    txt += "\n";
  }

  // Resumen bancario — movimientos necesarios
  txt += sep + "\n";
  txt += `RESUMEN BANCARIO — MOVIMIENTOS SUGERIDOS:\n`;
  txt += sep + "\n";

  // Agrupar gastos TC por fondo → TC
  const movimientos = {};
  gastosTc.forEach(e => {
    const key = `${e.fondoNombre||"?"}|${e.tcNombre||"?"}`;
    if (!movimientos[key]) movimientos[key] = { fondo: e.fondoNombre, tc: e.tcNombre, total: 0 };
    movimientos[key].total += e.monto;
  });

  Object.values(movimientos).forEach(m => {
    const fondo  = STATE.fondos.find(f=>f.nombre===m.fondo);
    const cuenta = fondo?.cuentaAsociada || "— (sin cuenta asignada)";
    txt += `  ${m.fondo.padEnd(20)} → ${m.tc.padEnd(20)} ${formatCLP(m.total).padStart(12)}`;
    txt += `   [desde: ${cuenta}]\n`;
  });

  txt += "\n" + sep + "\n";
  txt += `Total gastos TC:  ${formatCLP(gastosTc.reduce((s,e)=>s+e.monto,0))}\n`;
  txt += `Total pagos TC:   ${formatCLP(pagosTc.reduce((s,e)=>s+e.monto,0))}\n`;
  txt += `Total ingresos:   ${formatCLP(ingresos.reduce((s,e)=>s+e.monto,0))}\n`;
  txt += sep + "\n";
  txt += `Generado por Presupuesto Familiar v${CONFIG.version}\n`;

  // Descargar
  const blob = new Blob([txt], { type:"text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `cartola-${numCartola}-${hoyFormato().replace(/\//g,"-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
