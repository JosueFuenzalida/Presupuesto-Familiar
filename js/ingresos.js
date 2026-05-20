let reglasData = [];

async function cargarReglas() {
  reglasData = await leerHoja(CONFIG.sheets.reglas) || [];
  return reglasData;
}

// Tipos de ingreso disponibles
const TIPOS_INGRESO = ["Sueldo", "Pololito / Freelance", "Bono"];

// Calcula la distribución de un ingreso según sus reglas
// Retorna array: [{fondo, tipo, valor, monto}]
function calcularDistribucion(tipoIngreso, montoNeto) {
  const monto = parseInt(montoNeto) || 0;
  const cols = {
    "Sueldo":              { fondo: "Fondo", tipo: "Tipo", valor: "Valor" },
    "Pololito / Freelance":{ fondo: "Fondo__1", tipo: "Tipo__1", valor: "Valor__1" },
    "Bono":                { fondo: "Fondo__2", tipo: "Tipo__2", valor: "Valor__2" }
  };
  const c = cols[tipoIngreso];
  if (!c || reglasData.length === 0) return [];

  return reglasData
    .filter(r => r[c.fondo])
    .map(r => {
      const fondoNombre = r[c.fondo];
      const tipoRegla   = r[c.tipo] || "%";
      const valorRegla  = parseFloat(r[c.valor]) || 0;
      let montoFondo = 0;
      if (tipoRegla === "%") {
        montoFondo = Math.round(monto * valorRegla / 100);
      } else {
        montoFondo = valorRegla;
      }
      return { fondo: fondoNombre, tipo: tipoRegla, valor: valorRegla, monto: montoFondo };
    })
    .filter(r => r.monto > 0);
}

async function registrarIngreso(fecha, tipo, descripcion, montoBruto, montoNeto, notas) {
  const neto = parseInt(montoNeto);
  if (!neto || neto <= 0) { mostrarError("Monto inválido."); return false; }

  // 1. Guardar en hoja Ingresos
  const distribucion = calcularDistribucion(tipo, neto);
  const reglaDesc = distribucion.map(d => `${d.fondo}: ${formatCLP(d.monto)}`).join(" | ");

  const ok = await agregarFila(CONFIG.sheets.ingresos, [
    fecha, tipo, descripcion, parseInt(montoBruto) || neto, neto, reglaDesc, notas || ""
  ]);
  if (!ok) { mostrarError("Error al guardar el ingreso."); return false; }

  // 2. Distribuir a fondos
  for (const d of distribucion) {
    await abonarFondo(d.fondo, d.monto);
  }

  mostrarExito(`Ingreso registrado ✓ — ${distribucion.length} fondos actualizados`);
  return true;
}
