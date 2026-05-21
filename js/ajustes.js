// ══ AJUSTES ════════════════════════════════════════════════════════════════

let pagosAuto = JSON.parse(localStorage.getItem("pagosAuto")||"[]");

function renderAjustes() {
  mostrarPanelAjuste("home");
}

function mostrarPanelAjuste(panel) {
  document.querySelectorAll(".ajuste-panel").forEach(p => p.classList.remove("active"));
  const el = document.getElementById("ajuste-panel-" + panel);
  if (el) el.classList.add("active");

  if (panel === "tcs")       renderAjusteTCs();
  if (panel === "debitos")   renderAjusteDebitos();
  if (panel === "fondos")    renderAjusteFondos();
  if (panel === "reglas")    renderAjusteReglas();
  if (panel === "pagos")     renderPagosAuto();
  if (panel === "info")      renderInfo();
}

// ── HOME ───────────────────────────────────────────────────────────────────
// (renderizado en HTML estático)

// ── TCs ACORDEÓN ──────────────────────────────────────────────────────────
function renderAjusteTCs() {
  const el = document.getElementById("lista-ajuste-tcs");
  if (!el) return;

  el.innerHTML = tcsData.map((tc, idx) => {
    const pct    = pctUsoTC(tc);
    const estado = estadoTC(pct);
    return `
    <div class="acordeon-item" id="ac-tc-${idx}">
      <div class="acordeon-header" onclick="toggleAcordeon('tc-${idx}')">
        <div>
          <div class="acordeon-title">${tc["Nombre"]||"Sin nombre"}</div>
          <div class="acordeon-meta">${tc["Banco"]||""} · ${estado.icon} ${pct}% usado · ${formatCLP(tc["Usado"]||0)}</div>
        </div>
        <span class="acordeon-chevron">⌄</span>
      </div>
      <div class="acordeon-body">
        <div class="campo-grid">
          <div class="campo-field"><label>Nombre</label>
            <input type="text" value="${tc["Nombre"]||""}" onchange="tcsData[${idx}]['Nombre']=this.value"></div>
          <div class="campo-field"><label>Banco</label>
            <input type="text" value="${tc["Banco"]||""}" onchange="tcsData[${idx}]['Banco']=this.value"></div>
          <div class="campo-field"><label>Cupo total</label>
            <input type="number" value="${tc["Cupo"]||0}" onchange="tcsData[${idx}]['Cupo']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Saldo usado</label>
            <input type="number" value="${tc["Usado"]||0}" onchange="tcsData[${idx}]['Usado']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Tasa mensual %</label>
            <input type="number" step="0.01" value="${((parseFloat(tc["Tasa %"])||0)*100).toFixed(2)}" 
              onchange="tcsData[${idx}]['Tasa %']=parseFloat(this.value)/100"></div>
          <div class="campo-field"><label>Mantención $</label>
            <input type="number" value="${tc["Mantención"]||0}" onchange="tcsData[${idx}]['Mantención']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Día de corte</label>
            <input type="number" min="1" max="31" value="${tc["F. Corte"]||0}" onchange="tcsData[${idx}]['F. Corte']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Día de vencimiento</label>
            <input type="number" min="1" max="31" value="${tc["F. Vencimiento"]||0}" onchange="tcsData[${idx}]['F. Vencimiento']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Activa</label>
            <select onchange="tcsData[${idx}]['Activa']=this.value">
              <option ${tc["Activa"]==="SI"?"selected":""}>SI</option>
              <option ${tc["Activa"]==="NO"?"selected":""}>NO</option>
            </select></div>
          <div class="campo-field"><label>Prioridad pago</label>
            <input type="number" min="0" max="10" value="${tc["Prioridad"]||0}" onchange="tcsData[${idx}]['Prioridad']=parseInt(this.value)"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-primary btn-sm" onclick="guardarTC(${idx})">💾 Guardar</button>
          <button class="btn btn-danger btn-sm" onclick="confirmarEliminarTC(${idx})">🗑 Eliminar</button>
        </div>
      </div>
    </div>`}).join("");
}

function toggleAcordeon(id) {
  const el = document.getElementById("ac-" + id);
  if (!el) return;
  el.classList.toggle("open");
}

async function guardarTC(idx) {
  const tc  = tcsData[idx];
  const fila = idx + 3;
  const cols = { A:tc["Banco"], B:tc["Nombre"], C:tc["Cupo"], D:tc["Usado"],
    F:tc["Tasa %"], G:tc["Mantención"], H:tc["F. Corte"], I:tc["F. Vencimiento"],
    K:tc["Prioridad"]||0, L:tc["Activa"]||"SI" };
  let ok = true;
  for (const [col, val] of Object.entries(cols)) {
    if (!await actualizarCelda(CONFIG.sheets.tcs, `${col}${fila}`, val)) ok = false;
  }
  ok ? mostrarExito("TC guardada ✓") : mostrarError("Error al guardar");
  renderAjusteTCs();
}

function confirmarEliminarTC(idx) {
  if (!confirm(`¿Eliminar "${tcsData[idx]["Nombre"]}"? Esto no borra la fila del Excel, solo la marca inactiva.`)) return;
  tcsData[idx]["Activa"] = "NO";
  actualizarCelda(CONFIG.sheets.tcs, `L${idx+3}`, "NO");
  mostrarExito("TC desactivada ✓");
  renderAjusteTCs();
}

function agregarTCForm() {
  tcsData.push({ Banco:"", Nombre:"Nueva TC", Cupo:0, Usado:0, "Tasa %":0, Mantención:0,
    "F. Corte":0, "F. Vencimiento":0, Prioridad:0, Activa:"SI", Notas:"" });
  renderAjusteTCs();
  // Abrir el último acordeón
  setTimeout(() => {
    const last = document.getElementById(`ac-tc-${tcsData.length-1}`);
    if (last) last.classList.add("open");
    last?.scrollIntoView({ behavior:"smooth" });
  }, 100);
}

async function guardarNuevaTC() {
  const idx  = tcsData.length - 1;
  const tc   = tcsData[idx];
  const vals = ["", tc["Banco"], tc["Nombre"], tc["Cupo"], tc["Usado"], "",
    tc["Tasa %"], tc["Mantención"], tc["F. Corte"], tc["F. Vencimiento"],
    "", tc["Prioridad"]||0, tc["Activa"]||"SI", tc["Notas"]||""];
  const ok = await agregarFila(CONFIG.sheets.tcs, vals.slice(1));
  ok ? mostrarExito("TC agregada ✓") : mostrarError("Error al agregar");
}

// ── DÉBITOS ────────────────────────────────────────────────────────────────
function renderAjusteDebitos() {
  const el = document.getElementById("lista-ajuste-debitos");
  if (!el) return;
  el.innerHTML = debitosData.map((d, idx) => `
    <div class="acordeon-item" id="ac-deb-${idx}">
      <div class="acordeon-header" onclick="toggleAcordeon('deb-${idx}')">
        <div>
          <div class="acordeon-title">${d["Nombre"]||"Cuenta"}</div>
          <div class="acordeon-meta">${d["Banco"]||""} · ${formatCLP(d["Saldo Actual"]||0)} · ${d["Activa"]==="SI"?"Activa":"Inactiva"}</div>
        </div>
        <span class="acordeon-chevron">⌄</span>
      </div>
      <div class="acordeon-body">
        <div class="campo-grid">
          <div class="campo-field"><label>Banco</label>
            <input type="text" value="${d["Banco"]||""}" onchange="debitosData[${idx}]['Banco']=this.value"></div>
          <div class="campo-field"><label>Nombre</label>
            <input type="text" value="${d["Nombre"]||""}" onchange="debitosData[${idx}]['Nombre']=this.value"></div>
          <div class="campo-field full"><label>Saldo actual</label>
            <input type="number" value="${d["Saldo Actual"]||0}" onchange="debitosData[${idx}]['Saldo Actual']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Activa</label>
            <select onchange="debitosData[${idx}]['Activa']=this.value">
              <option ${d["Activa"]==="SI"?"selected":""}>SI</option>
              <option ${d["Activa"]==="NO"?"selected":""}>NO</option>
            </select></div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="guardarDebito(${idx})">💾 Guardar</button>
      </div>
    </div>`).join("");
}

async function guardarDebito(idx) {
  const d = debitosData[idx];
  const fila = idx + 3;
  let ok = true;
  for (const [col, val] of Object.entries({ A:d["Banco"], B:d["Nombre"], C:d["Saldo Actual"], F:d["Activa"]||"SI" })) {
    if (!await actualizarCelda(CONFIG.sheets.debitos, `${col}${fila}`, val)) ok = false;
  }
  ok ? mostrarExito("Cuenta guardada ✓") : mostrarError("Error al guardar");
}

// ── FONDOS ─────────────────────────────────────────────────────────────────
function renderAjusteFondos() {
  const el = document.getElementById("lista-ajuste-fondos");
  if (!el) return;

  const fijos = fondosData.filter(f => f["_tipo"] === "fijo" || !f["_tipo"]);
  const pcts  = fondosData.filter(f => f["_tipo"] === "pct");
  const totalPct = fondosData.reduce((s,f) => s + (parseFloat(f["Presupuesto Mensual"])||0), 0);

  el.innerHTML = fondosData.map((f, idx) => `
    <div class="fondo-item">
      <div class="fondo-item-header">
        <div>
          <span class="fondo-item-nombre">${f["Fondo"]}</span>
        </div>
        <div class="fondo-item-actions">
          <button class="btn btn-ghost btn-xs" onclick="toggleEditFondo(${idx})">✏️</button>
          <button class="btn btn-danger btn-xs" onclick="eliminarFondo(${idx})">✕</button>
        </div>
      </div>
      <div id="edit-fondo-${idx}" style="display:none">
        <div class="campo-grid">
          <div class="campo-field"><label>Nombre</label>
            <input type="text" value="${f["Fondo"]||""}" onchange="fondosData[${idx}]['Fondo']=this.value"></div>
          <div class="campo-field"><label>Presupuesto mensual</label>
            <input type="number" value="${f["Presupuesto Mensual"]||0}" onchange="fondosData[${idx}]['Presupuesto Mensual']=parseInt(this.value)"></div>
          <div class="campo-field full"><label>Saldo actual</label>
            <input type="number" value="${f["Saldo Actual"]||0}" onchange="fondosData[${idx}]['Saldo Actual']=parseInt(this.value)"></div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="guardarFondo(${idx})">💾 Guardar</button>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">
        Presupuesto: ${formatCLP(f["Presupuesto Mensual"]||0)} · Disponible: ${formatCLP(f["Saldo Actual"]||0)}
      </div>
    </div>`).join("");
}

function toggleEditFondo(idx) {
  const el = document.getElementById(`edit-fondo-${idx}`);
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}

async function guardarFondo(idx) {
  const f = fondosData[idx];
  const fila = idx + 3;
  let ok = true;
  ok = await actualizarCelda(CONFIG.sheets.fondos, `A${fila}`, f["Fondo"]) && ok;
  ok = await actualizarCelda(CONFIG.sheets.fondos, `C${fila}`, f["Presupuesto Mensual"]) && ok;
  ok = await actualizarCelda(CONFIG.sheets.fondos, `D${fila}`, f["Saldo Actual"]) && ok;
  ok ? mostrarExito("Fondo guardado ✓") : mostrarError("Error al guardar");
  toggleEditFondo(idx);
}

function eliminarFondo(idx) {
  if (!confirm(`¿Eliminar fondo "${fondosData[idx]["Fondo"]}"? Solo se desactivará en la app.`)) return;
  fondosData.splice(idx, 1);
  renderAjusteFondos();
  mostrarExito("Fondo eliminado de la vista");
}

// ── REGLAS ─────────────────────────────────────────────────────────────────
function renderAjusteReglas() {
  const el = document.getElementById("lista-ajuste-reglas");
  if (!el || !reglasData) return;

  el.innerHTML = TIPOS_INGRESO.map(tipo => {
    const reglas = reglasData[tipo] || [];
    const totalPct = reglas.filter(r=>r.tipo==="%").reduce((s,r)=>s+r.valor,0);
    const colorTotal = totalPct > 100 ? "over" : totalPct === 100 ? "" : "";
    return `
    <div class="regla-bloque">
      <div class="regla-titulo">
        <span>${tipo}</span>
        <span style="font-size:12px;color:var(--text3);font-weight:400">
          ${reglas.filter(r=>r.tipo==="%").length} fondos con %
        </span>
      </div>
      ${reglas.map((r, ridx) => `
        <div class="regla-row">
          <span class="regla-fondo">${r.fondo}</span>
          <select onchange="reglasData['${tipo}'][${ridx}].tipo=this.value;renderAjusteReglas()">
            <option ${r.tipo==="%"?"selected":""}>%</option>
            <option value="$" ${r.tipo==="$"?"selected":""}>$</option>
          </select>
          <input type="number" value="${r.valor}" 
            onchange="reglasData['${tipo}'][${ridx}].valor=parseFloat(this.value)||0;actualizarTotalRegla('${tipo}')">
        </div>`).join("")}
      <div class="regla-total" id="regla-total-${tipo.replace(/ /g,'_')}">
        % asignado: <span class="${colorTotal}">${totalPct}%</span>
        ${totalPct < 100 ? `· <span style="color:var(--yellow)">${100-totalPct}% sin asignar</span>` : ""}
        ${totalPct > 100 ? `· <span style="color:var(--red)">⚠ Excede 100%</span>` : ""}
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="guardarReglas('${tipo}')">
        💾 Guardar reglas ${tipo}
      </button>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">`;
  }).join("");
}

function actualizarTotalRegla(tipo) {
  const reglas = reglasData[tipo] || [];
  const total = reglas.filter(r=>r.tipo==="%").reduce((s,r)=>s+r.valor,0);
  const el = document.getElementById(`regla-total-${tipo.replace(/ /g,'_')}`);
  if (el) {
    const cls = total > 100 ? "over" : "";
    el.innerHTML = `% asignado: <span class="${cls}">${total}%</span>
      ${total < 100 ? `· <span style="color:var(--yellow)">${100-total}% sin asignar</span>` : ""}
      ${total > 100 ? `· <span style="color:var(--red)">⚠ Excede 100%</span>` : ""}`;
  }
}

async function guardarReglas(tipo) {
  const reglas = reglasData[tipo] || [];
  const bloques = {
    "Sueldo":               { colTipo:"C", colValor:"D" },
    "Pololito / Freelance": { colTipo:"H", colValor:"I" },
    "Bono":                 { colTipo:"M", colValor:"N" }
  };
  const b = bloques[tipo];
  if (!b) return;
  let ok = true;
  for (let i = 0; i < reglas.length; i++) {
    const fila = i + 4;
    ok = await actualizarCelda(CONFIG.sheets.reglas, `${b.colTipo}${fila}`, reglas[i].tipo) && ok;
    ok = await actualizarCelda(CONFIG.sheets.reglas, `${b.colValor}${fila}`, reglas[i].valor) && ok;
  }
  ok ? mostrarExito(`Reglas "${tipo}" guardadas ✓`) : mostrarError("Error al guardar reglas");
}

// ── PAGOS AUTOMÁTICOS ──────────────────────────────────────────────────────
function renderPagosAuto() {
  const el = document.getElementById("lista-pagos-auto");
  if (!el) return;
  if (pagosAuto.length === 0) {
    el.innerHTML = `<p style="color:var(--text3);font-size:14px;text-align:center;padding:20px 0">Sin pagos automáticos configurados</p>`;
    return;
  }
  el.innerHTML = pagosAuto.map((p, idx) => `
    <div class="pago-auto-item">
      <div>
        <div class="pago-auto-nombre">${p.nombre}</div>
        <div class="pago-auto-detail">${formatCLP(p.monto)} · Día ${p.dia} · desde ${p.cuenta}</div>
      </div>
      <button class="btn btn-danger btn-xs" onclick="eliminarPagoAuto(${idx})">✕</button>
    </div>`).join("");
}

function mostrarFormPagoAuto() {
  document.getElementById("form-pago-auto").style.display = "block";
}

function guardarPagoAuto() {
  const nombre  = document.getElementById("pa-nombre").value;
  const monto   = parseInt(document.getElementById("pa-monto").value) || 0;
  const dia     = parseInt(document.getElementById("pa-dia").value)   || 1;
  const cuenta  = document.getElementById("pa-cuenta").value;
  const fondo   = document.getElementById("pa-fondo").value;
  if (!nombre || !monto) { mostrarError("Completa nombre y monto"); return; }
  pagosAuto.push({ nombre, monto, dia, cuenta, fondo });
  localStorage.setItem("pagosAuto", JSON.stringify(pagosAuto));
  document.getElementById("form-pago-auto").style.display = "none";
  mostrarExito("Pago automático guardado ✓");
  renderPagosAuto();
}

function eliminarPagoAuto(idx) {
  pagosAuto.splice(idx, 1);
  localStorage.setItem("pagosAuto", JSON.stringify(pagosAuto));
  renderPagosAuto();
  mostrarExito("Eliminado ✓");
}

// ── INFO ───────────────────────────────────────────────────────────────────
function renderInfo() {
  const el = document.getElementById("ajuste-info-content");
  if (!el) return;
  el.innerHTML = `
    <div class="info-row"><span class="key">App</span><span class="val">Presupuesto Familiar</span></div>
    <div class="info-row"><span class="key">Versión</span><span class="val">2.0.0</span></div>
    <div class="info-row"><span class="key">Usuario</span><span class="val">${obtenerUsuario()||"—"}</span></div>
    <div class="info-row"><span class="key">Excel</span><span class="val">${CONFIG.excelFileName}</span></div>
    <div class="info-row"><span class="key">TCs activas</span><span class="val">${tcsData.filter(t=>t["Activa"]==="SI").length}</span></div>
    <div class="info-row"><span class="key">Deuda total</span><span class="val" style="color:var(--red)">${formatCLP(totalDeuda())}</span></div>
    <div class="info-row"><span class="key">Mantención mensual</span><span class="val" style="color:var(--yellow)">${formatCLP(totalMantencion())}</span></div>
    <div class="info-row"><span class="key">Fondos configurados</span><span class="val">${fondosData.length}</span></div>
    <div class="info-row"><span class="key">GitHub</span><span class="val"><a href="https://github.com/josuefuenzalida/Presupuesto-Familiar" target="_blank" style="color:var(--accent)">Ver repositorio</a></span></div>
  `;
}
