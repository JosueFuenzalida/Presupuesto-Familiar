// ══ UI ══════════════════════════════════════════════════════════════════════
function mostrarError(msg) {
  const t = document.getElementById("toast");
  t.textContent = "✕ " + msg; t.className = "toast error show";
  setTimeout(()=>t.classList.remove("show"), 3500);
}
function mostrarExito(msg) {
  const t = document.getElementById("toast");
  t.textContent = "✓ " + msg; t.className = "toast exito show";
  setTimeout(()=>t.classList.remove("show"), 3000);
}
function loading(show, msg) {
  const el = document.getElementById("loadingScreen");
  el.style.display = show ? "flex" : "none";
  if (msg) document.getElementById("loading-msg").textContent = msg;
}
function mostrarVista(id) {
  document.querySelectorAll(".vista").forEach(v=>v.style.display="none");
  const v = document.getElementById("vista-"+id);
  if (v) v.style.display = "block";
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  const btn = document.querySelector(`[data-vista="${id}"]`);
  if (btn) btn.classList.add("active");
  window.scrollTo(0,0);
}

// ══ CARGAR ESTADO DESDE JSON ════════════════════════════════════════════════
function cargarEstadoDesdeConfig(cfg) {
  if (!cfg) return;
  STATE.tcs          = cfg.tcs          || [];
  STATE.debitos      = cfg.debitos      || [];
  STATE.fondos       = cfg.fondos       || [];
  STATE.tiposIngreso = cfg.tiposIngreso || [];
  STATE.requisas     = cfg.requisas     || { modo:"proporcional", orden:[] };
  STATE.pagosAuto    = cfg.pagosAuto    || [];
  STATE.metas        = cfg.metas        || [];
}

// ══ DASHBOARD ════════════════════════════════════════════════════════════════
function renderDashboard() {
  document.getElementById("dash-deuda").textContent      = formatCLP(totalDeuda());
  document.getElementById("dash-caja").textContent       = formatCLP(totalCaja());
  document.getElementById("dash-mantencion").textContent = formatCLP(totalMantencion());
  document.getElementById("dash-disponible").textContent = formatCLP(totalDisponibleTC());
  renderAlertasDashboard();
  setTimeout(()=>renderChartGastosPorFondo("chart-gastos"), 150);
}

function renderAlertasDashboard() {
  const el = document.getElementById("dash-alertas");
  const alertas = [];
  STATE.tcs.filter(tc=>tc.activa!==false).forEach(tc => {
    const pct  = pctUsoTC(tc);
    const est  = estadoTC(pct);
    const venc = estadoVencimiento(tc);
    if (pct >= 40) alertas.push(`
      <div class="alerta-item">
        <span>${tc.nombre}</span>
        <span class="tc-badge ${est.cls}">${est.icon} ${pct}%</span>
      </div>`);
    if (venc) alertas.push(`
      <div class="alerta-item">
        <span>${tc.nombre} — pago</span>
        <span class="venc-badge ${venc.cls}">${venc.label}</span>
      </div>`);
  });
  el.innerHTML = alertas.length
    ? alertas.join("")
    : `<div style="color:var(--green);font-size:14px;padding:4px 0">✓ Todo bajo control</div>`;
}

// ══ TCs ══════════════════════════════════════════════════════════════════════
function renderTCs() {
  document.getElementById("tc-total-deuda").textContent = formatCLP(totalDeuda());
  document.getElementById("tc-total-mant").textContent  = formatCLP(totalMantencion());
  const el = document.getElementById("lista-tcs");
  el.innerHTML = STATE.tcs.filter(tc=>tc.activa!==false).map(tc => {
    const cupo  = tc.cupo  || 0;
    const usado = tc.usado || 0;
    const libre = Math.max(0, cupo - usado);
    const pct   = cupo > 0 ? Math.round((usado/cupo)*100) : 0;
    const est   = estadoTC(pct);
    const venc  = estadoVencimiento(tc);
    return `
    <div class="tc-card">
      <div class="tc-header">
        <span class="tc-nombre">${tc.nombre}</span>
        <span class="tc-badge ${est.cls}">${est.icon} ${est.label}</span>
      </div>
      <div class="tc-nums">
        <span>Usado: <strong style="color:${est.color}">${formatCLP(usado)}</strong></span>
        <span>Libre: <strong style="color:var(--green)">${formatCLP(libre)}</strong></span>
        <span>Cupo: <strong>${formatCLP(cupo)}</strong></span>
      </div>
      <div class="prog-bg"><div class="prog-fill" style="width:${pct}%;background:${est.color}"></div></div>
      <div class="tc-footer">
        <span>Corte: día ${tc.diaCorte||"—"}</span>
        <span>${venc?`<span class="venc-badge ${venc.cls}">${venc.label}</span>`:`Vence: día ${tc.diaVencimiento||"—"}`}</span>
        <span>Mant: ${formatCLP(tc.mantencion||0)}</span>
      </div>
    </div>`;
  }).join("");
  setTimeout(()=>renderChartDeuda("chart-deuda"), 150);
}

// ══ FONDOS ════════════════════════════════════════════════════════════════════
function renderFondos() {
  const el = document.getElementById("lista-fondos");
  el.innerHTML = STATE.fondos.map(f => {
    const presup  = f.montoPresupuestoCalc || 0;
    const saldo   = f.saldoActual || 0;
    const gastado = Math.max(0, presup - saldo);
    const sobre   = Math.max(0, -saldo);
    const pct     = presup > 0 ? Math.min(100, Math.round((gastado/presup)*100)) : 0;
    const pctTxt  = f.usarMonto ? formatCLP(f.montoFijo||0) : `${f.pctPresupuesto||0}%`;
    return `
    <div class="fondo-row">
      <div class="fondo-top">
        <span class="fondo-nombre">${semaforo(pct)} ${f.nombre}
          <span style="font-size:11px;color:var(--text3);margin-left:4px">${pctTxt}</span>
          ${f.intocable?'<span style="font-size:10px;color:var(--text3)"> 🔒</span>':''}
        </span>
        <span class="fondo-montos" style="color:${saldo<0?'var(--red)':'var(--text2)'}">
          ${formatCLP(Math.max(0,saldo))} libre
        </span>
      </div>
      <div class="prog-bg"><div class="prog-fill" style="width:${pct}%;background:${colorFondo(pct)}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-top:4px">
        <span>Gastado: <span style="color:var(--green)">${formatCLP(gastado)}</span>
          ${sobre>0?` + <span style="color:var(--red)">Sobre: ${formatCLP(sobre)}</span>`:""}
        </span>
        <span>Presupuesto: ${formatCLP(presup)}</span>
      </div>
    </div>`;
  }).join("");
  const h = Math.max(300, STATE.fondos.length * 50);
  const wrap = document.getElementById("chart-fondos-wrap");
  if (wrap) wrap.style.height = h + "px";
  setTimeout(()=>renderChartFondos("chart-fondos"), 150);
}

// ══ FORM GASTO ════════════════════════════════════════════════════════════════
function renderFormGasto() {
  document.getElementById("gasto-fecha").value = hoyFormato();
  const selFondo = document.getElementById("gasto-fondo");
  selFondo.innerHTML = STATE.fondos.map(f=>`<option value="${f.id}">${f.nombre}</option>`).join("");
  actualizarItemsGasto();
  selFondo.onchange = actualizarItemsGasto;
  const selMedio = document.getElementById("gasto-medio");
  selMedio.innerHTML = `<option value="TC">Tarjeta de crédito</option><option value="Débito">Débito</option><option value="Efectivo">Efectivo</option>`;
  actualizarCuentasGasto();
  selMedio.onchange = actualizarCuentasGasto;
}

function actualizarItemsGasto() {
  const fondoId = document.getElementById("gasto-fondo").value;
  const fondo   = fondoById(fondoId);
  const sel     = document.getElementById("gasto-item");
  const items   = fondo?.items || [];
  sel.innerHTML = `<option value="">— Sin especificar —</option>` +
    items.map(it=>`<option value="${it.id}">${it.nombre}${it.presupuestado?` (${formatCLP(it.montoPresupuesto||0)})`:""}</option>`).join("");
}

function actualizarCuentasGasto() {
  const medio = document.getElementById("gasto-medio").value;
  const sel   = document.getElementById("gasto-cuenta");
  if (medio==="TC") {
    sel.innerHTML = STATE.tcs.filter(tc=>tc.activa!==false).map(tc=>`<option>${tc.nombre}</option>`).join("");
  } else if (medio==="Débito") {
    sel.innerHTML = STATE.debitos.filter(d=>d.activa!==false).map(d=>`<option>${d.nombre}</option>`).join("");
  } else {
    sel.innerHTML = `<option value="">— N/A —</option>`;
  }
}

// ══ FORM INGRESO ══════════════════════════════════════════════════════════════
function renderFormIngreso() {
  document.getElementById("ing-fecha").value = hoyFormato();
  const sel = document.getElementById("ing-tipo");
  sel.innerHTML = STATE.tiposIngreso.map(t=>`<option value="${t.id}">${t.nombre}</option>`).join("");
  previsualizarDistribucion();
  sel.onchange = previsualizarDistribucion;
}

function previsualizarDistribucion() {
  const monto  = parseInt(document.getElementById("ing-neto")?.value) || 0;
  const tipoId = document.getElementById("ing-tipo")?.value;
  const el     = document.getElementById("dist-preview");
  if (!el) return;
  if (!monto) { el.innerHTML = `<p style="font-size:13px;color:var(--text3)">Ingresa el monto para ver la distribución</p>`; return; }
  const dist  = calcularDistribucion(tipoId, monto);
  const total = dist.reduce((s,d)=>s+d.monto,0);
  const resto = monto - total;
  el.innerHTML = dist.map(d=>`
    <div class="dist-row">
      <span class="fn">${d.fondoNombre}</span>
      <span style="font-size:12px;color:var(--text3)">${d.valor}${d.tipo}</span>
      <span class="fm">${formatCLP(d.monto)}</span>
    </div>`).join("") +
    (resto>0?`<div class="dist-row"><span class="fn" style="color:var(--yellow)">Sin asignar</span><span></span><span class="fm" style="color:var(--yellow)">${formatCLP(resto)}</span></div>`:"") +
    `<div style="display:flex;justify-content:space-between;font-size:12px;padding-top:8px;border-top:1px solid var(--border);margin-top:4px">
      <span style="color:var(--text3)">Total distribuido</span>
      <span style="color:var(--green);font-weight:700">${formatCLP(total)}</span>
    </div>`;
}

// ══ DEUDA ══════════════════════════════════════════════════════════════════════
function renderDeuda() {
  // Estrategias
  const elEst = document.getElementById("sim-estrategias");
  if (elEst) elEst.innerHTML = ESTRATEGIAS.map(e=>`
    <div class="sim-btn ${estrategiaActual===e.id?"active":""}" onclick="setEstrategia('${e.id}')">
      <div class="sim-ico">${e.ico}</div>
      <div class="sim-name">${e.nombre}</div>
      <div class="sim-desc">${e.desc}</div>
    </div>`).join("");

  if (estrategiaActual === "manual") { renderDeudaManual(); return; }

  // Checkboxes mínimos
  const elMins = document.getElementById("sim-minimos");
  const tcsActivas = STATE.tcs.filter(tc=>tc.activa!==false&&(tc.usado||0)>0);
  if (elMins) elMins.innerHTML = `
    <div style="font-size:12px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Pago mínimo obligatorio en:</div>
    ${tcsActivas.map(tc=>{
      const min = Math.max(10000, Math.round((tc.usado||0)*0.03));
      return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;font-size:14px">
        <input type="checkbox" class="chk-min" value="${tc.nombre}" checked style="accent-color:var(--accent);width:16px;height:16px">
        <span style="flex:1">${tc.nombre}</span>
        <span style="color:var(--text3);font-size:12px">${formatCLP(min)}</span>
      </label>`;
    }).join("")}`;

  calcularYMostrarPlan();
}

function calcularYMostrarPlan() {
  const aporte = parseInt(document.getElementById("aporte-mensual")?.value) || 0;
  const mins   = new Set([...document.querySelectorAll(".chk-min:checked")].map(c=>c.value));
  const plan   = calcularPlanMensual(aporte, estrategiaActual, mins);
  const el     = document.getElementById("lista-deuda");
  if (!el) return;
  if (!plan.length) { el.innerHTML = `<div style="color:var(--green);font-size:15px;text-align:center;padding:20px">🎉 Sin deuda activa</div>`; return; }
  const totalPagar = plan.reduce((s,p)=>s+p.pagoTotal,0);
  el.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:var(--text2)">Total a pagar este mes</span>
        <span style="font-size:22px;font-weight:700;color:var(--accent)">${formatCLP(totalPagar)}</span>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">
        Estrategia: <strong style="color:var(--accent)">${ESTRATEGIAS.find(e=>e.id===estrategiaActual)?.nombre}</strong>
        · Mínimos: <strong>${formatCLP(plan.reduce((s,p)=>s+p.pagoMin,0))}</strong>
        · Extra: <strong style="color:var(--green)">${formatCLP(plan.reduce((s,p)=>s+p.pagoExtra,0))}</strong>
      </div>
    </div>
    ${plan.map(p=>`
    <div class="deuda-item">
      <div class="di-header">
        <div>
          <div class="di-nombre">${p.nombre}</div>
          <div style="font-size:12px;color:var(--text3)">Saldo: ${formatCLP(p.saldo)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:700;color:var(--accent)">${formatCLP(p.pagoTotal)}</div>
          <div style="font-size:11px;color:var(--text3)">pagar este mes</div>
        </div>
      </div>
      <div class="di-detail">
        Mínimo: <strong>${formatCLP(p.pagoMin)}</strong>
        ${p.pagoExtra>0?` + Extra: <strong style="color:var(--green)">${formatCLP(p.pagoExtra)}</strong>`:""}
      </div>
    </div>`).join("")}`;
}

function setEstrategia(id) { estrategiaActual = id; renderDeuda(); }

function renderDeudaManual() {
  const el = document.getElementById("lista-deuda");
  el.innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Define cuánto abonar a cada TC:</div>
    ${STATE.tcs.filter(tc=>tc.activa!==false&&(tc.usado||0)>0).map(tc=>`
    <div class="deuda-item">
      <div class="di-header">
        <div class="di-nombre">${tc.nombre}</div>
        <div style="color:var(--red);font-weight:700;font-size:18px">${formatCLP(tc.usado||0)}</div>
      </div>
      <div class="campo-field" style="margin-top:8px">
        <label style="font-size:11px;color:var(--text3);text-transform:uppercase">Abono (mín: ${formatCLP(Math.max(10000,Math.round((tc.usado||0)*0.03)))})</label>
        <input type="number" placeholder="0" style="width:100%;padding:9px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text);font-size:14px;margin-top:4px">
      </div>
    </div>`).join("")}`;
}

// ══ INIT ══════════════════════════════════════════════════════════════════════
async function init() {
  loading(true, "Iniciando sesión...");
  await msalInstance.handleRedirectPromise();
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    loading(false);
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appShell").style.display    = "none";
    return;
  }
  currentAccount = accounts[0];
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appShell").style.display    = "block";
  document.getElementById("topbar-user").textContent   = obtenerUsuario();

  loading(true, "Cargando configuración...");
  try {
    const cfg = await cargarConfig();
    if (cfg) {
      cargarEstadoDesdeConfig(cfg);
    } else {
      mostrarError("No se pudo cargar la configuración.");
    }
  } catch(e) {
    console.error("init error:", e);
    mostrarError("Error al conectar con OneDrive.");
  }

  renderDashboard();
  renderFormGasto();
  renderFormIngreso();
  setSyncStatus("idle");
  loading(false);
  mostrarVista("dashboard");
}

// ══ LISTENERS ══════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  init();

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const vista = btn.dataset.vista;
      mostrarVista(vista);
      if (vista==="tcs")     renderTCs();
      if (vista==="fondos")  renderFondos();
      if (vista==="deuda")   renderDeuda();
      if (vista==="ajustes") renderAjustes();
    });
  });

  document.getElementById("form-gasto").addEventListener("submit", e => {
    e.preventDefault();
    const btn = document.getElementById("btn-gasto");
    btn.disabled = true; btn.textContent = "Procesando...";
    registrarGasto(
      document.getElementById("gasto-fecha").value,
      document.getElementById("gasto-fondo").value,
      document.getElementById("gasto-item").value || null,
      document.getElementById("gasto-monto").value,
      document.getElementById("gasto-medio").value,
      document.getElementById("gasto-cuenta").value,
      document.getElementById("gasto-cuotas").value,
      document.getElementById("gasto-notas").value
    );
    btn.disabled = false; btn.textContent = "Registrar gasto";
  });

  // Limpiar form después de confirmar requisa
  const modalBtn = document.getElementById("btn-confirmar-requisa");
  if (modalBtn) modalBtn.addEventListener("click", () => {
    confirmarModalRequisa();
    document.getElementById("form-gasto").reset();
    renderFormGasto();
    renderDashboard();
  });

  document.getElementById("form-ingreso").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("btn-ingreso");
    btn.disabled = true; btn.textContent = "Guardando...";
    const ok = await registrarIngreso(
      document.getElementById("ing-fecha").value,
      document.getElementById("ing-tipo").value,
      document.getElementById("ing-desc").value,
      document.getElementById("ing-neto").value,
      document.getElementById("ing-notas").value
    );
    btn.disabled = false; btn.textContent = "Registrar ingreso";
    if (ok) { e.target.reset(); renderFormIngreso(); renderDashboard(); }
  });

  document.getElementById("ing-neto")?.addEventListener("input", previsualizarDistribucion);
  document.getElementById("ing-tipo")?.addEventListener("change", previsualizarDistribucion);
  document.getElementById("aporte-mensual")?.addEventListener("input", calcularYMostrarPlan);
});
