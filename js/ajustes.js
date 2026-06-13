// ══ AJUSTES ════════════════════════════════════════════════════════════════

function renderAjustes() { mostrarPanelAjuste("home"); }

function mostrarPanelAjuste(panel) {
  document.querySelectorAll(".ajuste-panel").forEach(p=>p.classList.remove("active"));
  const el = document.getElementById("ajuste-panel-"+panel);
  if (el) el.classList.add("active");
  if (panel==="tcs")      renderAjusteTCs();
  if (panel==="debitos")  renderAjusteDebitos();
  if (panel==="fondos")   renderAjusteFondos();
  if (panel==="ingresos") renderAjusteIngresos();
  if (panel==="requisas") renderAjusteRequisas();
  if (panel==="pagos")    renderAjustePagos();
  if (panel==="info")     renderAjusteInfo();
}

// ── TCs ────────────────────────────────────────────────────────────────────
function renderAjusteTCs() {
  const el = document.getElementById("lista-ajuste-tcs");
  if (!el) return;
  el.innerHTML = STATE.tcs.map((tc,idx)=>{
    const pct=pctUsoTC(tc), est=estadoTC(pct);
    return `
    <div class="acordeon-item" id="ac-tc-${idx}">
      <div class="acordeon-header" onclick="toggleAcordeon('tc-${idx}')">
        <div>
          <div class="acordeon-title">${tc.nombre||"Nueva TC"}</div>
          <div class="acordeon-meta">${tc.banco||""} · ${est.icon} ${pct}% · ${formatCLP(tc.usado||0)} / ${formatCLP(tc.cupo||0)}</div>
        </div>
        <span class="acordeon-chevron">⌄</span>
      </div>
      <div class="acordeon-body">
        <div class="campo-grid">
          <div class="campo-field"><label>Nombre</label>
            <input type="text" value="${tc.nombre||""}" data-tc="${idx}" data-field="nombre" class="tc-input"></div>
          <div class="campo-field"><label>Banco</label>
            <input type="text" value="${tc.banco||""}" data-tc="${idx}" data-field="banco" class="tc-input"></div>
          <div class="campo-field"><label>Cupo total</label>
            <input type="number" value="${tc.cupo||0}" data-tc="${idx}" data-field="cupo" class="tc-input"></div>
          <div class="campo-field"><label>Saldo usado</label>
            <input type="number" value="${tc.usado||0}" data-tc="${idx}" data-field="usado" class="tc-input"></div>
          <div class="campo-field"><label>Tasa mensual %</label>
            <input type="number" step="0.01" value="${((tc.tasa||0)*100).toFixed(2)}" data-tc="${idx}" data-field="tasa" class="tc-input"></div>
          <div class="campo-field"><label>Mantención $</label>
            <input type="number" value="${tc.mantencion||0}" data-tc="${idx}" data-field="mantencion" class="tc-input"></div>
          <div class="campo-field"><label>Día corte</label>
            <input type="number" min="1" max="31" value="${tc.diaCorte||0}" data-tc="${idx}" data-field="diaCorte" class="tc-input"></div>
          <div class="campo-field"><label>Día vencimiento</label>
            <input type="number" min="1" max="31" value="${tc.diaVencimiento||0}" data-tc="${idx}" data-field="diaVencimiento" class="tc-input"></div>
          <div class="campo-field"><label>Prioridad</label>
            <input type="number" min="0" max="10" value="${tc.prioridad||0}" data-tc="${idx}" data-field="prioridad" class="tc-input"></div>
          <div class="campo-field"><label>Activa</label>
            <select data-tc="${idx}" data-field="activa" class="tc-input">
              <option value="SI" ${tc.activa!==false?"selected":""}>SI</option>
              <option value="NO" ${tc.activa===false?"selected":""}>NO</option>
            </select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-success btn-sm" onclick="guardarTC(${idx})">💾 Guardar</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarTC(${idx})">🗑 Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join("")+`<button class="btn btn-ghost" style="margin-top:12px" onclick="agregarTC()">+ Agregar tarjeta</button>`;
}

function toggleAcordeon(id) {
  const el=document.getElementById("ac-"+id);
  if(el) el.classList.toggle("open");
}

async function guardarTC(idx) {
  const inputs = document.querySelectorAll(`[data-tc="${idx}"].tc-input`);
  const updates = {};
  inputs.forEach(inp => {
    const field = inp.dataset.field;
    if (field==="tasa") updates[field] = parseFloat(inp.value)/100||0;
    else if (field==="activa") updates[field] = inp.value==="SI";
    else if (inp.type==="number") updates[field] = parseFloat(inp.value)||0;
    else updates[field] = inp.value;
  });
  const tc = STATE.tcs[idx];
  await dispatchOperation(OP.UPDATE_TC, { ...tc, ...updates });
  mostrarExito("TC guardada ✓");
  renderAjusteTCs();
}

async function agregarTC() {
  await dispatchOperation(OP.ADD_TC, {
    nombre:"Nueva TC", banco:"", cupo:0, usado:0, tasa:0,
    mantencion:0, diaCorte:0, diaVencimiento:0, prioridad:0, activa:true
  });
  renderAjusteTCs();
  setTimeout(()=>{
    const last=document.getElementById(`ac-tc-${STATE.tcs.length-1}`);
    if(last){last.classList.add("open");last.scrollIntoView({behavior:"smooth"});}
  },100);
}

async function eliminarTC(idx) {
  if(!confirm(`¿Eliminar "${STATE.tcs[idx].nombre}"?`)) return;
  await dispatchOperation(OP.DELETE_TC, { nombre:STATE.tcs[idx].nombre });
  mostrarExito("TC eliminada ✓");
  renderAjusteTCs();
}

// ── DÉBITOS ────────────────────────────────────────────────────────────────
function renderAjusteDebitos() {
  const el=document.getElementById("lista-ajuste-debitos");
  if(!el) return;
  el.innerHTML=STATE.debitos.map((d,idx)=>`
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
            <input type="text" value="${d.banco||""}" data-deb="${idx}" data-field="banco" class="deb-input"></div>
          <div class="campo-field"><label>Nombre</label>
            <input type="text" value="${d.nombre||""}" data-deb="${idx}" data-field="nombre" class="deb-input"></div>
          <div class="campo-field full"><label>Saldo actual</label>
            <input type="number" value="${d.saldo||0}" data-deb="${idx}" data-field="saldo" class="deb-input"></div>
          <div class="campo-field"><label>Activa</label>
            <select data-deb="${idx}" data-field="activa" class="deb-input">
              <option value="SI" ${d.activa!==false?"selected":""}>SI</option>
              <option value="NO" ${d.activa===false?"selected":""}>NO</option>
            </select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-success btn-sm" onclick="guardarDebito(${idx})">💾 Guardar</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarDebito(${idx})">🗑 Eliminar</button>
        </div>
      </div>
    </div>`).join("")+`<button class="btn btn-ghost" style="margin-top:12px" onclick="agregarDebito()">+ Agregar cuenta</button>`;
}

async function guardarDebito(idx) {
  const inputs=document.querySelectorAll(`[data-deb="${idx}"].deb-input`);
  const updates={};
  inputs.forEach(inp=>{
    const f=inp.dataset.field;
    if(f==="activa") updates[f]=inp.value==="SI";
    else if(inp.type==="number") updates[f]=parseFloat(inp.value)||0;
    else updates[f]=inp.value;
  });
  await dispatchOperation(OP.UPDATE_DEBITO,{...STATE.debitos[idx],...updates});
  mostrarExito("Cuenta guardada ✓");
  renderAjusteDebitos();
}

async function agregarDebito() {
  await dispatchOperation(OP.ADD_DEBITO,{banco:"",nombre:"Nueva cuenta",saldo:0,activa:true});
  renderAjusteDebitos();
  setTimeout(()=>{
    const last=document.getElementById(`ac-deb-${STATE.debitos.length-1}`);
    if(last){last.classList.add("open");last.scrollIntoView({behavior:"smooth"});}
  },100);
}

async function eliminarDebito(idx) {
  if(!confirm(`¿Eliminar "${STATE.debitos[idx].nombre}"?`)) return;
  await dispatchOperation(OP.DELETE_DEBITO,{nombre:STATE.debitos[idx].nombre});
  mostrarExito("Eliminada ✓");
  renderAjusteDebitos();
}

// ── FONDOS ─────────────────────────────────────────────────────────────────
function renderAjusteFondos() {
  const el=document.getElementById("lista-ajuste-fondos");
  if(!el) return;
  el.innerHTML=STATE.fondos.map((f,fidx)=>{
    const totalPct=(f.items||[]).reduce((s,it)=>s+(it.pctDelFondo||0),0);
    const pctColor=totalPct>100?"var(--red)":totalPct===100?"var(--green)":"var(--yellow)";
    const debOpts=STATE.debitos.filter(d=>d.activa!==false)
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
            <input type="text" id="f-nombre-${fidx}" value="${f.nombre}"></div>
          <div class="campo-field"><label>Color</label>
            <input type="color" id="f-color-${fidx}" value="${f.color||"#4f8ef7"}" style="height:42px;padding:4px"></div>
          <div class="campo-field"><label>Intocable requisa</label>
            <select id="f-intocable-${fidx}">
              <option value="SI" ${f.intocable?"selected":""}>🔒 Intocable</option>
              <option value="NO" ${!f.intocable?"selected":""}>Requisable</option>
            </select></div>
          <div class="campo-field full"><label>Cuenta bancaria asociada</label>
            <select id="f-cuenta-${fidx}">
              <option value="">— Sin asignar —</option>${debOpts}
            </select></div>
        </div>

        <!-- Ajuste manual saldo -->
        <div style="background:var(--bg4);border-radius:var(--radius-xs);padding:12px;margin-top:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:.3px">Saldo actual</div>
              <div style="font-size:20px;font-weight:700;color:${(f.saldoActual||0)<0?"var(--red)":"var(--green)"}">
                ${formatCLP(f.saldoActual||0)}
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="toggleAjusteManual(${fidx})">✏ Ajuste manual</button>
          </div>
          <div id="ajuste-manual-${fidx}" style="display:none;margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
            <div style="display:flex;align-items:center;gap:8px;background:rgba(243,156,18,.1);border:1px solid rgba(243,156,18,.3);border-radius:var(--radius-xs);padding:10px 12px;margin-bottom:12px">
              <span style="font-size:16px">⚠</span>
              <span style="font-size:12px;color:var(--yellow);line-height:1.4">Modificación directa — <strong>no queda registrado como transacción</strong>. Úsalo solo para correcciones.</span>
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
            <span style="font-size:12px;color:${pctColor};font-weight:600">${totalPct}%${totalPct>100?" ⚠ excede 100%":""}</span>
          </div>
          <div id="items-fondo-${fidx}">
            ${(f.items||[]).map((it,iidx)=>renderItemRow(fidx,iidx,it)).join("")}
          </div>
          <button class="btn btn-ghost btn-sm" onclick="agregarItem(${fidx})" style="margin-top:4px">+ Agregar ítem</button>
        </div>

        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-success btn-sm" onclick="guardarFondo(${fidx})">💾 Guardar fondo</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarFondo(${fidx})">🗑 Eliminar fondo</button>
        </div>
      </div>
    </div>`;
  }).join("")+`<button class="btn btn-ghost" style="margin-top:12px" onclick="agregarFondo()">+ Agregar fondo</button>`;
}

function renderItemRow(fidx,iidx,it) {
  return `
  <div style="background:var(--bg4);border-radius:var(--radius-xs);padding:10px 12px;margin-bottom:6px" id="item-row-${fidx}-${iidx}">
    <div style="display:grid;grid-template-columns:1fr 70px 80px 80px auto;gap:8px;align-items:end">
      <div class="campo-field"><label>Nombre</label>
        <input type="text" id="it-nombre-${fidx}-${iidx}" value="${it.nombre||""}"></div>
      <div class="campo-field"><label>% fondo</label>
        <input type="number" id="it-pct-${fidx}-${iidx}" value="${it.pctDelFondo||0}" min="0" max="100"
          oninput="validarPctItem(${fidx},${iidx},this)"></div>
      <div class="campo-field"><label>Presupuestar</label>
        <select id="it-presup-${fidx}-${iidx}">
          <option value="SI" ${it.presupuestado?"selected":""}>Sí</option>
          <option value="NO" ${!it.presupuestado?"selected":""}>No</option>
        </select></div>
      <div class="campo-field"><label>Requisable</label>
        <select id="it-req-${fidx}-${iidx}">
          <option value="SI" ${it.requisable?"selected":""}>Sí</option>
          <option value="NO" ${!it.requisable?"selected":""}>No</option>
        </select></div>
      <button class="btn btn-danger btn-xs" style="align-self:end" onclick="eliminarItem(${fidx},${iidx})">✕</button>
    </div>
    ${it.presupuestado?`
    <div class="campo-field" style="margin-top:8px"><label>Monto presupuestado</label>
      <input type="number" id="it-monto-${fidx}-${iidx}" value="${it.montoPresupuesto||0}"></div>`:""}
  </div>`;
}

function validarPctItem(fidx,iidx,input) {
  const val=parseFloat(input.value)||0;
  const items=STATE.fondos[fidx].items||[];
  const total=items.reduce((s,it,i)=>s+(i===iidx?val:(it.pctDelFondo||0)),0);
  input.style.borderColor=total>100?"var(--red)":"";
  if(total>100) mostrarError(`Total: ${total}% — excede 100%`);
}

async function guardarFondo(fidx) {
  const f=STATE.fondos[fidx];
  // Leer campos del fondo
  const updates={
    nombre:    document.getElementById(`f-nombre-${fidx}`)?.value||f.nombre,
    color:     document.getElementById(`f-color-${fidx}`)?.value||f.color,
    intocable: document.getElementById(`f-intocable-${fidx}`)?.value==="SI",
    requisable:document.getElementById(`f-intocable-${fidx}`)?.value!=="SI",
    cuentaAsociada:document.getElementById(`f-cuenta-${fidx}`)?.value||""
  };
  // Leer ítems actualizados
  const items=(f.items||[]).map((it,iidx)=>({
    ...it,
    nombre:          document.getElementById(`it-nombre-${fidx}-${iidx}`)?.value||it.nombre,
    pctDelFondo:     parseFloat(document.getElementById(`it-pct-${fidx}-${iidx}`)?.value)||0,
    presupuestado:   document.getElementById(`it-presup-${fidx}-${iidx}`)?.value==="SI",
    requisable:      document.getElementById(`it-req-${fidx}-${iidx}`)?.value==="SI",
    montoPresupuesto:parseFloat(document.getElementById(`it-monto-${fidx}-${iidx}`)?.value)||0,
    updatedAt:       now()
  }));

  await dispatchOperation(OP.UPDATE_FONDO,{...f,...updates,items});
  mostrarExito("Fondo guardado ✓");
  renderAjusteFondos();
}

function toggleAjusteManual(fidx) {
  const el=document.getElementById(`ajuste-manual-${fidx}`);
  if(el) el.style.display=el.style.display==="none"?"block":"none";
}

async function confirmarAjusteManual(fidx) {
  const nuevoSaldo=parseInt(document.getElementById(`manual-saldo-${fidx}`).value)||0;
  const motivo=document.getElementById(`manual-motivo-${fidx}`).value.trim();
  if(!motivo){mostrarError("El motivo es obligatorio");return;}
  const delta=nuevoSaldo-(STATE.fondos[fidx].saldoActual||0);
  await dispatchOperation(OP.AJUSTE_FONDO,{
    fondoId:STATE.fondos[fidx].id,
    fondoNombre:STATE.fondos[fidx].nombre,
    delta, notas:motivo, fecha:hoyFormato()
  });
  toggleAjusteManual(fidx);
  mostrarExito(`Saldo ajustado a ${formatCLP(nuevoSaldo)} ✓`);
  renderAjusteFondos();
}

async function agregarFondo() {
  await dispatchOperation(OP.ADD_FONDO,{
    nombre:"Nuevo fondo",color:"#7f8c8d",
    intocable:false,requisable:true,cuentaAsociada:"",items:[]
  });
  renderAjusteFondos();
  setTimeout(()=>{
    const last=document.getElementById(`ac-fondo-${STATE.fondos.length-1}`);
    if(last){last.classList.add("open");last.scrollIntoView({behavior:"smooth"});}
  },100);
}

async function eliminarFondo(fidx) {
  if(!confirm(`¿Eliminar fondo "${STATE.fondos[fidx].nombre}"?`)) return;
  await dispatchOperation(OP.DELETE_FONDO,{id:STATE.fondos[fidx].id});
  mostrarExito("Fondo eliminado ✓");
  renderAjusteFondos();
}

async function agregarItem(fidx) {
  const items=STATE.fondos[fidx].items||[];
  const totalActual=items.reduce((s,it)=>s+(it.pctDelFondo||0),0);
  if(totalActual>=100){mostrarError("Ya tienes 100% asignado");return;}
  const f={...STATE.fondos[fidx]};
  f.items=[...items,{id:uid(),nombre:"Nuevo ítem",pctDelFondo:0,presupuestado:false,montoPresupuesto:0,requisable:true,createdAt:now(),updatedAt:now(),deviceId:DEVICE_ID}];
  await dispatchOperation(OP.UPDATE_FONDO,f);
  renderAjusteFondos();
  const el=document.getElementById(`ac-fondo-${fidx}`);
  if(el&&!el.classList.contains("open")) el.classList.add("open");
}

async function eliminarItem(fidx,iidx) {
  const f={...STATE.fondos[fidx]};
  f.items=f.items.filter((_,i)=>i!==iidx);
  await dispatchOperation(OP.UPDATE_FONDO,f);
  renderAjusteFondos();
}

// ── TIPOS DE INGRESO ───────────────────────────────────────────────────────
function renderAjusteIngresos() {
  const el=document.getElementById("lista-ajuste-ingresos");
  if(!el) return;
  el.innerHTML=STATE.tiposIngreso.map((ti,tidx)=>{
    const totalPct=(ti.reglas||[]).filter(r=>r.tipo==="%").reduce((s,r)=>s+r.valor,0);
    const pctColor=totalPct>100?"var(--red)":totalPct===100?"var(--green)":"var(--yellow)";
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
          <input type="text" id="ing-nombre-${tidx}" value="${ti.nombre}"></div>
        <div style="font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Reglas de distribución</div>
        <div id="reglas-${tidx}">
          ${(ti.reglas||[]).map((r,ridx)=>`
            <div style="display:grid;grid-template-columns:1fr 70px 100px auto;gap:6px;align-items:center;margin-bottom:6px">
              <select id="r-fondo-${tidx}-${ridx}">
                ${STATE.fondos.map(f=>`<option value="${f.id}" ${f.id===r.fondoId?"selected":""}>${f.nombre}</option>`).join("")}
              </select>
              <select id="r-tipo-${tidx}-${ridx}">
                <option value="%" ${r.tipo==="%"?"selected":""}>%</option>
                <option value="$" ${r.tipo==="$"?"selected":""}>$</option>
              </select>
              <input type="number" id="r-valor-${tidx}-${ridx}" value="${r.valor}"
                oninput="actualizarTotalRegla(${tidx})">
              <button class="btn btn-danger btn-xs" onclick="eliminarRegla(${tidx},${ridx})">✕</button>
            </div>`).join("")}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <button class="btn btn-ghost btn-sm" onclick="agregarRegla(${tidx})">+ Regla</button>
          <span id="pct-ing-${tidx}" style="font-size:12px;color:${pctColor};font-weight:600">
            ${totalPct}%${totalPct>100?" ⚠":totalPct===100?" ✓":" — "+(100-totalPct)+"% libre"}
          </span>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-success btn-sm" onclick="guardarTipoIngreso(${tidx})">💾 Guardar</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarTipoIngreso(${tidx})">🗑 Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join("")+`<button class="btn btn-ghost" style="margin-top:12px" onclick="agregarTipoIngreso()">+ Agregar tipo</button>`;
}

function actualizarTotalRegla(tidx) {
  const ti=STATE.tiposIngreso[tidx];
  const reglas=ti?.reglas||[];
  let total=0;
  reglas.forEach((_,ridx)=>{
    const tipoEl=document.getElementById(`r-tipo-${tidx}-${ridx}`);
    const valEl =document.getElementById(`r-valor-${tidx}-${ridx}`);
    if(tipoEl?.value==="%" && valEl) total+=parseFloat(valEl.value)||0;
  });
  const el=document.getElementById(`pct-ing-${tidx}`);
  if(!el) return;
  const color=total>100?"var(--red)":total===100?"var(--green)":"var(--yellow)";
  el.style.color=color;
  el.textContent=`${total}%${total>100?" ⚠":total===100?" ✓":" — "+(100-total)+"% libre"}`;
}

async function guardarTipoIngreso(tidx) {
  const ti=STATE.tiposIngreso[tidx];
  const nombre=document.getElementById(`ing-nombre-${tidx}`)?.value||ti.nombre;
  // Leer reglas actualizadas
  const reglas=(ti.reglas||[]).map((_,ridx)=>({
    fondoId: document.getElementById(`r-fondo-${tidx}-${ridx}`)?.value||"",
    tipo:    document.getElementById(`r-tipo-${tidx}-${ridx}`)?.value||"%",
    valor:   parseFloat(document.getElementById(`r-valor-${tidx}-${ridx}`)?.value)||0
  }));
  await dispatchOperation(OP.UPDATE_TIPO_INGRESO,{...ti,nombre,reglas,updatedAt:now()});
  mostrarExito("Tipo de ingreso guardado ✓");
  renderAjusteIngresos();
}

async function agregarTipoIngreso() {
  await dispatchOperation(OP.ADD_TIPO_INGRESO,{nombre:"Nuevo tipo",reglas:[]});
  renderAjusteIngresos();
}

async function eliminarTipoIngreso(tidx) {
  if(!confirm(`¿Eliminar "${STATE.tiposIngreso[tidx].nombre}"?`)) return;
  await dispatchOperation(OP.DELETE_TIPO_INGRESO,{id:STATE.tiposIngreso[tidx].id});
  mostrarExito("Eliminado ✓");
  renderAjusteIngresos();
}

async function agregarRegla(tidx) {
  const ti=STATE.tiposIngreso[tidx];
  const total=(ti.reglas||[]).filter(r=>r.tipo==="%").reduce((s,r)=>s+r.valor,0);
  if(total>=100){mostrarError("Ya tienes 100% asignado");return;}
  const nuevoTi={...ti,reglas:[...(ti.reglas||[]),{fondoId:STATE.fondos[0]?.id||"",tipo:"%",valor:0}],updatedAt:now()};
  await dispatchOperation(OP.UPDATE_TIPO_INGRESO,nuevoTi);
  renderAjusteIngresos();
  const el=document.getElementById(`ac-ing-${tidx}`);
  if(el&&!el.classList.contains("open")) el.classList.add("open");
}

async function eliminarRegla(tidx,ridx) {
  const ti={...STATE.tiposIngreso[tidx]};
  ti.reglas=ti.reglas.filter((_,i)=>i!==ridx);
  ti.updatedAt=now();
  await dispatchOperation(OP.UPDATE_TIPO_INGRESO,ti);
  renderAjusteIngresos();
}

// ── REQUISAS ───────────────────────────────────────────────────────────────
function renderAjusteRequisas() {
  const el=document.getElementById("lista-ajuste-requisas");
  if(!el) return;
  const req=STATE.requisas;
  el.innerHTML=`
    <div style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:12px">Modo de requisa</div>
      ${[{id:"proporcional",l:"Proporcional",d:"Descuenta según saldo disponible"},{id:"orden",l:"Por orden",d:"Agota el primero antes de tocar el siguiente"}].map(m=>`
        <div class="sim-btn ${req.modo===m.id?"active":""}" style="margin-bottom:8px;text-align:left;padding:12px 14px;display:block;cursor:pointer"
          onclick="cambiarModoRequisa('${m.id}')">
          <strong>${m.l}</strong>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${m.d}</div>
        </div>`).join("")}
    </div>
    <div>
      <div class="card-title" style="margin-bottom:8px">Fondos — requisabilidad</div>
      ${STATE.fondos.map((f,fidx)=>`
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${(f.items||[]).length>0?6:0}px">
            <span style="font-weight:600;font-size:14px">${f.nombre}</span>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
              <input type="checkbox" ${f.requisable?"checked":""} style="accent-color:var(--accent);width:15px;height:15px"
                onchange="toggleRequisableFondo(${fidx},this.checked)">
              Requisable
            </label>
          </div>
          ${(f.items||[]).length>0?`
            <div style="padding-left:14px">
              ${f.items.map((it,iidx)=>`
                <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;color:var(--text2)">
                  <span>${it.nombre}</span>
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                    <input type="checkbox" ${it.requisable?"checked":""} style="accent-color:var(--accent);width:14px;height:14px"
                      onchange="toggleRequisableItem(${fidx},${iidx},this.checked)">
                    Requisable
                  </label>
                </div>`).join("")}
            </div>`:""}
        </div>`).join("")}
    </div>`;
}

async function cambiarModoRequisa(modo) {
  await dispatchOperation(OP.UPDATE_REQUISAS,{...STATE.requisas,modo});
  renderAjusteRequisas();
}

async function toggleRequisableFondo(fidx,val) {
  const f={...STATE.fondos[fidx],requisable:val,intocable:!val,updatedAt:now()};
  await dispatchOperation(OP.UPDATE_FONDO,f);
}

async function toggleRequisableItem(fidx,iidx,val) {
  const f={...STATE.fondos[fidx]};
  f.items=f.items.map((it,i)=>i===iidx?{...it,requisable:val,updatedAt:now()}:it);
  await dispatchOperation(OP.UPDATE_FONDO,f);
}

// ── PAGOS AUTO ─────────────────────────────────────────────────────────────
function renderAjustePagos() {
  const el=document.getElementById("lista-ajuste-pagos");
  if(!el) return;
  if(!STATE.pagosAuto.length){
    el.innerHTML=`<p style="color:var(--text3);font-size:14px;text-align:center;padding:20px 0">Sin pagos automáticos</p>`;
    return;
  }
  el.innerHTML=STATE.pagosAuto.map((p,idx)=>`
    <div class="pago-auto-item">
      <div>
        <div class="pago-auto-nombre">${p.nombre}</div>
        <div class="pago-auto-detail">${formatCLP(p.monto)} · Día ${p.dia} · ${p.cuenta} → ${p.fondo}</div>
      </div>
      <button class="btn btn-danger btn-xs" onclick="eliminarPagoAuto(${idx})">✕</button>
    </div>`).join("");
}

function mostrarFormPagoAuto() {
  const f=document.getElementById("form-pago-auto");
  if(!f) return;
  document.getElementById("pa-cuenta").innerHTML=[
    ...STATE.tcs.filter(t=>t.activa!==false).map(t=>`<option>${t.nombre}</option>`),
    ...STATE.debitos.filter(d=>d.activa!==false).map(d=>`<option>${d.nombre}</option>`)
  ].join("");
  document.getElementById("pa-fondo").innerHTML=STATE.fondos.map(f=>`<option>${f.nombre}</option>`).join("");
  f.style.display="block";
}

async function guardarPagoAuto() {
  const nombre=document.getElementById("pa-nombre").value;
  const monto=parseInt(document.getElementById("pa-monto").value)||0;
  const dia=parseInt(document.getElementById("pa-dia").value)||1;
  const cuenta=document.getElementById("pa-cuenta").value;
  const fondo=document.getElementById("pa-fondo").value;
  if(!nombre||!monto){mostrarError("Completa nombre y monto");return;}
  await dispatchOperation(OP.ADD_PAGO_AUTO,{nombre,monto,dia,cuenta,fondo});
  document.getElementById("form-pago-auto").style.display="none";
  mostrarExito("Pago automático guardado ✓");
  renderAjustePagos();
}

async function eliminarPagoAuto(idx) {
  await dispatchOperation(OP.DELETE_PAGO_AUTO,{idx});
  renderAjustePagos();
}

// ── INFO ───────────────────────────────────────────────────────────────────
function renderAjusteInfo() {
  const el=document.getElementById("ajuste-info-content");
  if(!el) return;
  const pending=document.querySelectorAll(".sync-dot.pending").length>0;
  el.innerHTML=`
    <div class="info-row"><span class="key">App</span><span class="val">Presupuesto Familiar</span></div>
    <div class="info-row"><span class="key">Versión</span><span class="val">${CONFIG.version}</span></div>
    <div class="info-row"><span class="key">Device ID</span><span class="val" style="font-size:12px">${DEVICE_ID}</span></div>
    <div class="info-row"><span class="key">Usuario</span><span class="val">${obtenerUsuario()||"—"}</span></div>
    <div class="info-row"><span class="key">Config</span><span class="val">${CONFIG.configFile}</span></div>
    <div class="info-row"><span class="key">Movimientos</span><span class="val">${CONFIG.gastosFile}</span></div>
    <div class="info-row"><span class="key">TCs activas</span><span class="val">${STATE.tcs.filter(t=>t.activa!==false).length}</span></div>
    <div class="info-row"><span class="key">Movimientos</span><span class="val">${STATE.movimientos.length}</span></div>
    <div class="info-row"><span class="key">Deuda total</span><span class="val" style="color:var(--red)">${formatCLP(totalDeuda())}</span></div>
    <div class="info-row"><span class="key">Mantención</span><span class="val" style="color:var(--yellow)">${formatCLP(totalMantencion())}</span></div>
    <div class="info-row"><span class="key">Último sync</span><span class="val">${STATE._lastSync?new Date(STATE._lastSync).toLocaleTimeString("es-CL"):"—"}</span></div>
    <div class="info-row"><span class="key">GitHub</span><span class="val">
      <a href="https://github.com/josuefuenzalida/Presupuesto-Familiar" target="_blank" style="color:var(--accent)">Ver repositorio ↗</a>
    </span></div>
    <div style="margin-top:12px">
      <button class="btn btn-primary btn-sm" style="width:100%" onclick="forzarSync()">🔄 Sincronizar ahora</button>
    </div>`;
}
