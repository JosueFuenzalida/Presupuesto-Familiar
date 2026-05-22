// ══ AJUSTES ════════════════════════════════════════════════════════════════
let pagosAuto = JSON.parse(localStorage.getItem("pagosAuto") || "[]");

function renderAjustes() {
  mostrarPanelAjuste("home");
}

function mostrarPanelAjuste(panel) {
  document.querySelectorAll(".ajuste-panel").forEach(p => p.classList.remove("active"));
  const el = document.getElementById("ajuste-panel-" + panel);
  if (el) el.classList.add("active");
  if (panel === "tcs")      renderAjusteTCs();
  if (panel === "debitos")  renderAjusteDebitos();
  if (panel === "fondos")   renderAjusteFondos();
  if (panel === "reglas")   renderAjusteReglas();
  if (panel === "requisas") renderAjusteRequisas();
  if (panel === "pagos")    renderPagosAuto();
  if (panel === "info")     renderInfo();
}

// ── TCs ────────────────────────────────────────────────────────────────────
function renderAjusteTCs() {
  const el = document.getElementById("lista-ajuste-tcs");
  if (!el) return;
  el.innerHTML = tcsData.map((tc, idx) => {
    const cupo  = parseInt(tc["Cupo"])  || 0;
    const usado = parseInt(tc["Usado"]) || 0;
    const pct   = cupo > 0 ? Math.round((usado/cupo)*100) : 0;
    const est   = estadoTC(pct);
    return `
    <div class="acordeon-item" id="ac-tc-${idx}">
      <div class="acordeon-header" onclick="toggleAcordeon('tc-${idx}')">
        <div>
          <div class="acordeon-title">${tc["Nombre"] || "Nueva TC"}</div>
          <div class="acordeon-meta">${tc["Banco"]||""} · ${est.icon} ${pct}% · ${formatCLP(usado)} de ${formatCLP(cupo)}</div>
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
            <input type="number" value="${cupo}" onchange="tcsData[${idx}]['Cupo']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Saldo usado</label>
            <input type="number" value="${usado}" onchange="tcsData[${idx}]['Usado']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Tasa mensual %</label>
            <input type="number" step="0.01" value="${((parseFloat(tc["Tasa %"])||0)*100).toFixed(2)}"
              onchange="tcsData[${idx}]['Tasa %']=parseFloat(this.value)/100"></div>
          <div class="campo-field"><label>Mantención $</label>
            <input type="number" value="${parseInt(tc["Mantención"])||0}" onchange="tcsData[${idx}]['Mantención']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Día de corte</label>
            <input type="number" min="1" max="31" value="${tc["F. Corte"]||0}" onchange="tcsData[${idx}]['F. Corte']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Día de vencimiento</label>
            <input type="number" min="1" max="31" value="${tc["F. Vencimiento"]||0}" onchange="tcsData[${idx}]['F. Vencimiento']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Prioridad pago</label>
            <input type="number" min="0" max="10" value="${tc["Prioridad"]||0}" onchange="tcsData[${idx}]['Prioridad']=parseInt(this.value)"></div>
          <div class="campo-field"><label>Activa</label>
            <select onchange="tcsData[${idx}]['Activa']=this.value">
              <option ${tc["Activa"]==="SI"?"selected":""}>SI</option>
              <option ${tc["Activa"]==="NO"?"selected":""}>NO</option>
            </select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-primary btn-sm" onclick="guardarTC(${idx})">💾 Guardar</button>
          <button class="btn btn-danger btn-sm" onclick="desactivarTC(${idx})">🗑 Desactivar</button>
        </div>
      </div>
    </div>`}).join("");
}

function toggleAcordeon(id) {
  const el = document.getElementById("ac-" + id);
  if (el) el.classList.toggle("open");
}

function guardarTC(idx) {
  const tc   = tcsData[idx];
  const fila = idx + 3;
  const map  = { A:tc["Banco"], B:tc["Nombre"], C:tc["Cupo"], D:tc["Usado"],
    F:tc["Tasa %"], G:tc["Mantención"], H:tc["F. Corte"], I:tc["F. Vencimiento"],
    K:tc["Prioridad"]||0, L:tc["Activa"]||"SI" };
  Object.entries(map).forEach(([col,val]) => syncCelda(CONFIG.sheets.tcs, `${col}${fila}`, val));
  mostrarExito("TC guardada — sincronizando...");
  renderAjusteTCs();
}

function desactivarTC(idx) {
  if (!confirm(`¿Desactivar "${tcsData[idx]["Nombre"]}"?`)) return;
  tcsData[idx]["Activa"] = "NO";
  syncCelda(CONFIG.sheets.tcs, `L${idx+3}`, "NO");
  mostrarExito("TC desactivada ✓");
  renderAjusteTCs();
}

function agregarTCForm() {
  tcsData.push({ Banco:"", Nombre:"Nueva TC", Cupo:0, Usado:0, "Tasa %":0,
    Mantención:0, "F. Corte":0, "F. Vencimiento":0, Prioridad:0, Activa:"SI", Notas:"" });
  renderAjusteTCs();
  setTimeout(() => {
    const last = document.getElementById(`ac-tc-${tcsData.length-1}`);
    if (last) { last.classList.add("open"); last.scrollIntoView({behavior:"smooth"}); }
  }, 100);
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

function guardarDebito(idx) {
  const d    = debitosData[idx];
  const fila = idx + 3;
  Object.entries({ A:d["Banco"], B:d["Nombre"], C:d["Saldo Actual"], F:d["Activa"]||"SI" })
    .forEach(([col,val]) => syncCelda(CONFIG.sheets.debitos, `${col}${fila}`, val));
  mostrarExito("Cuenta guardada — sincronizando...");
}

// ── FONDOS ─────────────────────────────────────────────────────────────────
function renderAjusteFondos() {
  const el = document.getElementById("lista-ajuste-fondos");
  if (!el) return;
  el.innerHTML = fondosData.map((f, idx) => `
    <div class="fondo-item">
      <div class="fondo-item-header">
        <span class="fondo-item-nombre">${f["Fondo"]}</span>
        <div class="fondo-item-actions">
          <button class="btn btn-ghost btn-xs" onclick="toggleEditFondo(${idx})">✏️</button>
          <button class="btn btn-danger btn-xs" onclick="eliminarFondo(${idx})">✕</button>
        </div>
      </div>
      <div id="edit-fondo-${idx}" style="display:none">
        <div class="campo-grid" style="margin-top:10px">
          <div class="campo-field"><label>Nombre</label>
            <input type="text" value="${f["Fondo"]||""}" onchange="fondosData[${idx}]['Fondo']=this.value"></div>
          <div class="campo-field"><label>Presupuesto mensual</label>
            <input type="number" value="${f["Presupuesto Mensual"]||0}" onchange="fondosData[${idx}]['Presupuesto Mensual']=parseInt(this.value)"></div>
          <div class="campo-field full"><label>Saldo actual</label>
            <input type="number" value="${f["Saldo Actual"]||0}" onchange="fondosData[${idx}]['Saldo Actual']=parseInt(this.value)"></div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="guardarFondo(${idx})">💾 Guardar</button>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:6px">
        Presupuesto: ${formatCLP(f["Presupuesto Mensual"]||0)} · Disponible: ${formatCLP(f["Saldo Actual"]||0)}
      </div>
    </div>`).join("");
}

function toggleEditFondo(idx) {
  const el = document.getElementById(`edit-fondo-${idx}`);
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}

function guardarFondo(idx) {
  const f    = fondosData[idx];
  const fila = idx + 3;
  syncCelda(CONFIG.sheets.fondos, `A${fila}`, f["Fondo"]);
  syncCelda(CONFIG.sheets.fondos, `C${fila}`, f["Presupuesto Mensual"]);
  syncCelda(CONFIG.sheets.fondos, `D${fila}`, f["Saldo Actual"]);
  mostrarExito("Fondo guardado — sincronizando...");
  toggleEditFondo(idx);
}

function eliminarFondo(idx) {
  if (!confirm(`¿Eliminar fondo "${fondosData[idx]["Fondo"]}"?`)) return;
  fondosData.splice(idx, 1);
  renderAjusteFondos();
}

// ── REGLAS ─────────────────────────────────────────────────────────────────
function renderAjusteReglas() {
  const el = document.getElementById("lista-ajuste-reglas");
  if (!el || !reglasData) return;
  el.innerHTML = TIPOS_INGRESO.map(tipo => {
    const reglas   = reglasData[tipo] || [];
    const totalPct = reglas.filter(r=>r.tipo==="%").reduce((s,r)=>s+r.valor,0);
    const cls      = totalPct > 100 ? "over" : "";
    return `
    <div class="regla-bloque">
      <div class="regla-titulo">
        <span>${tipo}</span>
        <span style="font-size:12px;color:var(--text3);font-weight:400">${reglas.length} fondos</span>
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
      <div class="regla-total" id="regla-total-${tipo.replace(/ \//g,'_').replace(/ /g,'_')}">
        Asignado: <span class="${cls}">${totalPct}%</span>
        ${totalPct<100?`· <span style="color:var(--yellow)">${100-totalPct}% libre</span>`:""}
        ${totalPct>100?`· <span style="color:var(--red)">⚠ Excede 100%</span>`:""}
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="guardarReglas('${tipo}')">
        💾 Guardar ${tipo}
      </button>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">`;
  }).join("");
}

function actualizarTotalRegla(tipo) {
  const reglas = reglasData[tipo] || [];
  const total  = reglas.filter(r=>r.tipo==="%").reduce((s,r)=>s+r.valor,0);
  const id     = `regla-total-${tipo.replace(/ \//g,'_').replace(/ /g,'_')}`;
  const el     = document.getElementById(id);
  if (!el) return;
  const cls = total > 100 ? "over" : "";
  el.innerHTML = `Asignado: <span class="${cls}">${total}%</span>
    ${total<100?`· <span style="color:var(--yellow)">${100-total}% libre</span>`:""}
    ${total>100?`· <span style="color:var(--red)">⚠ Excede 100%</span>`:""}`;
}

function guardarReglas(tipo) {
  const reglas  = reglasData[tipo] || [];
  const bloques = {
    "Sueldo":               { C:"C", D:"D" },
    "Pololito / Freelance": { C:"H", D:"I" },
    "Bono":                 { C:"M", D:"N" }
  };
  const b = bloques[tipo];
  if (!b) return;
  reglas.forEach((r, i) => {
    const fila = i + 4;
    syncCelda(CONFIG.sheets.reglas, `${b.C}${fila}`, r.tipo);
    syncCelda(CONFIG.sheets.reglas, `${b.D}${fila}`, r.valor);
  });
  mostrarExito(`Reglas "${tipo}" guardadas — sincronizando...`);
}

// ── REQUISAS ───────────────────────────────────────────────────────────────
function renderAjusteRequisas() {
  const el = document.getElementById("lista-ajuste-requisas");
  if (!el) return;

  const modoOpciones = [
    { id:"proporcional", label:"Proporcional", desc:"Se descuenta de cada fondo según su % de saldo disponible" },
    { id:"orden",        label:"Por orden",    desc:"Se agota primero el fondo de menor prioridad" }
  ];

  el.innerHTML = `
    <div style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:12px">Modo de requisa</div>
      ${modoOpciones.map(m=>`
        <div class="sim-btn ${reglasRequisa.modo===m.id?"active":""}" 
          onclick="reglasRequisa.modo='${m.id}';guardarReglasRequisa();renderAjusteRequisas()"
          style="margin-bottom:8px;text-align:left;display:block;padding:12px 14px">
          <strong>${m.label}</strong>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${m.desc}</div>
        </div>`).join("")}
    </div>

    <div style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:12px">Fondos intocables 🔒</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:10px">Nunca se requisarán, sin importar el sobregasto</div>
      ${fondosData.map(f=>{
        const esIntocable = reglasRequisa.intocables.includes(f["Fondo"]);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px">${f["Fondo"]}</span>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" ${esIntocable?"checked":""} 
              onchange="toggleIntocable('${f["Fondo"]}',this.checked)"
              style="width:16px;height:16px;accent-color:var(--accent)">
            <span style="font-size:12px;color:var(--text3)">${esIntocable?"Intocable":"Requisable"}</span>
          </label>
        </div>`;
      }).join("")}
    </div>

    ${reglasRequisa.modo==="orden" ? `
    <div>
      <div class="card-title" style="margin-bottom:12px">Orden de requisa</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:10px">El primero se agota antes</div>
      ${fondosData.filter(f=>!reglasRequisa.intocables.includes(f["Fondo"])).map((f,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text3);font-size:13px;min-width:20px">${i+1}</span>
          <span style="flex:1;font-size:14px">${f["Fondo"]}</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-xs" onclick="moverOrdenRequisa(${i},-1)">↑</button>
            <button class="btn btn-ghost btn-xs" onclick="moverOrdenRequisa(${i},1)">↓</button>
          </div>
        </div>`).join("")}
    </div>` : ""}`;
}

function toggleIntocable(nombre, esIntocable) {
  if (esIntocable) {
    if (!reglasRequisa.intocables.includes(nombre)) reglasRequisa.intocables.push(nombre);
  } else {
    reglasRequisa.intocables = reglasRequisa.intocables.filter(n=>n!==nombre);
  }
  guardarReglasRequisa();
  renderAjusteRequisas();
}

function moverOrdenRequisa(idx, dir) {
  const requisables = fondosData.filter(f=>!reglasRequisa.intocables.includes(f["Fondo"]));
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= requisables.length) return;
  const temp = reglasRequisa.orden[idx];
  reglasRequisa.orden[idx]    = reglasRequisa.orden[newIdx];
  reglasRequisa.orden[newIdx] = temp;
  guardarReglasRequisa();
  renderAjusteRequisas();
}

// ── PAGOS AUTO ─────────────────────────────────────────────────────────────
function renderPagosAuto() {
  const el = document.getElementById("lista-pagos-auto");
  if (!el) return;
  if (!pagosAuto.length) {
    el.innerHTML = `<p style="color:var(--text3);font-size:14px;text-align:center;padding:20px 0">Sin pagos automáticos configurados</p>`;
    return;
  }
  el.innerHTML = pagosAuto.map((p,idx)=>`
    <div class="pago-auto-item">
      <div>
        <div class="pago-auto-nombre">${p.nombre}</div>
        <div class="pago-auto-detail">${formatCLP(p.monto)} · Día ${p.dia} · ${p.cuenta} → ${p.fondo}</div>
      </div>
      <button class="btn btn-danger btn-xs" onclick="eliminarPagoAuto(${idx})">✕</button>
    </div>`).join("");
}

function mostrarFormPagoAuto() {
  const f = document.getElementById("form-pago-auto");
  if (!f) return;
  // Poblar selects
  document.getElementById("pa-cuenta").innerHTML =
    [...tcsData.filter(t=>t["Activa"]==="SI").map(t=>`<option>${t["Nombre"]}</option>`),
     ...debitosData.filter(d=>d["Activa"]==="SI").map(d=>`<option>${d["Nombre"]}</option>`)].join("");
  document.getElementById("pa-fondo").innerHTML =
    fondosData.map(f=>`<option>${f["Fondo"]}</option>`).join("");
  f.style.display = "block";
}

function guardarPagoAuto() {
  const nombre = document.getElementById("pa-nombre").value;
  const monto  = parseInt(document.getElementById("pa-monto").value) || 0;
  const dia    = parseInt(document.getElementById("pa-dia").value) || 1;
  const cuenta = document.getElementById("pa-cuenta").value;
  const fondo  = document.getElementById("pa-fondo").value;
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
}

// ── INFO ───────────────────────────────────────────────────────────────────
function renderInfo() {
  const el = document.getElementById("ajuste-info-content");
  if (!el) return;
  el.innerHTML = `
    <div class="info-row"><span class="key">App</span><span class="val">Presupuesto Familiar</span></div>
    <div class="info-row"><span class="key">Versión</span><span class="val">2.1.0</span></div>
    <div class="info-row"><span class="key">Usuario</span><span class="val">${obtenerUsuario()||"—"}</span></div>
    <div class="info-row"><span class="key">Excel</span><span class="val">${CONFIG.excelFileName}</span></div>
    <div class="info-row"><span class="key">TCs activas</span><span class="val">${tcsData.filter(t=>t["Activa"]==="SI").length}</span></div>
    <div class="info-row"><span class="key">Deuda total</span><span class="val" style="color:var(--red)">${formatCLP(totalDeuda())}</span></div>
    <div class="info-row"><span class="key">Mantención mensual</span><span class="val" style="color:var(--yellow)">${formatCLP(totalMantencion())}</span></div>
    <div class="info-row"><span class="key">Fondos</span><span class="val">${fondosData.length}</span></div>
    <div class="info-row"><span class="key">GitHub</span><span class="val">
      <a href="https://github.com/josuefuenzalida/Presupuesto-Familiar" target="_blank" style="color:var(--accent)">Ver repositorio ↗</a>
    </span></div>`;
}
