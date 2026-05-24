// Convierte nombre de fondo a clave compacta: "Pago Deudas" → "PagoDeudas"
function fondoKey(nombre) {
  return nombre
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/\s+/g, "")   // quitar espacios
    .replace(/[^a-zA-Z0-9]/g, ""); // solo alfanumérico
}

// Parsea "PagoDeudas:105000|Ahorro:45000" → [{nombre, monto}]
function parsearDistribucion(str) {
  if (!str) return [];
  return str.split("|").map(part => {
    const [key, monto] = part.split(":");
    const fondo = STATE.fondos.find(f => fondoKey(f.nombre) === key);
    return { fondoNombre: fondo?.nombre || key, monto: parseInt(monto) || 0 };
  }).filter(d => d.monto > 0);
}

async function registrarIngreso(fecha, tipoId, descripcion, monto, notas) {
  const montoInt = parseInt(monto);
  if (!montoInt || montoInt <= 0) { mostrarError("Monto inválido."); return false; }

  const dist  = calcularDistribucion(tipoId, montoInt);
  const tipo  = STATE.tiposIngreso.find(t => t.id === tipoId);

  // Formato compacto para Excel
  const distStr = dist.map(d => `${fondoKey(d.fondoNombre)}:${d.monto}`).join("|");

  // Abonar a fondos en STATE
  for (const d of dist) {
    const fondo = fondoById(d.fondoId);
    if (fondo) fondo.saldoActual = (fondo.saldoActual || 0) + d.monto;
  }

  marcarDirty();

  // Guardar en Excel con formato compacto
  agregarIngreso([fecha, tipo?.nombre || tipoId, descripcion, montoInt, distStr, notas || ""]);

  mostrarExito(`Ingreso guardado — ${dist.length} fondos actualizados`);
  return true;
}
