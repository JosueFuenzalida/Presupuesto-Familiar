async function registrarIngreso(fecha, tipoId, descripcion, monto, notas) {
  const montoInt = parseInt(monto);
  if (!montoInt || montoInt <= 0) { mostrarError("Monto inválido."); return false; }

  const dist     = calcularDistribucion(tipoId, montoInt);
  const tipo     = STATE.tiposIngreso.find(t => t.id === tipoId);
  const descDist = dist.map(d => `${d.fondoNombre}: ${formatCLP(d.monto)}`).join(" | ");

  // Abonar a fondos en STATE
  for (const d of dist) {
    const fondo = fondoById(d.fondoId);
    if (fondo) fondo.saldoActual = (fondo.saldoActual || 0) + d.monto;
  }

  // Persistir config
  marcarDirty();

  // Guardar en Excel
  agregarIngreso([fecha, tipo?.nombre || tipoId, descripcion, montoInt, descDist, notas || ""]);

  mostrarExito(`Ingreso guardado — ${dist.length} fondos actualizados`);
  return true;
}
