let _gastoPendiente = null;

function registrarGasto(fecha, fondoId, itemId, monto, medioPago, cuenta, cuotas, notas) {
  const montoInt = parseInt(monto);
  if (!montoInt || montoInt <= 0) { mostrarError("Monto inválido."); return; }

  const fondo = fondoById(fondoId);
  if (!fondo) { mostrarError("Fondo no encontrado."); return; }

  const item       = itemId ? (fondo.items||[]).find(it=>it.id===itemId) : null;
  const saldoFondo = fondo.saldoActual || 0;
  const saldoItem  = item?.saldoActual || 0;
  const sobreItem  = item?.presupuestado ? Math.max(0, montoInt - saldoItem) : 0;
  const sobreFondo = Math.max(0, montoInt - saldoFondo);

  if (sobreItem > 0 || sobreFondo > 0) {
    const reqInterna = sobreItem  > 0 ? calcularRequisaInterna(fondo, itemId, sobreItem)  : [];
    const reqExterna = sobreFondo > 0 ? calcularRequisaExterna(fondoId, sobreFondo) : [];
    _gastoPendiente  = { fecha, fondoId, itemId, montoInt, medioPago, cuenta, cuotas, notas,
      sobreItem, sobreFondo, reqInterna, reqExterna, fondo, item };
    mostrarModalRequisa();
    return;
  }

  _ejecutarGasto({ fecha, fondoId, itemId, montoInt, medioPago, cuenta, cuotas, notas,
    sobreItem:0, sobreFondo:0, reqInterna:[], reqExterna:[], fondo, item });
}

function mostrarModalRequisa() {
  const g  = _gastoPendiente;
  const el = document.getElementById("modal-requisa");
  if (!el) return;
  let html = "";

  if (g.sobreItem > 0 && g.item) {
    const cubierto  = g.reqInterna.reduce((s,r)=>s+r.monto,0);
    const sinCubrir = g.sobreItem - cubierto;
    html += `
      <div class="requisa-bloque">
        <div class="requisa-bloque-titulo">🔀 Requisa interna — ${g.fondo.nombre}</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px">
          ${g.item.nombre} se pasa en <strong style="color:var(--red)">${formatCLP(g.sobreItem)}</strong>
        </div>
        ${g.reqInterna.map(r=>`<div class="requisa-row"><span>${r.nombre}</span><span style="color:var(--yellow)">-${formatCLP(r.monto)}</span></div>`).join("")}
        ${!g.reqInterna.length?`<div style="color:var(--red);font-size:13px">⚠ Sin ítems requisables</div>`:""}
        ${sinCubrir>0?`<div style="color:var(--yellow);font-size:12px;margin-top:6px">⚠ ${formatCLP(sinCubrir)} se absorbe del saldo del fondo</div>`:""}
      </div>`;
  }

  if (g.sobreFondo > 0) {
    const cubierto  = g.reqExterna.reduce((s,r)=>s+r.monto,0);
    const sinCubrir = g.sobreFondo - cubierto;
    html += `
      <div class="requisa-bloque" style="margin-top:${g.sobreItem>0?12:0}px">
        <div class="requisa-bloque-titulo">🔀 Requisa externa — otros fondos</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px">
          Faltan <strong style="color:var(--red)">${formatCLP(g.sobreFondo)}</strong> en ${g.fondo.nombre}
        </div>
        ${g.reqExterna.map(r=>`<div class="requisa-row"><span>${r.nombre}</span><span style="color:var(--yellow)">-${formatCLP(r.monto)}</span></div>`).join("")}
        ${!g.reqExterna.length?`<div style="color:var(--red);font-size:13px">⚠ Sin fondos requisables — quedará en negativo</div>`:""}
        ${sinCubrir>0?`<div style="color:var(--red);font-size:12px;margin-top:6px">⚠ ${formatCLP(sinCubrir)} sin cubrir</div>`:""}
      </div>`;
  }

  document.getElementById("requisa-contenido").innerHTML = html;
  el.style.display = "flex";
}

function cerrarModalRequisa() {
  document.getElementById("modal-requisa").style.display = "none";
  _gastoPendiente = null;
}

function confirmarModalRequisa() {
  document.getElementById("modal-requisa").style.display = "none";
  if (!_gastoPendiente) return;
  _ejecutarGasto(_gastoPendiente);
  _gastoPendiente = null;
  document.getElementById("form-gasto")?.reset();
  renderFormGasto();
  renderDashboard();
}

function _ejecutarGasto(g) {
  // Descontar ítem
  if (g.item) g.item.saldoActual = (g.item.saldoActual||0) - g.montoInt;
  // Descontar fondo
  g.fondo.saldoActual = (g.fondo.saldoActual||0) - g.montoInt;
  // Requisas
  if (g.reqInterna.length) aplicarRequisaInterna(g.fondo, g.itemId, g.reqInterna);
  if (g.reqExterna.length) aplicarRequisaExterna(g.reqExterna);

  // TC
  if (g.medioPago === "TC" && g.cuenta) {
    const tc = STATE.tcs.find(t=>t.nombre===g.cuenta);
    if (tc) tc.usado = (tc.usado||0) + g.montoInt;
  }
  // Débito
  if (g.medioPago === "Débito" && g.cuenta) {
    const deb = STATE.debitos.find(d=>d.nombre===g.cuenta);
    if (deb) deb.saldo = (deb.saldo||0) - g.montoInt;
  }

  // Log — solo gastos con TC generan entrada de log
  if (g.medioPago === "TC") {
    logEntry("gasto_tc",
      g.notas || g.fondo.nombre,
      g.montoInt,
      { fondoNombre: g.fondo.nombre, itemNombre: g.item?.nombre||"", tcNombre: g.cuenta }
    );
  }

  marcarDirty();

  const reqDesc = [...(g.reqInterna||[]), ...(g.reqExterna||[])].map(r=>`${r.nombre}:-${formatCLP(r.monto)}`).join(", ");
  agregarGasto([
    g.fecha, g.fondo.nombre, g.item?.nombre||"", g.montoInt,
    g.medioPago, g.cuenta||"", g.cuotas||"No", g.notas||"", reqDesc||""
  ]);

  mostrarExito((g.reqInterna.length+g.reqExterna.length)>0 ? "Gasto registrado con requisa ✓" : "Gasto registrado ✓");
}

function hoyFormato() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
