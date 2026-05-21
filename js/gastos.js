async function registrarGasto(fecha, fondo, descripcion, monto, medioPago, tcCuenta, cuotas, notas) {
  const montoInt = parseInt(monto);
  if (!montoInt || montoInt <= 0) { mostrarError("Monto inválido."); return false; }

  // 1. Encolar fila en Gastos (no bloquea)
  syncFila(CONFIG.sheets.gastos, [
    fecha, fondo, descripcion, montoInt, medioPago, tcCuenta||"", cuotas||"No", notas||""
  ]);

  // 2. Descontar del fondo en memoria + encolar celda
  const idxF = fondosData.findIndex(f => f["Fondo"] === fondo);
  if (idxF >= 0) {
    const nuevoSaldo = (parseInt(fondosData[idxF]["Saldo Actual"])||0) - montoInt;
    fondosData[idxF]["Saldo Actual"] = nuevoSaldo;
    syncCelda(CONFIG.sheets.fondos, `D${idxF+3}`, nuevoSaldo);
  }

  // 3. Si TC: actualizar saldo usado en memoria + encolar
  if (medioPago === "TC" && tcCuenta) {
    const idxT = tcsData.findIndex(t => t["Nombre"] === tcCuenta);
    if (idxT >= 0) {
      const nuevoUsado = (parseInt(tcsData[idxT]["Usado"])||0) + montoInt;
      tcsData[idxT]["Usado"] = nuevoUsado;
      syncCelda(CONFIG.sheets.tcs, `D${idxT+3}`, nuevoUsado);
    }
  }

  // 4. Si Débito: descontar saldo en memoria + encolar
  if (medioPago === "Débito" && tcCuenta) {
    const idxD = debitosData.findIndex(d => d["Nombre"] === tcCuenta);
    if (idxD >= 0) {
      const nuevoSaldo = (parseInt(debitosData[idxD]["Saldo Actual"])||0) - montoInt;
      debitosData[idxD]["Saldo Actual"] = nuevoSaldo;
      syncCelda(CONFIG.sheets.debitos, `C${idxD+3}`, nuevoSaldo);
    }
  }

  mostrarExito("Gasto guardado — sincronizando...");
  return true;
}

function hoyFormato() {
  const d = new Date();
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
}
