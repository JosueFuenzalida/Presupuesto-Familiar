let metasData = [];

async function cargarMetas() {
  metasData = await leerHoja(CONFIG.sheets.metas) || [];
  return metasData;
}

// Proyecta meses para liquidar cada TC con un aporte mensual dado
function proyectarDeuda(aporteMensual) {
  if (!aporteMensual || aporteMensual <= 0) return [];

  // Ordenar TCs por prioridad (método bola de nieve: menor saldo primero)
  const tcsActivas = tcsData
    .filter(tc => tc["Activa"] === "SI" && (parseInt(tc["Usado"]) || 0) > 0)
    .sort((a, b) => (parseInt(a["Usado"]) || 0) - (parseInt(b["Usado"]) || 0));

  let aporteDisponible = aporteMensual;
  const resultado = [];

  for (const tc of tcsActivas) {
    const saldo   = parseInt(tc["Usado"]) || 0;
    const tasa    = parseFloat(tc["Tasa %"]) || 0;
    const tasaMes = tasa / 100;

    if (saldo <= 0) continue;

    // Calcular meses con interés simple
    let meses = 0;
    let saldoSim = saldo;
    const aporte = Math.min(aporteDisponible, saldo * 1.5); // no más del 150% del saldo

    while (saldoSim > 0 && meses < 120) {
      saldoSim = saldoSim * (1 + tasaMes) - aporte;
      meses++;
    }

    resultado.push({
      nombre: tc["Nombre"],
      saldo,
      tasa,
      aporte,
      meses: meses >= 120 ? null : meses,
      interesTotal: Math.max(0, Math.round(aporte * meses - saldo))
    });

    // Una vez liquidada, el aporte queda libre para la siguiente
    // (método bola de nieve)
  }

  return resultado;
}

function mesesAFecha(meses) {
  if (!meses) return "Indefinido";
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}
