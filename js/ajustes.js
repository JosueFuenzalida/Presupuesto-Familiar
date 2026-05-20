// ── AJUSTES ────────────────────────────────────────────────────────────────

function renderAjustes() {
  renderAjusteTCs();
  renderAjusteDebitos();
  renderAjusteFondos();
  renderAjusteReglas();
}

// ── TCs ────────────────────────────────────────────────────────────────────
function renderAjusteTCs() {
  const el = document.getElementById("ajuste-tcs");
  if (!el) return;
  el.innerHTML = tcsData.map((tc, idx) => `
    <div class="ajuste-row" id="tc-row-${idx}">
      <div class="ajuste-nombre">${tc["Nombre"] || "Nueva TC"}</div>
      <div class="ajuste-campos">
        <div class="ajuste-field"><label>Nombre</label>
          <input type="text" value="${tc["Nombre"]||""}" onchange="tcsData[${idx}]['Nombre']=this.value"></div>
        <div class="ajuste-field"><label>Banco</label>
          <input type="text" value="${tc["Banco"]||""}" onchange="tcsData[${idx}]['Banco']=this.value"></div>
        <div class="ajuste-field"><label>Cupo</label>
          <input type="number" value="${tc["Cupo"]||0}" onchange="tcsData[${idx}]['Cupo']=parseInt(this.value)"></div>
        <div class="ajuste-field"><label>Usado</label>
          <input type="number" value="${tc["Usado"]||0}" onchange="tcsData[${idx}]['Usado']=parseInt(this.value)"></div>
        <div class="ajuste-field"><label>Tasa %</label>
          <input type="number" step="0.01" value="${((tc["Tasa %"]||0)*100).toFixed(2)}" onchange="tcsData[${idx}]['Tasa %']=parseFloat(this.value)/100"></div>
        <div class="ajuste-field"><label>Mantención</label>
          <input type="number" value="${tc["Mantención"]||0}" onchange="tcsData[${idx}]['Mantención']=parseInt(this.value)"></div>
        <div class="ajuste-field"><label>Día corte</label>
          <input type="number" min="1" max="31" value="${tc["F. Corte"]||0}" onchange="tcsData[${idx}]['F. Corte']=parseInt(this.value)"></div>
        <div class="ajuste-field"><label>Día vencimiento</label>
          <input type="number" min="1" max="31" value="${tc["F. Vencimiento"]||0}" onchange="tcsData[${idx}]['F. Vencimiento']=parseInt(this.value)"></div>
        <div class="ajuste-field"><label>Activa</label>
          <select onchange="tcsData[${idx}]['Activa']=this.value">
            <option ${tc["Activa"]==="SI"?"selected":""}>SI</option>
            <option ${tc["Activa"]==="NO"?"selected":""}>NO</option>
          </select></div>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="guardarTC(${idx})">Guardar cambios</button>
    </div>`).join('<hr style="margin:12px 0;border-color:var(--border)">');
}

async function guardarTC(idx) {
  const tc = tcsData[idx];
  const fila = idx + 3;
  const valores = [
    tc["Banco"], tc["Nombre"], tc["Cupo"], tc["Usado"], "",
    tc["Tasa %"], tc["Mantención"], tc["F. Corte"], tc["F. Vencimiento"],
    "", tc["Prioridad"]||0, tc["Activa"]||"SI", tc["Notas"]||""
  ];
  // Actualizar columnas editables (A-D, F-I, K-L)
  const cols = ["A","B","C","D","F","G","H","I","K","L"];
  const vals = [tc["Banco"],tc["Nombre"],tc["Cupo"],tc["Usado"],tc["Tasa %"],tc["Mantención"],tc["F. Corte"],tc["F. Vencimiento"],tc["Prioridad"]||0,tc["Activa"]||"SI"];
  let ok = true;
  for (let i = 0; i < cols.length; i++) {
    const r = await actualizarCelda(CONFIG.sheets.tcs, `${cols[i]}${fila}`, vals[i]);
    if (!r) ok = false;
  }
  ok ? mostrarExito("TC actualizada ✓") : mostrarError("Error al guardar TC");
}

// ── DÉBITOS ────────────────────────────────────────────────────────────────
function renderAjusteDebitos() {
  const el = document.getElementById("ajuste-debitos");
  if (!el) return;
  el.innerHTML = debitosData.map((d, idx) => `
    <div class="ajuste-row">
      <div class="ajuste-nombre">${d["Nombre"]||"Cuenta"}</div>
      <div class="ajuste-campos">
        <div class="ajuste-field"><label>Banco</label>
          <input type="text" value="${d["Banco"]||""}" onchange="debitosData[${idx}]['Banco']=this.value"></div>
        <div class="ajuste-field"><label>Nombre</label>
          <input type="text" value="${d["Nombre"]||""}" onchange="debitosData[${idx}]['Nombre']=this.value"></div>
        <div class="ajuste-field"><label>Saldo actual</label>
          <input type="number" value="${d["Saldo Actual"]||0}" onchange="debitosData[${idx}]['Saldo Actual']=parseInt(this.value)"></div>
        <div class="ajuste-field"><label>Activa</label>
          <select onchange="debitosData[${idx}]['Activa']=this.value">
            <option ${d["Activa"]==="SI"?"selected":""}>SI</option>
            <option ${d["Activa"]==="NO"?"selected":""}>NO</option>
          </select></div>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="guardarDebito(${idx})">Guardar</button>
    </div>`).join('<hr style="margin:12px 0;border-color:var(--border)">');
}

async function guardarDebito(idx) {
  const d = debitosData[idx];
  const fila = idx + 3;
  const cols = ["A","B","C","F"];
  const vals = [d["Banco"],d["Nombre"],d["Saldo Actual"],d["Activa"]||"SI"];
  let ok = true;
  for (let i = 0; i < cols.length; i++) {
    const r = await actualizarCelda(CONFIG.sheets.debitos, `${cols[i]}${fila}`, vals[i]);
    if (!r) ok = false;
  }
  ok ? mostrarExito("Cuenta actualizada ✓") : mostrarError("Error al guardar cuenta");
}

// ── FONDOS ─────────────────────────────────────────────────────────────────
function renderAjusteFondos() {
  const el = document.getElementById("ajuste-fondos");
  if (!el) return;
  el.innerHTML = fondosData.map((f, idx) => `
    <div class="ajuste-row">
      <div class="ajuste-nombre">${f["Fondo"]}</div>
      <div class="ajuste-campos">
        <div class="ajuste-field"><label>Nombre del fondo</label>
          <input type="text" value="${f["Fondo"]||""}" onchange="fondosData[${idx}]['Fondo']=this.value"></div>
        <div class="ajuste-field"><label>Presupuesto mensual</label>
          <input type="number" value="${f["Presupuesto Mensual"]||0}" onchange="fondosData[${idx}]['Presupuesto Mensual']=parseInt(this.value)"></div>
        <div class="ajuste-field"><label>Saldo actual</label>
          <input type="number" value="${f["Saldo Actual"]||0}" onchange="fondosData[${idx}]['Saldo Actual']=parseInt(this.value)"></div>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="guardarFondo(${idx})">Guardar</button>
    </div>`).join('<hr style="margin:12px 0;border-color:var(--border)">');
}

async function guardarFondo(idx) {
  const f = fondosData[idx];
  const fila = idx + 3;
  let ok = true;
  ok = await actualizarCelda(CONFIG.sheets.fondos, `A${fila}`, f["Fondo"]) && ok;
  ok = await actualizarCelda(CONFIG.sheets.fondos, `C${fila}`, f["Presupuesto Mensual"]) && ok;
  ok = await actualizarCelda(CONFIG.sheets.fondos, `D${fila}`, f["Saldo Actual"]) && ok;
  ok ? mostrarExito("Fondo actualizado ✓") : mostrarError("Error al guardar fondo");
}

// ── REGLAS ─────────────────────────────────────────────────────────────────
function renderAjusteReglas() {
  const el = document.getElementById("ajuste-reglas");
  if (!el || !reglasData) return;

  el.innerHTML = TIPOS_INGRESO.map(tipo => {
    const reglas = reglasData[tipo] || [];
    const total = reglas.reduce((s,r) => s + (r.tipo==="%"?r.valor:0), 0);
    return `
    <div style="margin-bottom:20px">
      <div style="font-weight:700;font-size:15px;color:var(--primary);margin-bottom:10px">
        ${tipo} <span style="font-size:12px;color:var(--text-muted);font-weight:400">(Total asignado: ${total}%)</span>
      </div>
      ${reglas.map((r, ridx) => `
        <div style="display:grid;grid-template-columns:1fr 80px 100px auto;gap:8px;align-items:center;margin-bottom:8px">
          <span style="font-size:14px">${r.fondo}</span>
          <select onchange="reglasData['${tipo}'][${ridx}].tipo=this.value;renderAjusteReglas()">
            <option ${r.tipo==="%"?"selected":""}>%</option>
            <option value="$" ${r.tipo==="$"?"selected":""}>$</option>
          </select>
          <input type="number" value="${r.valor}" style="width:100%" 
            onchange="reglasData['${tipo}'][${ridx}].valor=parseFloat(this.value)||0">
          <span style="font-size:12px;color:var(--text-muted)">${r.tipo==="%"?r.valor+"%":formatCLP(r.valor)}</span>
        </div>`).join("")}
      <button class="btn btn-primary btn-sm" onclick="guardarReglas('${tipo}')">Guardar reglas ${tipo}</button>
    </div>`;
  }).join('<hr style="margin:16px 0;border-color:var(--border)">');
}

async function guardarReglas(tipo) {
  const reglas = reglasData[tipo] || [];
  const bloques = {
    "Sueldo":              { colTipo: "C", colValor: "D" },
    "Pololito / Freelance":{ colTipo: "H", colValor: "I" },
    "Bono":                { colTipo: "M", colValor: "N" }
  };
  const b = bloques[tipo];
  if (!b) return;
  let ok = true;
  for (let i = 0; i < reglas.length; i++) {
    const fila = i + 4;
    ok = await actualizarCelda(CONFIG.sheets.reglas, `${b.colTipo}${fila}`, reglas[i].tipo) && ok;
    ok = await actualizarCelda(CONFIG.sheets.reglas, `${b.colValor}${fila}`, reglas[i].valor) && ok;
  }
  ok ? mostrarExito(`Reglas ${tipo} guardadas ✓`) : mostrarError("Error al guardar reglas");
}
