let metasData    = [];
let estrategiaActual = "nieve";

async function cargarMetas() {
  metasData = await leerHoja(CONFIG.sheets.metas) || [];
  return metasData;
}

const ESTRATEGIAS = [
  { id:"nieve",      ico:"⛄", nombre:"Bola de nieve",  desc:"Liquida la menor primero" },
  { id:"avalancha",  ico:"🏔️", nombre:"Avalancha",      desc:"Ataca la mayor tasa primero" },
  { id:"mantencion", ico:"💸", nombre:"Mantención",     desc:"Elimina costos fijos antes" },
  { id:"manual",     ico:"✏️", nombre:"Manual",         desc:"Tú decides cuánto a cada una" }
];

// Retorna cuánto pagar en cada TC este mes dado un aporte total
function calcularPlanMensual(aporteMensual, estrategia) {
  if (!aporteMensual || aporteMensual <= 0) return [];

  const tcsActivas = tcsData
    .filter(tc => tc["Activa"] === "SI" && (parseInt(tc["Usado"]) || 0) > 0)
    .map(tc => ({
      nombre:  tc["Nombre"],
      saldo:   parseInt(tc["Usado"])    || 0,
      tasa:    parseFloat(tc["Tasa %"]) || 0,
      mant:    parseInt(tc["Mantención"]) || 0,
      // Pago mínimo: 3% del saldo o $10.000
      pagoMin: Math.max(10000, Math.round((parseInt(tc["Usado"]) || 0) * 0.03))
    }));

  if (tcsActivas.length === 0) return [];

  // Pago mínimo total
  const minTotal = tcsActivas.reduce((s, tc) => s + tc.pagoMin, 0);
  const excedente = Math.max(0, aporteMensual - minTotal);

  // Ordenar según estrategia para aplicar excedente
  const ordenadas = [...tcsActivas];
  if (estrategia === "nieve")      ordenadas.sort((a,b) => a.saldo - b.saldo);
  else if (estrategia === "avalancha")  ordenadas.sort((a,b) => b.tasa  - a.tasa);
  else if (estrategia === "mantencion") ordenadas.sort((a,b) => b.mant  - a.mant);

  // Asignar pagos: mínimo a todos + excedente a la primera en orden
  const plan = tcsActivas.map(tc => ({
    nombre:  tc.nombre,
    saldo:   tc.saldo,
    tasa:    tc.tasa,
    pagoMin: tc.pagoMin,
    pagoExtra: 0,
    pagoTotal: tc.pagoMin
  }));

  // Aplicar excedente a la TC prioritaria
  let excedenteRestante = excedente;
  for (const tcOrden of ordenadas) {
    if (excedenteRestante <= 0) break;
    const item = plan.find(p => p.nombre === tcOrden.nombre);
    if (!item) continue;
    const extra = Math.min(excedenteRestante, item.saldo - item.pagoMin);
    if (extra > 0) {
      item.pagoExtra = extra;
      item.pagoTotal = item.pagoMin + extra;
      excedenteRestante -= extra;
      break; // todo el excedente a la primera TC prioritaria
    }
  }

  // Calcular proyección de meses para cada TC con su pago asignado
  return plan.map(p => {
    const tasaMes = p.tasa / 100;
    let saldoSim  = p.saldo;
    let meses     = 0;
    while (saldoSim > 0 && meses < 120) {
      saldoSim = saldoSim * (1 + tasaMes) - p.pagoTotal;
      if (saldoSim < 100) saldoSim = 0;
      meses++;
    }
    return {
      ...p,
      meses:        meses >= 120 ? null : meses,
      fechaLiquida: meses >= 120 ? null : mesesAFecha(meses)
    };
  });
}

function mesesAFecha(meses) {
  if (!meses) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toLocaleDateString("es-CL", { month:"long", year:"numeric" });
}
