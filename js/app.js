let vistaActual = "dashboard";

// ══ UI ══════════════════════════════════════════════════════════════════
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
  if (v) v.style.display = "block";
  vistaActual = id;
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  const btn = document.querySelector(`[data-vista="${id}"]`);
  if (btn) btn.classList.add("active");
  window.scrollTo(0,0);
}

// ══ DASHBOARD ══════════════════════════════════════════════════════════
function renderDashboard() {
  document.getElementById("dash-deuda").textContent      = formatCLP(totalDeuda());
  document.getElementById("dash-caja").textContent       = formatCLP(totalCaja());
  document.getElementById("dash-mantencion").textContent = formatCLP(totalMantencion());
  document.getElementById("dash-disponible").textContent = formatCLP(totalDisponibleTC());
  renderAlertasDashboard();
  setTimeout(()=>renderChartGastosPorFondo("chart-gastos"), 150);
}

function renderAlertasDashboard() {
  const el   = document.getElementById("dash-alertas");
  const hoy  = new Date();
  const alertas = [];

  tcsData.filter(tc=>tc["Activa"]==="SI").forEach(tc => {
    const pct    = pctUsoTC(tc);
    const estado = estadoTC(pct);

    // Solo mostrar TCs con 40%+ de uso
    if (pct >= 80) {
      alertas.push(`
        <div class="alerta-item">
          <span>${tc["Nombre"]}</span>
          <span class="tc-badge urgente">${estado.icon} ${pct}% usado</span>
        </div>`);
    } else if (pct >= 40) {
      alertas.push(`
        <div class="alerta-item">
          <span>${tc["Nombre"]}</span>
          <span class="tc-badge alerta">${estado.icon} ${pct}% usado</span>
        </div>`);
    }

    // Alertas de vencimiento — solo 3 rangos
    const diaVenc  = parseInt(tc["F. Vencimiento"]) || 0;
    const diaCorte = parseInt(tc["F. Corte"]) || 0;
    if (!diaVenc) return;

    const diasVenc  = diasParaFecha(diaVenc);
    const diasCorte = diasParaFecha(diaCorte);

    // Verde: 3 días antes del corte
    if (diasCorte >= 0 && diasCorte <= 3) {
      alertas.push(`
        <div class="alerta-item">
          <span>${tc["Nombre"]} — corte</span>
          <span class="venc-badge venc-ok">En ${diasCorte}d</span>
        </div>`);
    }
    // Amarillo: entre corte y vencimiento (período de pago)
    else if (diasCorte < 0 && diasVenc > 3) {
      alertas.push(`
        <div class="alerta-item">
          <span>${tc["Nombre"]} — en período de pago</span>
          <span class="venc-badge venc-pronto">Vence en ${diasVenc}d</span>
        </div>`);
    }
    // Rojo: 3 días o menos para vencer
    else if (diasVenc >= 0 && diasVenc <= 3) {
      alertas.push(`
        <div class="alerta-item">
          <span>${tc["Nombre"]} — ¡pagar!</span>
          <span class="venc-badge venc-hoy">${diasVenc === 0 ? "HOY" : `${diasVenc}d`}</span>
        </div>`);
    }
    // Vencida
    else if (diasVenc < 0) {
      alertas.push(`
        <div class="alerta-item">
          <span>${tc["Nombre"]}</span>
          <span class="venc-badge venc-mora">Vencida ${Math.abs(diasVenc)}d</span>
        </div>`);
    }
  });

  el.innerHTML = alertas.length === 0
    ? `<div style="color:var(--green);font-size:14px;padding:4px 0">✓ Todo bajo control</div>`
    : alertas.join("");
}

// ══ TCs ════════════════════════════════════════════════════════════════
function renderTCs() {
  document.getElementById("tc-total-deuda").textContent = formatCLP(totalDeuda());
  document.getElementById("tc-total-mant").textContent  = formatCLP(totalMantencion());

  const el = document.getElementById("lista-tcs");
  el.innerHTML = tcsData.filter(tc=>tc["Activa"]==="SI").map(tc => {
    const cupo   = parseInt(tc["Cupo"])  || 0;
    const usado  = parseInt(tc["Usado"]) || 0;
    const libre  = Math.max(0, cupo - usado);
    const pct    = cupo > 0 ? Math.round((usado/cupo)*100) : 0;
    const estado = estadoTC(pct);
    const venc   = estadoVencimiento(tc);
    return `
    <div class="tc-card">
      <div class="tc-header">
        <span class="tc-nombre">${tc["Nombre"]}</span>
        <span class="tc-badge ${estado.cls}">${estado.icon} ${estado.label}</span>
      </div>
      <div class="tc-nums">
        <span>Usado: <strong style="color:${estado.color}">${formatCLP(usado)}</strong></span>
        <span>Libre: <strong style="color:var(--green)">${formatCLP(libre)}</strong></span>
        <span>Cupo: <strong>${formatCLP(cupo)}</strong></span>
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
  setTimeout(()=>renderChartDeuda("chart-deuda"), 150);
}

// ══ FONDOS ═════════════════════════════════════════════════════════════
function renderFondos() {
  const el = document.getElementById("lista-fondos");
  el.innerHTML = fondosData.map(f => {
    const presup  = parseInt(f["Presupuesto Mensual"]) || 0;
    const saldo   = parseInt(f["Saldo Actual"]) || 0;
    const gastado = Math.max(0, presup - saldo);
    const sobre   = Math.max(0, -saldo);
    const pct     = presup > 0 ? Math.min(100, Math.round((gastado/presup)*100)) : 0;
    const esIntocable = reglasRequisa.intocables.includes(f["Fondo"]);
    return `
    <div class="fondo-row">
      <div class="fondo-top">
        <span class="fondo-nombre">${semaforo(pct)} ${f["Fondo"]}${esIntocable ? ' <span style="font-size:10px;color:var(--text3)">🔒</span>' : ''}</span>
        <span class="fondo-montos">${formatCLP(Math.max(0,saldo))} libre</span>
      </div>
      <div class="prog-bg">
        <div class="prog-fill" style="width:${pct}%;background:${colorFondo(pct)}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-top:4px">
        <span>Gastado: <span style="color:var(--green)">${formatCLP(gastado)}</span>${sobre>0?` + <span style="color:var(--red)">Sobre: ${formatCLP(sobre)}</span>`:""}</span>
        <span>Presupuesto: ${formatCLP(presup)}</span>
      </div>
    </div>`;
  }).join("");

  // Altura dinámica según cantidad de fondos
  const altura = Math.max(280, fondosData.length * 42);
  const wrap = document.getElementById("chart-fondos-wrap");
  if (wrap) wrap.style.height = altura + "px";
  setTimeout(()=>renderChartFondos("chart-fondos"), 150);
}

// ══ FORM GASTO ══════════════════════════════════════════════════════════
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

// ══ FORM INGRESO ════════════════════════════════════════════════════════
function renderFormIngreso() {
  document.getElementById("ing-fecha").value = hoyFormato();
  const selTipo = document.getElementById("ing-tipo");
  selTipo.innerHTML = TIPOS_INGRESO.map(t=>`<option>${t}</option>`).join("");
  previsualizarDistribucion();
}

function previsualizarDistribucion() {
  const monto = parseInt(document.getElementById("ing-neto")?.value) || 0;
  const tipo  = document.getElementById("ing-tipo")?.value;
  const el    = document.getElementById("dist-preview");
  if (!el) return;
  if (!monto) {
    el.innerHTML = `<p style="font-size:13px;color:var(--text3)">Ingresa el monto para ver la distribución</p>`;
    return;
  }
  const dist = calcularDistribucion(tipo, monto);
  if (!dist.length) {
    el.innerHTML = `<p style="font-size:13px;color:var(--text3)">Sin reglas configuradas — ve a Ajustes → Reglas</p>`;
    return;
  }
  const total  = dist.reduce((s,d)=>s+d.monto,0);
  const resto  = monto - total;
  el.innerHTML = dist.map(d=>
    `<div class="dist-row">
      <span class="fn">${d.fondo}</span>
      <span style="font-size:12px;color:var(--text3)">${d.valor}${d.tipo}</span>
      <span class="fm">${formatCLP(d.monto)}</span>
    </div>`
  ).join("") +
  (resto > 0 ? `<div class="dist-row"><span class="fn" style="color:var(--yellow)">Sin asignar</span><span></span><span class="fm" style="color:var(--yellow)">${formatCLP(resto)}</span></div>` : "") +
  `<div style="display:flex;justify-content:space-between;font-size:12px;padding-top:8px;border-top:1px solid var(--border);margin-top:4px">
    <span style="color:var(--text3)">Total distribuido</span>
    <span style="color:var(--green);font-weight:700">${formatCLP(total)}</span>
  </div>`;
}

// ══ DEUDA SIMULADOR ═════════════════════════════════════════════════════
function renderDeuda() {
  const elEst = document.getElementById("sim-estrategias");
  if (elEst) {
    elEst.innerHTML = ESTRATEGIAS.map(e=>`
      <div class="sim-btn ${estrategiaActual===e.id?"active":""}" onclick="setEstrategia('${e.id}')">
        <div class="sim-ico">${e.ico}</div>
        <div class="sim-name">${e.nombre}</div>
        <div class="sim-desc">${e.desc}</div>
      </div>`).join("");
  }

  if (estrategiaActual === "manual") { renderDeudaManual(); return; }

  const aporte = parseInt(document.getElementById("aporte-mensual")?.value) || 150000;
  const plan   = calcularPlanMensual(aporte, estrategiaActual);
  const el     = document.getElementById("lista-deuda");

  if (!plan.length) {
    el.innerHTML = `<div style="color:var(--green);font-size:15px;text-align:center;padding:20px">🎉 Sin deuda activa</div>`;
    return;
  }

  const totalPagar = plan.reduce((s,p)=>s+p.pagoTotal,0);
  el.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:var(--text2)">Total a pagar este mes</span>
        <span style="font-size:20px;font-weight:700;color:var(--accent)">${formatCLP(totalPagar)}</span>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">
        Estrategia: <strong style="color:var(--accent)">${ESTRATEGIAS.find(e=>e.id===estrategiaActual)?.nombre}</strong>
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
        ${p.pagoExtra > 0 ? ` + Extra: <strong style="color:var(--green)">${formatCLP(p.pagoExtra)}</strong>` : ""}
      </div>
      <div class="di-result">
        ${p.meses
          ? `<span class="meses">${p.meses} meses</span> <span class="fecha">→ ${p.fechaLiquida}</span>`
          : `<span style="color:var(--red)">⚠ Aporte cubre solo intereses</span>`}
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
    <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Define cuánto abonar a cada TC este mes:</div>
    ${tcsData.filter(tc=>tc["Activa"]==="SI"&&(parseInt(tc["Usado"])||0)>0).map(tc=>`
    <div class="deuda-item">
      <div class="di-header">
        <div class="di-nombre">${tc["Nombre"]}</div>
        <div class="di-monto">${formatCLP(tc["Usado"]||0)}</div>
      </div>
      <div class="campo-field" style="margin-top:8px">
        <label style="font-size:11px;color:var(--text3);text-transform:uppercase">Abono este mes (mín: ${formatCLP(Math.max(10000,Math.round((parseInt(tc["Usado"])||0)*0.03)))})</label>
        <input type="number" placeholder="0" id="manual-${tc["Nombre"].replace(/ /g,'_')}"
          style="width:100%;padding:9px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text);font-size:14px;margin-top:4px">
      </div>
    </div>`).join("")}`;
}

// ══ INIT ════════════════════════════════════════════════════════════════
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
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appShell").style.display    = "block";
  document.getElementById("topbar-user").textContent   = obtenerUsuario();

  try {
    await Promise.all([cargarTCs(), cargarDebitos(), cargarFondos(), cargarReglas(), cargarMetas()]);
  } catch(e) {
    mostrarError("Error al cargar datos.");
    console.error(e);
  }

  renderDashboard();
  renderFormGasto();
  renderFormIngreso();
  iniciarSync();
  loading(false);
  mostrarVista("dashboard");
}

// ══ LISTENERS ══════════════════════════════════════════════════════════
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

  // Form gasto
  document.getElementById("form-gasto").addEventListener("submit", e => {
    e.preventDefault();
    const btn = document.getElementById("btn-gasto");
    btn.disabled = true; btn.textContent = "Procesando...";
    const ok = iniciarRegistroGasto(
      document.getElementById("gasto-fecha").value,
      document.getElementById("gasto-fondo").value,
      document.getElementById("gasto-desc").value,
      document.getElementById("gasto-monto").value,
      document.getElementById("gasto-medio").value,
      document.getElementById("gasto-cuenta").value,
      document.getElementById("gasto-cuotas").value,
      document.getElementById("gasto-notas").value
    );
    btn.disabled = false; btn.textContent = "Registrar gasto";
    if (ok) { e.target.reset(); renderFormGasto(); renderDashboard(); }
  });

  // Form ingreso
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
  document.getElementById("aporte-mensual")?.addEventListener("input", renderDeuda);
});
