const ESTRATEGIAS = [
  { id:"nieve",     ico:"⛄", nombre:"Bola de nieve",  desc:"Menor saldo primero — liquidás cuentas rápido" },
  { id:"avalancha", ico:"🏔️", nombre:"Avalancha",      desc:"Mayor tasa primero — pagás menos interés" },
  { id:"mantencion",ico:"💸", nombre:"Mantención",     desc:"Mayor mantención primero — eliminás costos fijos" },
  { id:"manual",    ico:"✏️", nombre:"Manual",         desc:"Vos decidís cuánto a cada una" }
];

let estrategiaActual = "nieve";

// Calcula el plan de pago del mes actual
// minimos: Set de nombres de TCs que pagan mínimo obligatorio
function calcularPlanMensual(aporteMensual, estrategia, minimosSeleccionados) {
  const tcsActivas = STATE.tcs.filter(tc => tc.activa && (tc.usado || 0) > 0)
    .map(tc => ({
      ...tc,
      pagoMin: Math.max(10000, Math.round((tc.usado || 0) * 0.03))
    }));

  if (!tcsActivas.length) return [];

  // Calcular total de mínimos seleccionados
  const conMinimo   = tcsActivas.filter(tc => minimosSeleccionados.has(tc.nombre));
  const sinMinimo   = tcsActivas.filter(tc => !minimosSeleccionados.has(tc.nombre));
  const totalMins   = conMinimo.reduce((s,tc) => s + tc.pagoMin, 0);
  const restante    = Math.max(0, aporteMensual - totalMins);

  // Ordenar los sin mínimo según estrategia para aplicar el excedente
  const candidatas  = [...conMinimo, ...sinMinimo];
  if (estrategia === "nieve")      candidatas.sort((a,b) => a.usado - b.usado);
  else if (estrategia === "avalancha")  candidatas.sort((a,b) => (b.tasa||0) - (a.tasa||0));
  else if (estrategia === "mantencion") candidatas.sort((a,b) => (b.mantencion||0) - (a.mantencion||0));

  // Asignar pagos
  const plan = tcsActivas.map(tc => ({
    nombre:    tc.nombre,
    saldo:     tc.usado || 0,
    tasa:      tc.tasa || 0,
    pagoMin:   tc.pagoMin,
    pagoExtra: 0,
    pagoTotal: minimosSeleccionados.has(tc.nombre) ? tc.pagoMin : 0
  }));

  // Distribuir el restante según estrategia — todo a la primera TC candidata
  let por_asignar = restante;
  for (const tc of candidatas) {
    if (por_asignar <= 0) break;
    const item   = plan.find(p => p.nombre === tc.nombre);
    if (!item) continue;
    const extra  = Math.min(por_asignar, item.saldo - item.pagoTotal);
    if (extra > 0) {
      item.pagoExtra  = extra;
      item.pagoTotal += extra;
      por_asignar    -= extra;
      break; // todo el excedente a la primera en orden
    }
  }

  return plan.filter(p => p.pagoTotal > 0);
}
