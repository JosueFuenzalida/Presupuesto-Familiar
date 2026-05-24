// ══ AJUSTES ════════════════════════════════════════════════════════════════

function renderAjustes() { mostrarPanelAjuste("home"); }

function mostrarPanelAjuste(panel) {
  document.querySelectorAll(".ajuste-panel").forEach(p => p.classList.remove("active"));
  const el = document.getElementById("ajuste-panel-" + panel);
  if (el) el.classList.add("active");
  if (panel === "tcs")      renderAjusteTCs();
  if (panel === "debitos")  renderAjusteDebitos();
  if (panel === "fondos")   renderAjusteFondos();
  if (panel === "ingresos") renderAjusteIngresos();
  if (panel === "requisas") renderAjusteRequisas();
  if (panel === "pagos")    renderAjustePagos();
  if (panel === "info")     renderAjusteInfo();
}

// ── TCs ────────────────────────────────────────────────────────────────────
function renderAjusteTCs() {
  const el = document.getElementById("lista-ajuste-tcs");
  if (!el) return;
  el.innerHTML = STATE.tcs.map((tc, idx) => {
    const pct = pctUsoTC(tc);
    const est = estadoTC(pct);
    return `
    <div class="acordeon-item" id="ac-tc-${idx}">
      <div class="acordeon-header" onclick="toggleAcordeon('tc-${idx}')">
        <div>
          <div class="acordeon-title">${tc.nombre || "Nueva TC"}</div>
          <div class="acordeon-meta">${tc.banco||""} · ${est.icon} ${pct}% · ${formatCLP(tc.usado||0)} / ${formatCLP(tc.cupo||0)}</div>
        </div>
        <span class="acordeon-chevron">⌄</span>
      </div>
      <div class="acordeon-body">
        <div class="campo-grid">
          <div class="campo-field"><label>Nombre</label>
            <input type="text" value="${tc.nombre||""}" onchange="STATE.tcs[${idx}].nombre=this.value;marcarDirty()"></div>
          <div class="campo-field"><label>Banco</label>
            <input type="text" value="${tc.banco||""}" onchange="STATE.tcs[${idx}].banco=this.value;marcarDirty()"></div>
          <div class="campo-field"><label>Cupo total</label>
            <input type="number" value="${tc.cupo||0}" onchange="STATE.tcs[${idx}].cupo=parseInt(this.value)||0;marcarDirty()"></div>
          <div class="campo-field"><label>Saldo usado</label>
            <input type="number" value="${tc.usado||0}" onchange="STATE.tcs[${idx}].usado=parseInt(this.value)||0;marcarDirty()"></div>
          <div class="campo-field"><label>Tasa mensual %</label>
            <input type="number" step="0.01" value="${((tc.tasa||0)*100).toFixed(2)}" onchange="STATE.tcs[${idx}].tasa=parseFloat(this.value)/100||0;marcarDirty()"></div>
          <div class="campo-field"><label>Mantención $</label>
            <input type="number" value="${tc.mantencion||0}" onchange="STATE.tcs[${idx}].mantencion=parseInt(this.value)||0;marcarDirty()"></div>
          <div class="campo-field"><label>Día corte</label>
            <input type="number" min="1" max="31" value="${tc.diaCorte||0}" onchange="STATE.tcs[${idx}].diaCorte=parseInt(this.value)||0;marcarDirty()"></div>
          <div class="campo-field"><label>Día vencimiento</label>
            <input type="number" min="1" max="31" value="${tc.diaVencimiento||0}" onchange="STATE.tcs[${idx}].diaVencimiento=parseInt(this.value)||0;marcarDirty()"></div>
          <div class="campo-field"><label>Prioridad pago</label>
            <input type="number" min="0" max="10" value="${tc.prioridad||0}" onchange="STATE.tcs[${idx}].prioridad=parseInt(this.value)||0;marcarDirty()"></div>
          <div class="campo-field"><label>Activa</label>
            <select onchange="STATE.tcs[${idx}].activa=this.value==='SI';marcarDirty()">
              <option ${tc.activa!==false?"selected":""}>SI</option>
              <option ${tc.activa===false?"selected":""}>NO</option>
            </select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-success btn-sm" onclick="mostrarExito('Cambios guardados ✓')">💾 Listo</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarTC(${idx})">🗑 Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join("") + `<button class="btn btn-ghost" style="margin-top:12px" onclick="agregarTC()">+ Agregar tarjeta</button>`;
}

function toggleAcordeon(id) {
  const el = document.getElementById("ac-" + id);
  if (el) el.classList.toggle("open");
}

function agregarTC() {
  STATE.tcs.push({ nombre:"Nueva TC", banco:"", cupo:0, usado:0, tasa:0,
    mantencion:0, diaCorte:0, diaVencimiento:0, prioridad:0, activa:true });
  marcarDirty(); renderAjusteTCs();
  setTimeout(() => {
    const last = document.getElementById(`ac-tc-${STATE.tcs.length-1}`);
    if (last) { last.classList.add("open"); last.scrollIntoView({behavior:"smooth"}); }
  }, 100);
}

function eliminarTC(idx) {
  if (!confirm(`¿Eliminar "${STATE.tcs[idx].nombre}"?`)) return;
  STATE.tcs.splice(idx, 1);
  marcarDirty(); renderAjusteTCs();
  mostrarExito("TC eliminada ✓");
}

// ── DÉBITOS ────────────────────────────────────────────────────────────────
function renderAjusteDebitos() {
  const el = document.getElementById("lista-ajuste-debitos");
  if (!el) return;
  el.innerHTML = STATE.debitos.map((d, idx) => `
    <div class="acordeon-item" id="ac-deb-${idx}">
      <div class="acordeon-header" onclick="toggleAcordeon('deb-${idx}')">
        <div>
          <div class="acordeon-title">${d.nombre||"Cuenta"}</div>
          <div class="acordeon-meta">${d.banco||""} · ${formatCLP(d.saldo||0)} · ${d.activa!==false?"Activa":"Inactiva"}</div>
        </div>
        <span class="acordeon-chevron">⌄</span>
      </div>
      <div class="acordeon-body">
        <div class="campo-grid">
          <div class="campo-field"><label>Banco</label>
            <input type="text" value="${d.banco||""}" onchange="STATE.debitos[${idx}].banco=this.value;marcarDirty()"></div>
          <div class="campo-field"><label>Nombre</label>
            <input type="text" value="${d.nombre||""}" onchange="STATE.debitos[${idx}].nombre=this.value;marcarDirty()"></div>
          <div class="campo-field full"><label>Saldo actual</label>
            <input type="number" value="${d.saldo||0}" onchange="STATE.debitos[${idx}].saldo=parseInt(this.value)||0;marcarDirty()"></div>
          <div class="campo-field"><label>Activa</label>
            <select onchange="STATE.debitos[${idx}].activa=this.value==='SI';marcarDirty()">
              <option ${d.activa!==false?"selected":""}>SI</option>
              <option ${d.activa===false?"selected":""}>NO</option>
            </select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-success btn-sm" onclick="mostrarExito('Guardado ✓')">💾 Listo</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarDebito(${idx})">🗑 Eliminar</button>
        </div>
      </div>
    </div>`).join("") + `<button class="btn btn-ghost" style="margin-top:12px" onclick="agregarDebito()">+ Agregar cuenta</button>`;
}

function agregarDebito() {
  STATE.debitos.push({ banco:"", nombre:"Nueva cuenta", saldo:0, activa:true });
  marcarDirty(); renderAjusteDebitos();
  setTimeout(() => {
    const last = document.getElementById(`ac-deb-${STATE.debitos.length-1}`);
    if (last) { last.classList.add("open"); last.scrollIntoView({behavior:"smooth"}); }
  }, 100);
}

function eliminarDebito(idx) {
  if (!confirm(`¿Eliminar "${STATE.debitos[idx].nombre}"?`)) return;
  STATE.debitos.splice(idx, 1);
  marcarDirty(); renderAjusteDebitos();
}

// ── FONDOS ─────────────────────────────────────────────────────────────────
function renderAjusteFondos() {
  const el = document.getElementById("lista-ajuste-fondos");
  if (!el) return;

  el.innerHTML = STATE.fondos.map((f, fidx) => {
    const totalPctItems = (f.items||[]).reduce((s,it)=>s+(it.pctDelFondo||0),0);
    const pctColor = totalPctItems > 100 ? "var(--red)" : totalPctItems === 100 ? "var(--green)" : "var(--yellow)";
    const debitosOpts = STATE.debitos.filter(d=>d.activa!==false)
      .map(d=>`<option value="${d.nombre}" ${(f.cuentaAsociada||"")=== d.nombre?"selected":""}>${d.nombre}</option>`).join("");

    return `
    <div class="acordeon-item" id="ac-fondo-${fidx}">
      <div class="acordeon-header" onclick="toggleAcordeon('fondo-${fidx}')">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:10px;height:10px;border-radius:50%;background:${f.color||"#4f8ef7"};flex-shrink:0;display:inline-block"></span>
          <div>
            <div class="acordeon-title">${f.nombre}</div>
            <div class="acordeon-meta">${f.items?.length||0} ítems · ${f.intocable?"🔒 Intocable":"Requisable"}${f.cuentaAsociada?` · 🏦 ${f.cuentaAsociada}`:""}</div>
          </div>
        </div>
        <span class="acordeon-chevron">⌄</span>
      </div>
      <div class="acordeon-body">
        <div class="campo-grid">
          <div class="campo-field full"><label>Nombre</label>
            <input type="text" value="${f.nombre}" onchange="STATE.fondos[${fidx}].nombre=this.value;marcarDirty()"></div>
          <div class="campo-field"><label>Color</label>
            <input type="color" value="${f.color||"#4f8ef7"}" style="height:42px;padding:4px"
              onchange="STATE.fondos[${fidx}].color=this.value;marcarDirty()"></div>
          <div class="campo-field"><label>Intocable requisa</label>
            <select onchange="STATE.fondos[${fidx}].intocable=this.value==='SI';STATE.fondos[${fidx}].requisable=this.value!=='SI';marcarDirty()">
              <option ${f.intocable?"selected":""} value="SI">🔒 Intocable</option>
              <option ${!f.intocable?"selected":""} value="NO">Requisable</option>
            </select></div>
          <div class="campo-field full"><label>Cuenta bancaria asociada</label>
            <select onchange="STATE.fondos[${fidx}].cuentaAsociada=this.value;marcarDirty()">
              <option value="">— Sin asignar —</option>
              ${debitosOpts}
            </select></div>
        </div>

        <!-- Saldo con ajuste manual -->
        <div style="background:var(--bg4);border-radius:var(--radius-xs);padding:12px;margin-top:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:.3px">Saldo actual</div>
              <div style="font-size:20px;font-weight:700;color:${(f.saldoActual||0)<0?"var(--red)":"var(--green)"};margin-top:2px">
                ${formatCLP(f.saldoActual||0)}
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="toggleAjusteManual(${fidx})">✏ Ajuste manual</button>
          </div>
          <div id="ajuste-manual-${fidx}" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
            <div style="display:flex;align-items:center;gap:8px;background:rgba(243,156,18,.1);border:1px solid rgba(243,156,18,.3);border-radius:var(--radius-xs);padding:10px 12px;margin-bottom:12px">
              <span style="font-size:16px">⚠</span>
              <span style="font-size:12px;color:var(--yellow);line-height:1.4">Estás modificando el saldo directamente. Esto <strong>no queda registrado</strong> como transacción. Úsalo solo para correcciones puntuales.</span>
            </div>
            <div class="campo-grid">
              <div class="campo-field"><label>Nuevo saldo</label>
                <input type="number" id="manual-saldo-${fidx}" value="${f.saldoActual||0}"></div>
              <div class="campo-field"><label>Motivo (obligatorio)</label>
                <input type="text" id="manual-motivo-${fidx}" placeholder="ej. Corrección inicial"></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn btn-ghost btn-sm" onclick="toggleAjusteManual(${fidx})">Cancelar</button>
              <button class="btn btn-primary btn-sm" onclick="confirmarAjusteManual(${fidx})">Confirmar ajuste</button>
            </div>
          </div>
        </div>

        <!-- Ítems -->
        <div style="margin-top:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px">Ítems</div>
            <span style="font-size:12px;color:${pctColor};font-weight:600">${totalPctItems}% asignado${totalPctItems>100?" ⚠ excede 100%":""}</span>
          </div>
          ${(f.items||[]).map((it, iidx) => `
            <div style="background:var(--bg4);border-radius:var(--radius-xs);padding:10px 12px;margin-bottom:6px">
              <div style="display:grid;grid-template-columns:1fr 80px 80px 80px auto;gap:8px;align-items:end">
                <div class="campo-field"><label>Nombre</label>
                  <input type="text" value="${it.nombre}"
                    onchange="STATE.fondos[${fidx}].items[${iidx}].nombre=this.value;marcarDirty()"></div>
                <div class="campo-field"><label>% fondo</label>
                  <input type="number" value="${it.pctDelFondo||0}" min="0" max="100"
                    oninput="validarPctItem(${fidx},${iidx},this)"
                    onchange="validarPctItem(${fidx},${iidx},this)"></div>
                <div class="campo-field"><label>Presupuestar</label>
                  <select onchange="STATE.fondos[${fidx}].items[${iidx}].presupuestado=this.value==='SI';marcarDirty();renderAjusteFondos()">
                    <option ${it.presupuestado?"selected":""} value="SI">Sí</option>
                    <option ${!it.presupuestado?"selected":""} value="NO">No</option>
                  </select></div>
                <div class="campo-field"><label>Requisable</label>
                  <select onchange="STATE.fondos[${fidx}].items[${iidx}].requisable=this.value==='SI';marcarDirty()">
                    <option ${it.requisable?"selected":""} value="SI">Sí</option>
                    <option ${!it.requisable?"selected":""} value="NO">No</option>
                  </select></div>
                <button class="btn btn-danger btn-xs" style="align-self:end" onclick="eliminarItem(${fidx},${iidx})">✕</button>
              </div>
              ${it.presupuestado ? `
                <div class="campo-field" style="margin-top:8px"><label>Monto presupuestado</label>
                  <input type="number" value="${it.montoPresupuesto||0}"
                    onchange="STATE.fondos[${fidx}].items[${iidx}].montoPresupuesto=parseInt(this.value)||0;marcarDirty()"></div>` : ""}
            </div>`).join("")}
          <button class="btn btn-ghost btn-sm" onclick="agregarItem(${fidx})" style="margin-top:4px">+ Agregar ítem</button>
        </div>

        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-success btn-sm" onclick="mostrarExito('Cambios guardados ✓')">💾 Listo</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarFondo(${fidx})">🗑 Eliminar fondo</button>
        </div>
      </div>
    </div>`;
  }).join("") + `<button class="btn btn-ghost" style="margin-top:12px" onclick="agregarFondo()">+ Agregar fondo</button>`;
}

function toggleAjusteManual(fidx) {
  const el = document.getElementById(`ajuste-manual-${fidx}`);
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}

function confirmarAjusteManual(fidx) {
  const nuevoSaldo = parseInt(document.getElementById(`manual-saldo-${fidx}`).value) || 0;
  const motivo     = document.getElementById(`manual-motivo-${fidx}`).value.trim();
  if (!motivo) { mostrarError("El motivo es obligatorio"); return; }
  const saldoAnterior = STATE.fondos[fidx].saldoActual || 0;
  STATE.fondos[fidx].saldoActual = nuevoSaldo;
  marcarDirty();
  // Registrar en Excel como ajuste
  agregarGasto([
    hoyFormato(),
    STATE.fondos[fidx].nombre,
    "Ajuste manual",
    nuevoSaldo - saldoAnterior,
    "Ajuste",
    "", "No",
    motivo,
    ""
  ]);
  toggleAjusteManual(fidx);
  mostrarExito(`Saldo ajustado a ${formatCLP(nuevoSaldo)} ✓`);
  renderAjusteFondos();
}

function validarPctItem(fidx, iidx, input) {
  const val   = parseFloat(input.value) || 0;
  const items = STATE.fondos[fidx].items || [];
  const total = items.reduce((s, it, i) => s + (i === iidx ? val : (it.pctDelFondo||0)), 0);
  if (total > 100) {
    input.style.borderColor = "var(--red)";
    mostrarError(`Total ítems: ${total}% — excede 100%`);
    return;
  }
  input.style.borderColor = "";
  STATE.fondos[fidx].items[iidx].pctDelFondo = val;
  marcarDirty();
  // Actualizar contador
  const totalPctItems = items.reduce((s,it,i)=>s+(i===iidx?val:(it.pctDelFondo||0)),0);
  const pctColor = totalPctItems > 100 ? "var(--red)" : totalPctItems === 100 ? "var(--green)" : "var(--yellow)";
  const contEl = document.querySelector(`#ac-fondo-${fidx} .acordeon-body [style*="color:${pctColor}"]`);
}

function agregarFondo() {
  STATE.fondos.push({ id:uid(), nombre:"Nuevo fondo", saldoActual:0,
    color:"#7f8c8d", intocable:false, requisable:true, cuentaAsociada:"", items:[] });
  marcarDirty(); renderAjusteFondos();
  setTimeout(() => {
    const last = document.getElementById(`ac-fondo-${STATE.fondos.length-1}`);
    if (last) { last.classList.add("open"); last.scrollIntoView({behavior:"smooth"}); }
  }, 100);
}

function eliminarFondo(fidx) {
  if (!confirm(`¿Eliminar fondo "${STATE.fondos[fidx].nombre}"?`)) return;
  STATE.fondos.splice(fidx, 1);
  marcarDirty(); renderAjusteFondos();
}

function agregarItem(fidx) {
  if (!STATE.fondos[fidx].items) STATE.fondos[fidx].items = [];
  const totalActual = STATE.fondos[fidx].items.reduce((s,it)=>s+(it.pctDelFondo||0),0);
  if (totalActual >= 100) { mostrarError("Ya tienes 100% asignado — ajusta los ítems existentes primero"); return; }
  STATE.fondos[fidx].items.push({ id:uid(), nombre:"Nuevo ítem", pctDelFondo:0,
    presupuestado:false, montoPresupuesto:0, requisable:true });
  marcarDirty(); renderAjusteFondos();
  const el = document.getElementById(`ac-fondo-${fidx}`);
  if (el && !el.classList.contains("open")) el.classList.add("open");
}

function eliminarItem(fidx, iidx) {
  STATE.fondos[fidx].items.splice(iidx, 1);
  marcarDirty(); renderAjusteFondos();
}

// ── TIPOS DE INGRESO Y REGLAS ──────────────────────────────────────────────
function renderAjusteIngresos() {
  const el = document.getElementById("lista-ajuste-ingresos");
  if (!el) return;
  el.innerHTML = STATE.tiposIngreso.map((ti, tidx) => {
    const totalPct = (ti.reglas||[]).filter(r=>r.tipo==="%").reduce((s,r)=>s+r.valor,0);
    const pctColor = totalPct > 100 ? "var(--red)" : totalPct === 100 ? "var(--green)" : "var(--yellow)";
    return `
    <div class="acordeon-item" id="ac-ing-${tidx}">
      <div class="acordeon-header" onclick="toggleAcordeon('ing-${tidx}')">
        <div>
          <div class="acordeon-title">${ti.nombre}</div>
          <div class="acordeon-meta">${(ti.reglas||[]).length} reglas · <span style="color:${pctColor}">${totalPct}% asignado</span></div>
        </div>
        <span class="acordeon-chevron">⌄</span>
      </div>
      <div class="acordeon-body">
        <div class="campo-field" style="margin-bottom:12px"><label>Nombre del tipo</label>
          <input type="text" value="${ti.nombre}"
            onchange="STATE.tiposIngreso[${tidx}].nombre=this.value;marcarDirty()"></div>
        <div style="font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Reglas de distribución</div>
        ${(ti.reglas||[]).map((r, ridx) => `
          <div style="display:grid;grid-template-columns:1fr 70px 100px auto;gap:6px;align-items:center;margin-bottom:6px">
            <select onchange="STATE.tiposIngreso[${tidx}].reglas[${ridx}].fondoId=this.value;marcarDirty()">
              ${STATE.fondos.map(f=>`<option value="${f.id}" ${f.id===r.fondoId?"selected":""}>${f.nombre}</option>`).join("")}
            </select>
            <select onchange="STATE.tiposIngreso[${tidx}].reglas[${ridx}].tipo=this.value;marcarDirty()">
              <option ${r.tipo==="%"?"selected":""} value="%">%</option>
              <option ${r.tipo==="$"?"selected":""} value="$">$</option>
            </select>
            <input type="number" value="${r.valor}"
              oninput="validarPctRegla(${tidx},${ridx},this)"
              onchange="validarPctRegla(${tidx},${ridx},this)">
            <button class="btn btn-danger btn-xs" onclick="eliminarRegla(${tidx},${ridx})">✕</button>
          </div>`).join("")}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <button class="btn btn-ghost btn-sm" onclick="agregarRegla(${tidx})">+ Agregar regla</button>
          <span style="font-size:12px;color:${pctColor};font-weight:600" id="pct-regla-${tidx}">
            ${totalPct}%${totalPct>100?" ⚠":totalPct===100?" ✓":" — "+(100-totalPct)+"% libre"}
          </span>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-success btn-sm" onclick="mostrarExito('Cambios guardados ✓')">💾 Listo</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarTipoIngreso(${tidx})">🗑 Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join("") + `<button class="btn btn-ghost" style="margin-top:12px" onclick="agregarTipoIngreso()">+ Agregar tipo de ingreso</button>`;
}

function validarPctRegla(tidx, ridx, input) {
  const val    = parseFloat(input.value) || 0;
  const reglas = STATE.tiposIngreso[tidx].reglas || [];
  const tipo   = reglas[ridx]?.tipo || "%";
  if (tipo !== "%") { STATE.tiposIngreso[tidx].reglas[ridx].valor = val; marcarDirty(); return; }
  const total  = reglas.reduce((s,r,i) => s + (r.tipo==="%"?(i===ridx?val:(r.valor||0)):0), 0);
  if (total > 100) {
    input.style.borderColor = "var(--red)";
    mostrarError(`Total reglas: ${total}% — excede 100%`);
    return;
  }
  input.style.borderColor = "";
  STATE.tiposIngreso[tidx].reglas[ridx].valor = val;
  marcarDirty();
  const el = document.getElementById(`pct-regla-${tidx}`);
  if (el) {
    const pctColor = total > 100 ? "var(--red)" : total === 100 ? "var(--green)" : "var(--yellow)";
    el.style.color = pctColor;
    el.textContent = `${total}%${total>100?" ⚠":total===100?" ✓":" — "+(100-total)+"% libre"}`;
  }
}

function agregarTipoIngreso() {
  STATE.tiposIngreso.push({ id:uid(), nombre:"Nuevo tipo", reglas:[] });
  marcarDirty(); renderAjusteIngresos();
}

function eliminarTipoIngreso(idx) {
  if (!confirm(`¿Eliminar "${STATE.tiposIngreso[idx].nombre}"?`)) return;
  STATE.tiposIngreso.splice(idx, 1);
  marcarDirty(); renderAjusteIngresos();
}

function agregarRegla(tidx) {
  if (!STATE.tiposIngreso[tidx].reglas) STATE.tiposIngreso[tidx].reglas = [];
  const totalActual = STATE.tiposIngreso[tidx].reglas.filter(r=>r.tipo==="%").reduce((s,r)=>s+r.valor,0);
  if (totalActual >= 100) { mostrarError("Ya tienes 100% asignado"); return; }
  const primerFondo = STATE.fondos[0];
  STATE.tiposIngreso[tidx].reglas.push({ fondoId:primerFondo?.id||"", tipo:"%", valor:0 });
  marcarDirty(); renderAjusteIngresos();
  const el = document.getElementById(`ac-ing-${tidx}`);
  if (el && !el.classList.contains("open")) el.classList.add("open");
}

function eliminarRegla(tidx, ridx) {
  STATE.tiposIngreso[tidx].reglas.splice(ridx, 1);
  marcarDirty(); renderAjusteIngresos();
}

// ── REQUISAS ───────────────────────────────────────────────────────────────
function renderAjusteRequisas() {
  const el = document.getElementById("lista-ajuste-requisas");
  if (!el) return;
  const req = STATE.requisas;
  el.innerHTML = `
    <div style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:12px">Modo de requisa</div>
      ${[{id:"proporcional",l:"Proporcional",d:"Descuenta según saldo disponible de cada fondo"},{id:"orden",l:"Por orden",d:"Agota el primero de la lista antes de tocar el siguiente"}].map(m=>`
        <div class="sim-btn ${req.modo===m.id?"active":""}" style="margin-bottom:8px;text-align:left;padding:12px 14px;display:block;cursor:pointer"
          onclick="STATE.requisas.modo='${m.id}';marcarDirty();renderAjusteRequisas()">
          <strong>${m.l}</strong>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${m.d}</div>
        </div>`).join("")}
    </div>
    <div>
      <div class="card-title" style="margin-bottom:4px">Fondos — requisabilidad</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:12px">Incluye ítems dentro de cada fondo</div>
      ${STATE.fondos.map((f,fidx)=>`
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${(f.items||[]).length>0?6:0}px">
            <span style="font-weight:600;font-size:14px">${f.nombre}</span>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
              <input type="checkbox" ${f.requisable?"checked":""} style="accent-color:var(--accent);width:15px;height:15px"
                onchange="STATE.fondos[${fidx}].requisable=this.checked;STATE.fondos[${fidx}].intocable=!this.checked;marcarDirty()">
              Requisable
            </label>
          </div>
          ${(f.items||[]).length>0?`
            <div style="padding-left:14px">
              ${f.items.map((it,iidx)=>`
                <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:13px;color:var(--text2)">
                  <span>${it.nombre}</span>
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                    <input type="checkbox" ${it.requisable?"checked":""} style="accent-color:var(--accent);width:14px;height:14px"
                      onchange="STATE.fondos[${fidx}].items[${iidx}].requisable=this.checked;marcarDirty()">
                    Requisable
                  </label>
                </div>`).join("")}
            </div>`:""}`).join("")}
    </div>
    ${req.modo==="orden"?`
    <div style="margin-top:20px">
      <div class="card-title" style="margin-bottom:8px">Orden de requisa</div>
      ${STATE.fondos.filter(f=>f.requisable).map((f,i,arr)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px">
          <span style="color:var(--text3);min-width:18px">${i+1}</span>
          <span style="flex:1">${f.nombre}</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-xs" onclick="moverOrdenRequisaFondo('${f.id}',-1)">↑</button>
            <button class="btn btn-ghost btn-xs" onclick="moverOrdenRequisaFondo('${f.id}',1)">↓</button>
          </div>
        </div>`).join("")}
    </div>`:""}`;
}

function moverOrdenRequisaFondo(id, dir) {
  const req = STATE.fondos.filter(f=>f.requisable);
  const idx = req.findIndex(f=>f.id===id);
  const newI = idx + dir;
  if (newI < 0 || newI >= req.length) return;
  const idxA = STATE.fondos.indexOf(req[idx]);
  const idxB = STATE.fondos.indexOf(req[newI]);
  [STATE.fondos[idxA], STATE.fondos[idxB]] = [STATE.fondos[idxB], STATE.fondos[idxA]];
  marcarDirty(); renderAjusteRequisas();
}

// ── PAGOS AUTO ─────────────────────────────────────────────────────────────
function renderAjustePagos() {
  const el = document.getElementById("lista-ajuste-pagos");
  if (!el) return;
  if (!STATE.pagosAuto.length) {
    el.innerHTML = `<p style="color:var(--text3);font-size:14px;text-align:center;padding:20px 0">Sin pagos automáticos</p>`;
    return;
  }
  el.innerHTML = STATE.pagosAuto.map((p,idx)=>`
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
  document.getElementById("pa-cuenta").innerHTML = [
    ...STATE.tcs.filter(t=>t.activa!==false).map(t=>`<option>${t.nombre}</option>`),
    ...STATE.debitos.filter(d=>d.activa!==false).map(d=>`<option>${d.nombre}</option>`)
  ].join("");
  document.getElementById("pa-fondo").innerHTML = STATE.fondos.map(f=>`<option>${f.nombre}</option>`).join("");
  f.style.display = "block";
}

function guardarPagoAuto() {
  const nombre = document.getElementById("pa-nombre").value;
  const monto  = parseInt(document.getElementById("pa-monto").value)||0;
  const dia    = parseInt(document.getElementById("pa-dia").value)||1;
  const cuenta = document.getElementById("pa-cuenta").value;
  const fondo  = document.getElementById("pa-fondo").value;
  if (!nombre||!monto) { mostrarError("Completa nombre y monto"); return; }
  STATE.pagosAuto.push({ nombre, monto, dia, cuenta, fondo });
  marcarDirty();
  document.getElementById("form-pago-auto").style.display = "none";
  mostrarExito("Pago automático guardado ✓");
  renderAjustePagos();
}

function eliminarPagoAuto(idx) {
  STATE.pagosAuto.splice(idx, 1);
  marcarDirty(); renderAjustePagos();
}

// ── INFO ───────────────────────────────────────────────────────────────────
function renderAjusteInfo() {
  const el = document.getElementById("ajuste-info-content");
  if (!el) return;
  el.innerHTML = `
    <div class="info-row"><span class="key">App</span><span class="val">Presupuesto Familiar</span></div>
    <div class="info-row"><span class="key">Versión</span><span class="val">${CONFIG.version}</span></div>
    <div class="info-row"><span class="key">Usuario</span><span class="val">${obtenerUsuario()||"—"}</span></div>
    <div class="info-row"><span class="key">Config</span><span class="val">${CONFIG.configFile}</span></div>
    <div class="info-row"><span class="key">Transacciones</span><span class="val">${CONFIG.gastosFile}</span></div>
    <div class="info-row"><span class="key">TCs activas</span><span class="val">${STATE.tcs.filter(t=>t.activa!==false).length}</span></div>
    <div class="info-row"><span class="key">Deuda total</span><span class="val" style="color:var(--red)">${formatCLP(totalDeuda())}</span></div>
    <div class="info-row"><span class="key">Mantención mensual</span><span class="val" style="color:var(--yellow)">${formatCLP(totalMantencion())}</span></div>
    <div class="info-row"><span class="key">Fondos</span><span class="val">${STATE.fondos.length}</span></div>
    <div class="info-row"><span class="key">GitHub</span><span class="val">
      <a href="https://github.com/josuefuenzalida/Presupuesto-Familiar" target="_blank" style="color:var(--accent)">Ver repositorio ↗</a>
    </span></div>`;
}
