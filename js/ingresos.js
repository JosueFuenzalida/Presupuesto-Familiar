let reglasData = {};
const TIPOS_INGRESO = ["Sueldo", "Pololito / Freelance", "Bono"];

async function cargarReglas() {
  try {
    const token = await obtenerToken();
    const r = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${CONFIG.excelFileName}:/workbook/worksheets/Reglas/usedRange`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (!data.values || data.values.length < 4) return;

    // Fila 0=título app, Fila 1=títulos bloques, Fila 2=headers, Fila 3+=datos
    // Bloques: SUELDO cols 0-4, POLOLITO cols 5-9, BONO cols 10-14
    // Dentro de cada bloque: col0=vacío, col1=Fondo, col2=Tipo, col3=Valor, col4=% Total
    const bloques = [
      { tipo:"Sueldo",               colFondo:1, colTipo:2, colValor:3 },
      { tipo:"Pololito / Freelance",  colFondo:6, colTipo:7, colValor:8 },
      { tipo:"Bono",                  colFondo:11,colTipo:12,colValor:13 }
    ];

    reglasData = {};
    for (const bloque of bloques) {
      reglasData[bloque.tipo] = [];
      for (let i = 3; i < data.values.length; i++) {
        const row   = data.values[i];
        const fondo = row[bloque.colFondo];
        const tipo  = row[bloque.colTipo];
        const valor = parseFloat(row[bloque.colValor]) || 0;
        if (fondo && String(fondo).trim()) {
          reglasData[bloque.tipo].push({
            fondo: String(fondo).trim(),
            tipo:  String(tipo || "%").trim(),
            valor,
            fila:  i
          });
        }
      }
    }
    console.log("Reglas cargadas:", reglasData);
  } catch(e) {
    console.error("cargarReglas error:", e);
  }
}

function calcularDistribucion(tipoIngreso, montoNeto) {
  const monto = parseInt(montoNeto) || 0;
  if (!monto || !reglasData[tipoIngreso]) return [];
  return reglasData[tipoIngreso].map(r => {
    const montoFondo = r.tipo === "%" ? Math.round(monto * r.valor / 100) : parseInt(r.valor) || 0;
    return { fondo: r.fondo, tipo: r.tipo, valor: r.valor, monto: montoFondo };
  }).filter(r => r.monto > 0);
}

async function registrarIngreso(fecha, tipo, descripcion, montoNeto, notas) {
  const neto = parseInt(montoNeto);
  if (!neto || neto <= 0) { mostrarError("Monto inválido."); return false; }

  const distribucion = calcularDistribucion(tipo, neto);
  const reglaDesc    = distribucion.map(d => `${d.fondo}: ${formatCLP(d.monto)}`).join(" | ");

  syncFila(CONFIG.sheets.ingresos, [fecha, tipo, descripcion, neto, reglaDesc, notas || ""]);

  for (const d of distribucion) {
    abonarFondo(d.fondo, d.monto);
  }

  mostrarExito(`Ingreso guardado — ${distribucion.length} fondos actualizados`);
  return true;
}
