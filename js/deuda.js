let metasData = [];
let estrategiaActual = "nieve";

async function cargarMetas() {
  metasData = await leerHoja(CONFIG.sheets.metas) || [];
  return metasData;
}

function proyectarDeuda(aporteMensual, estrategia) {
  if (!aporteMensual || aporteMensual <= 0) return [];
  const tcsActivas = tcsData
    .filter(tc => tc["Activa"]==="SI" && (parseInt(tc["Usado"])||0) > 0)
    .map(tc => ({
      nombre:   tc["Nombre"],
      saldo:    parseInt(tc["Usado"]) || 0,
      tasa:     parseFloat(tc["Tasa %"]) || 0,
      mant:     parseInt(tc["Mantención"]) || 0
    }));

  if (tcsActivas.length === 0) return [];

  // Ordenar según estrategia
  if (estrategia === "nieve") {
    tcsActivas.sort((a,b) => a.saldo - b.saldo); // menor saldo primero
  } else if (estrategia === "avalancha") {
    tcsActivas.sort((a,b) => b.tasa - a.tasa); // mayor tasa primero
  } else if (estrategia === "mantencion") {
    tcsActivas.sort((a,b) => b.mant - a.mant); // mayor mantención primero
  }

  let aporteLibre = aporteMensual;
  const resultado = [];

  for (let i = 0; i < tcsActivas.length; i++) {
    const tc = tcsActivas[i];
    const tasaMes = tc.tasa / 100;
    // Pago mínimo estimado = 3% del saldo o $10.000, lo que sea mayor
    const pagoMin = Math.max(10000, Math.round(tc.saldo * 0.03));
    // Aporte extra va a la primera TC de la lista
    const aporte = i === 0 ? Math.min(aporteLibre, aporteLibre) : pagoMin;

    let saldoSim = tc.saldo;
    let meses = 0;
    let interesTotal = 0;

    while (saldoSim > 0 && meses < 120) {
      const interesMes = Math.round(saldoSim * tasaMes);
      const pagoReal = Math.min(aporte, saldoSim + interesMes);
      interesTotal += interesMes;
      saldoSim = saldoSim + interesMes - pagoReal;
      if (saldoSim < 100) saldoSim = 0;
      meses++;
    }

    resultado.push({
      nombre: tc.nombre,
      saldo:  tc.saldo,
      tasa:   tc.tasa,
      aporte,
      pagoMin,
      meses:  meses >= 120 ? null : meses,
      interesTotal: Math.max(0, interesTotal),
      orden: i + 1
    });

    // Bola de nieve / avalancha: liberar aporte al liquidar
    if (i === 0 && meses < 120) {
      // El aporte se redirige a la siguiente
    }
  }

  return resultado;
}

function mesesAFecha(meses) {
  if (!meses) return "Indefinido";
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toLocaleDateString("es-CL", { month:"long", year:"numeric" });
}

const ESTRATEGIAS = [
  { id:"nieve",      ico:"⛄", nombre:"Bola de nieve",  desc:"Menor saldo primero — liquidás cuentas más rápido" },
  { id:"avalancha",  ico:"🏔️", nombre:"Avalancha",      desc:"Mayor tasa primero — pagás menos interés total"    },
  { id:"mantencion", ico:"💸", nombre:"Mantención",     desc:"Mayor mantención primero — reducís costos fijos"   },
  { id:"manual",     ico:"✏️", nombre:"Manual",         desc:"Vos decidís cuánto a cada tarjeta"                 }
];
