// ══ INGRESOS — usa dispatchOperation ══════════════════════════════════════

async function registrarIngreso(fecha, tipoId, descripcion, monto, notas) {
  const montoInt = parseInt(monto);
  if (!montoInt || montoInt <= 0) { mostrarError("Monto inválido."); return false; }

  const dist = calcularDistribucion(tipoId, montoInt);
  const tipo = STATE.tiposIngreso.find(t => t.id === tipoId);

  if (!dist.length) {
    mostrarError("Sin reglas configuradas para este tipo de ingreso.");
    return false;
  }

  const payload = {
    fecha,
    tipoId,
    tipoNombre:   tipo?.nombre || tipoId,
    descripcion,
    monto:        montoInt,
    notas:        notas || "",
    distribucion: dist.map(d => ({
      fondoId:    d.fondoId,
      fondoNombre:d.fondoNombre,
      tipo:       d.tipo,
      valor:      d.valor,
      monto:      d.monto
    }))
  };

  // dispatchOperation → encola, aplica optimisticamente, recalcula
  await dispatchOperation(OP.INGRESO, payload);

  // Log para cartola
  logEntry("ingreso", descripcion, montoInt, {
    tipoNombre: tipo?.nombre,
    fondoId:    null
  });

  mostrarExito(`Ingreso guardado — ${dist.length} fondos actualizados`);
  return true;
}
