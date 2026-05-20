async function registrarGasto(fecha, fondo, descripcion, monto, medioPago, tcCuenta, cuotas, notas) {
  const montoInt = parseInt(monto);
  if (!montoInt || montoInt <= 0) { mostrarError("Monto inválido."); return false; }

  // 1. Agregar fila en hoja Gastos
  const ok = await agregarFila(CONFIG.sheets.gastos, [
    fecha, fondo, descripcion, montoInt, medioPago, tcCuenta, cuotas || "No", notas || ""
  ]);
  if (!ok) { mostrarError("Error al guardar el gasto."); return false; }

  // 2. Descontar del fondo correspondiente
  await descontarFondo(fondo, montoInt);

  // 3. Si fue con TC, actualizar saldo usado
  if (medioPago === "TC" && tcCuenta) {
    const tc = tcsData.find(t => t["Nombre"] === tcCuenta);
    if (tc) {
      const nuevoUsado = (parseInt(tc["Usado"]) || 0) + montoInt;
      await actualizarSaldoTC(tcCuenta, nuevoUsado);
    }
  }

  // 4. Si fue con débito, descontar saldo
  if (medioPago === "Débito" && tcCuenta) {
    const deb = debitosData.find(d => d["Nombre"] === tcCuenta);
    if (deb) {
      const nuevoSaldo = (parseInt(deb["Saldo Actual"]) || 0) - montoInt;
      await actualizarSaldoDebito(tcCuenta, nuevoSaldo);
    }
  }

  mostrarExito("Gasto registrado ✓");
  return true;
}

function hoyFormato() {
  const d = new Date();
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
}
