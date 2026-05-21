// ══ ESTADO GLOBAL ══════════════════════════════════════════════════════════
let vistaActual = "dashboard";

// ══ UI UTILIDADES ══════════════════════════════════════════════════════════
function mostrarError(msg) {
  const t = document.getElementById("toast");
  t.textContent = "✕ " + msg;
  t.className = "toast error show";
  setTimeout(()=>t.classList.remove("show"), 3500);
}
function mostrarExito(msg) {
  const t = document.getElementById("toast");
  t.textContent = "✓ " + msg;
  t.className = "toast exito show";
  setTimeout(()=>t.classList.remove("show"), 3000);
}
function loading(show) {
  document.getElementById("loadingScreen").style.display = show ? "flex" : "none";
}
function mostrarVista(id) {
  document.querySelectorAll(".vista").forEach(v=>v.style.display="none");
  const v = document.getElementById("vista-"+id);
  if (v) v.style.display="block";
  vistaActual = id;
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  const btn = document.querySelector(`[data-vista="${id}"]`);
  if (btn) btn.classList.add("active");
  window.scrollTo(0,0);
}

// ══ DASHBOARD ══════════════════════════════════════════════════════════════
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
  const hoy = new Date();
  const alertas = [];

  tcsData.filter(tc=>tc["Activa"]==="SI").forEach(tc => {
    const pct    = pctUsoTC(tc);
    const estado = estadoTC(pct);
    const venc   = estadoVencimiento(tc);

    if (pct >= 40) {
      alertas.push(`
        <div class="alerta-item">
          <span>${tc["Nombre"]}</span>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:13px;color:var(--text2)">${pct}%</span>
            <span class="alerta-badge tc-badge ${estado.cls}">${estado.icon} ${estado.label}</span>
          </div>
        </div>`);
    }
    if (venc) {
      alertas.push(`
        <div class="alerta-item">
          <span>${tc["Nombre"]} — pago</span>
          <span class="venc-badge ${venc.cls}">${venc.label}</span>
        </div>`);
    }
  });

  if (alertas.length === 0) {
    el.innerHTML = `<div style="color:var(--green);font-size:14px;padding:4px 0">✓ Todo bajo control</div>`;
  } else {
    el.innerHTML = alertas.join("");
  }
}

// ══ TCs ════════════════════════════════════════════════════════════════════
function renderTCs() {
  const el = document.getElementById("lista-tcs");
  el.innerHTML = tcsData.filter(tc=>tc["Activa"]==="SI").map(tc => {
    const pct    = pctUsoTC(tc);
    const estado = estadoTC(pct);
    const venc   = estadoVencimiento(tc);
    const libre  = (parseInt(tc["Cupo"])||0) - (parseInt(tc["Usado"])||0);
    return `
    <div class="tc-card">
      <div class="tc-header">
        <span class="tc-nombre">${tc["Nombre"]}</span>
        <span class="tc-badge ${estado.cls}">${estado.icon} ${estado.label}</span>
      </div>
      <div class="tc-nums">
        <span>Usado: <strong style="color:${estado.color}">${formatCLP(tc["Usado"]||0)}</strong></span>
        <span>Libre: <strong>${formatCLP(libre)}</strong></span>
        <span>Cupo: <strong>${formatCLP(tc["Cupo"]||0)}</strong></span>
      </div>
      <div class="prog-bg">
        <div class="prog-fill" style="width:${pct}%;background:${estado.color}"></div>
      </div>
      <div class="tc-footer">
        <span>Corte: día ${tc["F. Corte"]||"—"}</span>
        <span>${venc ? `<span class="venc-badge ${venc.cls}">${venc.label}</span>` : `Vence: día ${tc["F. Vencimiento"]||"—"}`}</span>
        <span>Mant: ${formatCLP(tc["Mantención"]||0)}</span>
      </div>
    </div>`;
  }).join("");

  // Resumen total
  const totalMant = totalMantencion();
  document.getElementById("tc-total-deuda").textContent = formatCLP(totalDeuda());
  document.getElementById("tc-total-mant").textContent  = formatCLP(totalMant);

  setTimeout(()=>renderChartDeuda("chart-deuda"), 150);
}

// ══ FONDOS ═════════════════════════════════════════════════════════════════
function renderFondos() {
  const el = document.getElementById("lista-fondos");
  el.innerHTML = fondosData.map(f => {
    const presup  = parseInt(f["Presupuesto Mensual"])||0;
    const saldo   = parseInt(f["Saldo Actual"])||0;
    const gastado = Math.max(0, presup - saldo);
    const pct     = presup > 0 ? Math.min(100, Math.round((gastado/presup)*100)) : 0;
    const color   = colorFondo(pct);
    return `
    <div class="fondo-row">
      <div class="fondo-top">
        <span class="fondo-nombre">${semaforo(pct)} ${f["Fondo"]}</span>
        <span class="fondo-montos">${formatCLP(saldo)} libre</span>
      </div>
      <div class="prog-bg">
        <div class="prog-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-top:4px">
        <span>Gastado: ${formatCLP(gastado)}</span>
        <span>Presupuesto: ${formatCLP(presup)}</span>
      </div>
    </div>`;
  }).join("");

  setTimeout(()=>renderChartFondos("chart-fondos"), 150);
}

// ══ FORMULARIO GASTO ═══════════════════════════════════════════════════════
function renderFormGasto() {
  const selFondo = document.getElementById("gasto-fondo");
  selFondo.innerHTML = fondosData.map(f=>`<option>${f["Fondo"]}</option>`).join("");
  const selMedio = document.getElementById("gasto-medio");
  selMedio.innerHTML = `<option value="TC">Tarjeta de crédito</option><option value="Débito">Débito</option><option value="Efectivo">Efectivo</option>`;
  actualizarSelectCuentas();
  selMedio.onchange = actualizarSelectCuentas;
  document.getElementById("gasto-fecha").value = hoyFormato();
}

function actualizarSelectCuentas() {
  const medio = document.getElementById("gasto-medio").value;
  const sel   = document.getElementById("gasto-cuenta");
  if (medio==="TC") {
    sel.innerHTML = tcsData.filter(tc=>tc["Activa"]==="SI").map(tc=>`<option>${tc["Nombre"]}</option>`).join("");
  } else if (medio==="Débito") {
    sel.innerHTML = debitosData.filter(d=>d["Activa"]==="SI").map(d=>`<option>${d["Nombre"]}</option>`).join("");
  } else {
    sel.innerHTML = `<option value="">— N/A —</option>`;
  }
}

// ══ FORMULARIO INGRESO ════════════════════════════════════════════════════
function renderFormIngreso() {
  document.getElementById("ing-fecha").value = hoyFormato();
  const selTipo = document.getElementById("ing-tipo");
  selTipo.innerHTML = TIPOS_INGRESO.map(t=>`<option>${t}</option>`).join("");
  selTipo.onchange = previsualizarDistribucion;
}

function previsualizarDistribucion() {
  const monto = parseInt(document.getElementById("ing-neto").value)||0;
  const tipo  = document.getElementById("ing-tipo").value;
  if (!monto) { document.getElementById("dist-preview").innerHTML=""; return; }
  const dist = calcularDistribucion(tipo, monto);
  const el   = document.getElementById("dist-preview");
  if (!dist.length) {
    el.innerHTML = `<p style="font-size:13px;color:var(--text3);padding:8px 0">Sin reglas para este tipo — configura en Ajustes → Reglas</p>`;
    return;
  }
  const total = dist.reduce((s,d)=>s+d.monto,0);
  const resto = monto - total;
  el.innerHTML = dist.map(d=>
    `<div class="dist-row"><span class="fn">${d.fondo}</span><span class="fm">${formatCLP(d.monto)}</span></div>`
  ).join("") + (resto > 0 ? `<div class="dist-row"><span class="fn" style="color:var(--yellow)">Sin asignar</span><span class="fm" style="color:var(--yellow)">${formatCLP(resto)}</span></div>` : "");
}

// ══ DEUDA SIMULADOR ════════════════════════════════════════════════════════
function renderDeuda() {
  // Render botones estrategia
  const elEst = document.getElementById("sim-estrategias");
  if (elEst) {
    elEst.innerHTML = ESTRATEGIAS.map(e=>`
      <div class="sim-btn ${estrategiaActual===e.id?"active":""}" onclick="setEstrategia('${e.id}')">
        <div class="sim-ico">${e.ico}</div>
        <div class="sim-name">${e.nombre}</div>
        <div class="sim-desc">${e.desc}</div>
      </div>`).join("");
  }

  const aporte = parseInt(document.getElementById("aporte-mensual")?.value)||150000;
  if (estrategiaActual === "manual") {
    renderDeudaManual();
    return;
  }

  const proyeccion = proyectarDeuda(aporte, estrategiaActual);
  const el = document.getElementById("lista-deuda");

  if (!proyeccion.length) {
    el.innerHTML = `<div style="color:var(--green);font-size:15px;text-align:center;padding:20px">🎉 Sin deuda activa</div>`;
    return;
  }

  const totalInteres = proyeccion.reduce((s,p)=>s+p.interesTotal,0);
  el.innerHTML = `
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px;padding:8px 12px;background:var(--bg3);border-radius:var(--radius-xs)">
      Orden de ataque según estrategia <strong style="color:var(--accent)">${ESTRATEGIAS.find(e=>e.id===estrategiaActual)?.nombre}</strong>
      · Interés total estimado: <strong style="color:var(--yellow)">${formatCLP(totalInteres)}</strong>
    </div>
    ${proyeccion.map(p=>`
    <div class="deuda-item">
      <div class="di-header">
        <div>
          <div class="di-nombre">${p.orden}° ${p.nombre}</div>
          <div style="font-size:12px;color:var(--text3)">Tasa ${((p.tasa||0)*100).toFixed ? ((p.tasa||0)*100).toFixed(2) : p.tasa}% mensual</div>
        </div>
        <div class="di-monto">${formatCLP(p.saldo)}</div>
      </div>
      <div class="di-detail">
        Aporte mensual: <strong>${formatCLP(p.aporte)}</strong> · 
        Pago mínimo: <strong>${formatCLP(p.pagoMin)}</strong>
      </div>
      <div class="di-result">
        ${p.meses
          ? `<span class="meses">${p.meses} meses</span> <span class="fecha">— ${mesesAFecha(p.meses)}</span><br>
             <span style="font-size:12px;color:var(--text3)">Interés estimado: ${formatCLP(p.interesTotal)}</span>`
          : `<span style="color:var(--red)">⚠ Aporte insuficiente para cubrir intereses</span>`
        }
      </div>
    </div>`).join("")}`;
}

function setEstrategia(id) {
  estrategiaActual = id;
  renderDeuda();
}

function renderDeudaManual() {
  const el = document.getElementById("lista-deuda");
  el.innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px">Define cuánto abonar a cada tarjeta este mes:</div>
    ${tcsData.filter(tc=>tc["Activa"]==="SI"&&(parseInt(tc["Usado"])||0)>0).map(tc=>`
    <div class="deuda-item" style="margin-bottom:8px">
      <div class="di-header" style="margin-bottom:8px">
        <div class="di-nombre">${tc["Nombre"]}</div>
        <div class="di-monto">${formatCLP(tc["Usado"]||0)}</div>
      </div>
      <div class="campo-field">
        <label>Abono este mes</label>
        <input type="number" placeholder="0" id="manual-${tc["Nombre"].replace(/ /g,'_')}"
          style="width:100%;padding:9px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text);font-size:14px">
      </div>
    </div>`).join("")}
    <button class="btn btn-primary" onclick="calcularManual()" style="margin-top:8px">Calcular proyección manual</button>`;
}

function calcularManual() {
  mostrarExito("Proyección manual calculada — revisa cada TC");
}

// ══ INICIALIZACIÓN ═════════════════════════════════════════════════════════
async function init() {
  loading(true);
  await msalInstance.handleRedirectPromise();
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    loading(false);
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appShell").style.display    = "none";
    return;
  }

  currentAccount = accounts[0];
  document.getElementById("loginScreen").style.display  = "none";
  document.getElementById("appShell").style.display     = "block";
  document.getElementById("topbar-user").textContent    = obtenerUsuario();

  try {
    await Promise.all([cargarTCs(), cargarDebitos(), cargarFondos(), cargarReglas(), cargarMetas()]);
  } catch(e) {
    mostrarError("Error al cargar datos de Excel.");
    console.error(e);
  }

  renderDashboard();
  renderFormGasto();
  renderFormIngreso();
  loading(false);
  mostrarVista("dashboard");
}

// ══ EVENT LISTENERS ════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  init();

  // Nav
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

  // Form gasto
  document.getElementById("form-gasto").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("btn-gasto");
    btn.disabled=true; btn.textContent="Guardando...";
    const ok = await registrarGasto(
      document.getElementById("gasto-fecha").value,
      document.getElementById("gasto-fondo").value,
      document.getElementById("gasto-desc").value,
      document.getElementById("gasto-monto").value,
      document.getElementById("gasto-medio").value,
      document.getElementById("gasto-cuenta").value,
      document.getElementById("gasto-cuotas").value,
      document.getElementById("gasto-notas").value
    );
    btn.disabled=false; btn.textContent="Registrar gasto";
    if (ok) { e.target.reset(); renderFormGasto(); await cargarFondos(); await cargarTCs(); await cargarDebitos(); }
  });

  // Form ingreso
  document.getElementById("form-ingreso").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("btn-ingreso");
    btn.disabled=true; btn.textContent="Guardando...";
    const ok = await registrarIngreso(
      document.getElementById("ing-fecha").value,
      document.getElementById("ing-tipo").value,
      document.getElementById("ing-desc").value,
      document.getElementById("ing-bruto").value,
      document.getElementById("ing-neto").value,
      document.getElementById("ing-notas").value
    );
    btn.disabled=false; btn.textContent="Registrar ingreso";
    if (ok) { e.target.reset(); renderFormIngreso(); await cargarFondos(); document.getElementById("dist-preview").innerHTML=""; }
  });

  document.getElementById("ing-neto").addEventListener("input", previsualizarDistribucion);
  document.getElementById("ing-tipo")?.addEventListener("change", previsualizarDistribucion);
  document.getElementById("aporte-mensual")?.addEventListener("input", renderDeuda);
});
