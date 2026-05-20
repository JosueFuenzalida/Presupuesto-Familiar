// ── Estado global ──────────────────────────────────────────────────────────
let vistaActual = "dashboard";

// ── Utilidades UI ──────────────────────────────────────────────────────────
function mostrarError(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast error show";
  setTimeout(() => t.classList.remove("show"), 3500);
}

function mostrarExito(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast exito show";
  setTimeout(() => t.classList.remove("show"), 3000);
}

function loading(show) {
  document.getElementById("loadingScreen").style.display = show ? "flex" : "none";
}

function mostrarVista(id) {
  document.querySelectorAll(".vista").forEach(v => v.style.display = "none");
  const v = document.getElementById("vista-" + id);
  if (v) v.style.display = "block";
  vistaActual = id;
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const navBtn = document.querySelector(`[data-vista="${id}"]`);
  if (navBtn) navBtn.classList.add("active");
}

// ── Render Dashboard ───────────────────────────────────────────────────────
function renderDashboard() {
  const deuda      = totalDeuda();
  const caja       = totalCaja();
  const mantencion = totalMantencion();
  const disponibleTC = totalDisponibleTC();

  document.getElementById("dash-deuda").textContent     = formatCLP(deuda);
  document.getElementById("dash-caja").textContent      = formatCLP(caja);
  document.getElementById("dash-mantencion").textContent= formatCLP(mantencion);
  document.getElementById("dash-disponible").textContent= formatCLP(disponibleTC);

  // Mini lista TCs urgentes
  const urgentes = tcsData.filter(tc => pctUsoTC(tc) >= 80 && tc["Activa"] === "SI");
  const el = document.getElementById("dash-alertas");
  if (urgentes.length === 0) {
    el.innerHTML = `<p style="color:var(--success);font-size:14px;">✅ Todas las TCs bajo control</p>`;
  } else {
    el.innerHTML = urgentes.map(tc => {
      const pct = pctUsoTC(tc);
      return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px;">
        <span>🔴 ${tc["Nombre"]}</span>
        <span style="color:var(--danger);font-weight:600;">${pct}% usado</span>
      </div>`;
    }).join("");
  }

  // Chart gastos
  setTimeout(() => renderChartGastosPorFondo("chart-gastos"), 100);
}

// ── Render TCs ─────────────────────────────────────────────────────────────
function renderTCs() {
  const el = document.getElementById("lista-tcs");
  el.innerHTML = tcsData.filter(tc => tc["Activa"] === "SI").map(tc => {
    const pct    = pctUsoTC(tc);
    const estado = estadoTC(pct);
    const color  = estado.color;
    return `
    <div class="tc-card">
      <div class="tc-header">
        <span class="tc-nombre">${tc["Nombre"]}</span>
        <span class="tc-badge ${estado.label.toLowerCase()}">${estado.icon} ${estado.label}</span>
      </div>
      <div class="tc-nums">
        <span>Usado: <strong style="color:${color}">${formatCLP(tc["Usado"])}</strong></span>
        <span>Libre: <strong>${formatCLP((parseInt(tc["Cupo Total"])||0)-(parseInt(tc["Usado"])||0))}</strong></span>
        <span>Cupo: <strong>${formatCLP(tc["Cupo Total"])}</strong></span>
      </div>
      <div class="prog-bg">
        <div class="prog-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:5px;">
        <span>Corte: día ${tc["F. Corte"]}</span>
        <span>Vence: día ${tc["F. Vencimiento"]}</span>
        <span>Mant: ${formatCLP(tc["Mantención"])}</span>
      </div>
    </div>`;
  }).join("");

  renderChartDeuda("chart-deuda");
}

// ── Render Fondos ──────────────────────────────────────────────────────────
function renderFondos() {
  const el = document.getElementById("lista-fondos");
  el.innerHTML = fondosData.map(f => {
    const pct   = pctFondo(f);
    const color = colorFondo(pct);
    const presup = parseInt(f["Presupuesto Mensual"]) || 0;
    const saldo  = parseInt(f["Saldo Actual"]) || 0;
    return `
    <div class="fondo-row">
      <div class="fondo-top">
        <span class="fondo-nombre">${semaforo(pct)} ${f["Fondo"]}</span>
        <span class="fondo-montos">${formatCLP(saldo)} / ${formatCLP(presup)}</span>
      </div>
      <div class="prog-bg">
        <div class="prog-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
  }).join("");

  setTimeout(() => renderChartFondos("chart-fondos"), 100);
}

// ── Render form Gasto ──────────────────────────────────────────────────────
function renderFormGasto() {
  // Poblar select fondos
  const selFondo = document.getElementById("gasto-fondo");
  selFondo.innerHTML = fondosData.map(f => `<option>${f["Fondo"]}</option>`).join("");

  // Poblar select medio de pago
  const selMedio = document.getElementById("gasto-medio");
  selMedio.innerHTML = `<option value="TC">TC</option><option value="Débito">Débito</option><option value="Efectivo">Efectivo</option>`;

  actualizarSelectCuentas();
  selMedio.onchange = actualizarSelectCuentas;

  document.getElementById("gasto-fecha").value = hoyFormato();
}

function actualizarSelectCuentas() {
  const medio = document.getElementById("gasto-medio").value;
  const sel   = document.getElementById("gasto-cuenta");
  if (medio === "TC") {
    sel.innerHTML = tcsData.filter(tc => tc["Activa"] === "SI")
      .map(tc => `<option>${tc["Nombre"]}</option>`).join("");
  } else if (medio === "Débito") {
    sel.innerHTML = debitosData.filter(d => d["Activa"] === "SI")
      .map(d => `<option>${d["Nombre"]}</option>`).join("");
  } else {
    sel.innerHTML = `<option value="">— N/A —</option>`;
  }
}

// ── Render form Ingreso ────────────────────────────────────────────────────
function renderFormIngreso() {
  document.getElementById("ing-fecha").value = hoyFormato();
  const selTipo = document.getElementById("ing-tipo");
  selTipo.innerHTML = TIPOS_INGRESO.map(t => `<option>${t}</option>`).join("");
  selTipo.onchange = previsualizarDistribucion;
}

function previsualizarDistribucion() {
  const monto = parseInt(document.getElementById("ing-neto").value) || 0;
  const tipo  = document.getElementById("ing-tipo").value;
  if (!monto) { document.getElementById("dist-preview").innerHTML = ""; return; }
  const dist = calcularDistribucion(tipo, monto);
  const el   = document.getElementById("dist-preview");
  if (dist.length === 0) { el.innerHTML = `<p style="font-size:13px;color:var(--text-muted)">Sin reglas configuradas para este tipo</p>`; return; }
  el.innerHTML = dist.map(d =>
    `<div class="dist-row"><span class="fondo-n">${d.fondo}</span><span class="monto-n">${formatCLP(d.monto)}</span></div>`
  ).join("");
}

// ── Render Deuda ───────────────────────────────────────────────────────────
function renderDeuda() {
  const aporte = parseInt(document.getElementById("aporte-mensual")?.value) || 150000;
  const proyeccion = proyectarDeuda(aporte);
  const el = document.getElementById("lista-deuda");
  if (proyeccion.length === 0) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:14px;">Sin deuda activa 🎉</p>`;
    return;
  }
  el.innerHTML = proyeccion.map(p => `
    <div class="deuda-item">
      <div class="nombre">${p.nombre}</div>
      <div class="detalle">
        Saldo: <strong>${formatCLP(p.saldo)}</strong> —
        Aporte: <strong>${formatCLP(p.aporte)}/mes</strong><br>
        ${p.meses ? `Liquidada en <strong>${p.meses} meses</strong> (${mesesAFecha(p.meses)})` : "⚠️ Aporte insuficiente para cubrir intereses"}<br>
        ${p.meses ? `Interés estimado: ${formatCLP(p.interesTotal)}` : ""}
      </div>
    </div>`).join("");
}

// ── Inicialización ─────────────────────────────────────────────────────────
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
  } catch (e) {
    mostrarError("Error al cargar datos de Excel. Verifica la conexión.");
  }

  renderDashboard();
  renderFormGasto();
  renderFormIngreso();
  loading(false);
  mostrarVista("dashboard");
}

// ── Event Listeners ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  init();

  // Nav
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const vista = btn.dataset.vista;
      mostrarVista(vista);
      if (vista === "tcs")       renderTCs();
      if (vista === "fondos")    renderFondos();
      if (vista === "deuda")     renderDeuda();
      if (vista === "ajustes")   renderAjustes();
    });
  });

  // Form gasto
  document.getElementById("form-gasto").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("btn-gasto");
    btn.disabled = true; btn.textContent = "Guardando...";
    await registrarGasto(
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
    e.target.reset();
    renderFormGasto();
    await cargarFondos();
    await cargarTCs();
    await cargarDebitos();
  });

  // Form ingreso
  document.getElementById("form-ingreso").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = document.getElementById("btn-ingreso");
    btn.disabled = true; btn.textContent = "Guardando...";
    await registrarIngreso(
      document.getElementById("ing-fecha").value,
      document.getElementById("ing-tipo").value,
      document.getElementById("ing-desc").value,
      document.getElementById("ing-bruto").value,
      document.getElementById("ing-neto").value,
      document.getElementById("ing-notas").value
    );
    btn.disabled = false; btn.textContent = "Registrar ingreso";
    e.target.reset();
    renderFormIngreso();
    await cargarFondos();
    document.getElementById("dist-preview").innerHTML = "";
  });

  // Ingreso: previsualizar al cambiar monto
  document.getElementById("ing-neto").addEventListener("input", previsualizarDistribucion);

  // Deuda: recalcular al cambiar aporte
  document.getElementById("aporte-mensual")?.addEventListener("input", renderDeuda);
});

// ── Ajustes tab switcher ───────────────────────────────────────────────────
function switchAjuste(panel, el) {
  document.querySelectorAll(".ajuste-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".ajuste-tab").forEach(t => t.classList.remove("active"));
  document.getElementById("panel-" + panel).classList.add("active");
  el.classList.add("active");
}
