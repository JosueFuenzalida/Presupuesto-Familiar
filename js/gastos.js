// ── Registrar gasto con detección de sobregasto y requisa ─────────────────
let gastoPendienteRequisa = null;

function iniciarRegistroGasto(fecha, fondo, descripcion, monto, medioPago, tcCuenta, cuotas, notas) {
  const montoInt = parseInt(monto);
  if (!montoInt || montoInt <= 0) { mostrarError("Monto inválido."); return false; }

  const idx = fondosData.findIndex(f => f["Fondo"] === fondo);
  const saldoActual = idx >= 0 ? (parseInt(fondosData[idx]["Saldo Actual"]) || 0) : 0;
  const sobregasto  = saldoActual - montoInt < 0 ? Math.abs(saldoActual - montoInt) : 0;

  if (sobregasto > 0) {
    // Calcular requisa y mostrar modal de confirmación
    const requisas = calcularRequisa(fondo, sobregasto);
    gastoPendienteRequisa = { fecha, fondo, descripcion, montoInt, medioPago, tcCuenta, cuotas, notas, sobregasto, requisas };
    mostrarModalRequisa(fondo, sobregasto, requisas);
    return false; // esperar confirmación
  }

  // Sin sobregasto: registrar directo
  confirmarGasto({ fecha, fondo, descripcion, montoInt, medioPago, tcCuenta, cuotas, notas, sobregasto: 0, requisas: [] });
  return true;
}

function mostrarModalRequisa(fondo, sobregasto, requisas) {
  const modal = document.getElementById("modal-requisa");
  if (!modal) return;

  const totalCubierto = requisas.reduce((s, r) => s + r.monto, 0);
  const sinCubrir     = sobregasto - totalCubierto;

  document.getElementById("requisa-fondo").textContent    = fondo;
  document.getElementById("requisa-monto").textContent    = formatCLP(sobregasto);

  const lista = document.getElementById("requisa-lista");
  if (requisas.length === 0) {
    lista.innerHTML = `<div style="color:var(--red);font-size:14px">⚠ No hay fondos disponibles para cubrir el sobregasto.</div>`;
  } else {
    lista.innerHTML = requisas.map(r => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px">
        <span style="color:var(--text2)">${r.fondo}</span>
        <span style="color:var(--yellow);font-weight:600">-${formatCLP(r.monto)}</span>
      </div>`).join("") +
      (sinCubrir > 0 ? `<div style="color:var(--red);font-size:13px;margin-top:8px">⚠ ${formatCLP(sinCubrir)} quedarán sin cubrir — fondo en negativo</div>` : "");
  }

  modal.style.display = "flex";
}

function cerrarModalRequisa() {
  document.getElementById("modal-requisa").style.display = "none";
  gastoPendienteRequisa = null;
}

function confirmarModalRequisa() {
  document.getElementById("modal-requisa").style.display = "none";
  if (!gastoPendienteRequisa) return;
  confirmarGasto(gastoPendienteRequisa);
  gastoPendienteRequisa = null;
}

function confirmarGasto(g) {
  // 1. Encolar fila en Gastos
  syncFila(CONFIG.sheets.gastos, [
    g.fecha, g.fondo, g.descripcion, g.montoInt,
    g.medioPago, g.tcCuenta || "", g.cuotas || "No", g.notas || "",
    g.sobregasto > 0 ? "Sobregasto" : ""
  ]);

  // 2. Descontar del fondo en memoria
  descontarFondo(g.fondo, g.montoInt);

  // 3. Aplicar requisa si hay sobregasto
  if (g.sobregasto > 0 && g.requisas.length > 0) {
    aplicarRequisa(g.requisas);
  }

  // 4. Actualizar TC si aplica
  if (g.medioPago === "TC" && g.tcCuenta) {
    const idx = tcsData.findIndex(t => t["Nombre"] === g.tcCuenta);
    if (idx >= 0) {
      const nuevoUsado = (parseInt(tcsData[idx]["Usado"]) || 0) + g.montoInt;
      tcsData[idx]["Usado"] = nuevoUsado;
      syncCelda(CONFIG.sheets.tcs, `D${idx + 3}`, nuevoUsado);
    }
  }

  // 5. Actualizar débito si aplica
  if (g.medioPago === "Débito" && g.tcCuenta) {
    const idx = debitosData.findIndex(d => d["Nombre"] === g.tcCuenta);
    if (idx >= 0) {
      const nuevoSaldo = (parseInt(debitosData[idx]["Saldo Actual"]) || 0) - g.montoInt;
      debitosData[idx]["Saldo Actual"] = nuevoSaldo;
      syncCelda(CONFIG.sheets.debitos, `C${idx + 3}`, nuevoSaldo);
    }
  }

  mostrarExito(g.sobregasto > 0 ? "Gasto registrado con requisa ✓" : "Gasto registrado ✓");
}

function hoyFormato() {
  const d = new Date();
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
}
