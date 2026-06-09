// ══ GASTOS — usa dispatchOperation, no mutación directa ═══════════════════
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
    _gastoPendiente = {
      fecha, fondoId, itemId, montoInt, medioPago, cuenta, cuotas, notas,
      sobreItem, sobreFondo, reqInterna, reqExterna,
      fondoNombre: fondo.nombre, itemNombre: item?.nombre || ""
    };
    mostrarModalRequisa();
    return;
  }

  _ejecutarGasto({
    fecha, fondoId, itemId, montoInt, medioPago, cuenta, cuotas, notas,
    sobreItem:0, sobreFondo:0, reqInterna:[], reqExterna:[],
    fondoNombre: fondo.nombre, itemNombre: item?.nombre || ""
  });
}

function mostrarModalRequisa() {
  const g  = _gastoPendiente;
  const el = document.getElementById("modal-requisa");
  if (!el) return;
  let html = "";

  if (g.sobreItem > 0) {
    const cubierto  = g.reqInterna.reduce((s,r)=>s+r.monto,0);
    const sinCubrir = g.sobreItem - cubierto;
    html += `
      <div class="requisa-bloque">
        <div class="requisa-bloque-titulo">🔀 Requisa interna — ${g.fondoNombre}</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px">
          ${g.itemNombre} se pasa en <strong style="color:var(--red)">${formatCLP(g.sobreItem)}</strong>
        </div>
        ${g.reqInterna.map(r=>`<div class="requisa-row"><span>${r.nombre}</span><span style="color:var(--yellow)">-${formatCLP(r.monto)}</span></div>`).join("")}
        ${!g.reqInterna.length?`<div style="color:var(--red);font-size:13px">⚠ Sin ítems requisables</div>`:""}
        ${sinCubrir>0?`<div style="color:var(--yellow);font-size:12px;margin-top:6px">⚠ ${formatCLP(sinCubrir)} se absorbe del fondo</div>`:""}
      </div>`;
  }

  if (g.sobreFondo > 0) {
    const cubierto  = g.reqExterna.reduce((s,r)=>s+r.monto,0);
    const sinCubrir = g.sobreFondo - cubierto;
    html += `
      <div class="requisa-bloque" style="margin-top:${g.sobreItem>0?12:0}px">
        <div class="requisa-bloque-titulo">🔀 Requisa externa — otros fondos</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px">
          Faltan <strong style="color:var(--red)">${formatCLP(g.sobreFondo)}</strong> en ${g.fondoNombre}
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

async function _ejecutarGasto(g) {
  // Construir payload completo con IDs — dispatchOperation necesita IDs, no nombres
  const requisasPayload = [
    ...(g.reqInterna||[]).map(r => ({ fondoId: fondoById(r.id||null)?.id || r.id, monto: r.monto, tipo:"interna" })),
    ...(g.reqExterna||[]).map(r => ({ fondoId: r.id, monto: r.monto, tipo:"externa" }))
  ];

  const payload = {
    fecha:       g.fecha,
    fondoId:     g.fondoId,
    fondoNombre: g.fondoNombre,
    itemId:      g.itemId || null,
    itemNombre:  g.itemNombre || "",
    monto:       g.montoInt,
    medioPago:   g.medioPago,
    tcNombre:    g.medioPago === "TC"     ? g.cuenta : null,
    debitoNombre:g.medioPago === "Débito" ? g.cuenta : null,
    cuotas:      g.cuotas || "No",
    notas:       g.notas  || "",
    requisas:    requisasPayload
  };

  // dispatchOperation → encola, aplica optimisticamente, recalcula
  await dispatchOperation(OP.GASTO, payload);

  // Log para cartola (solo TC)
  if (g.medioPago === "TC") {
    logEntry("gasto_tc", g.notas || g.fondoNombre, g.montoInt, {
      fondoNombre: g.fondoNombre,
      itemNombre:  g.itemNombre,
      tcNombre:    g.cuenta
    });
  }

  mostrarExito((g.reqInterna.length+g.reqExterna.length)>0
    ? "Gasto registrado con requisa ✓" : "Gasto registrado ✓");
}
