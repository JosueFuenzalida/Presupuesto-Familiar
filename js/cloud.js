// ══ CLOUD ADAPTER — OneDrive via Microsoft Graph ═══════════════════════════
const GRAPH = "https://graph.microsoft.com/v1.0";

// ── Helpers HTTP ───────────────────────────────────────────────────────────
async function apiCall(method, url, body=null) {
  const token = await obtenerToken();
  if (!token) return null;
  const opts = {
    method,
    headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" }
  };
  if (body) opts.body = typeof body==="string" ? body : JSON.stringify(body);
  try {
    const r = await fetch(GRAPH + url, opts);
    if (!r.ok) {
      logSync(`API ${method} ${url} → ${r.status}`);
      return null;
    }
    return method==="DELETE" ? true : r.json();
  } catch(e) {
    logSync(`API error: ${e.message}`);
    return null;
  }
}

const apiGet   = url       => apiCall("GET",   url);
const apiPatch = (url,body)=> apiCall("PATCH", url, body);

// ── Config JSON ────────────────────────────────────────────────────────────
async function cargarConfig() {
  try {
    const token = await obtenerToken();
    const r = await fetch(`${GRAPH}/me/drive/root:/${CONFIG.configFile}:/content`, {
      headers: { Authorization:`Bearer ${token}` }
    });
    if (r.status === 404) {
      logSync("Config no encontrada — creando por defecto");
      const def = configDefault();
      await guardarConfig(def);
      return def;
    }
    if (!r.ok) return null;
    return r.json();
  } catch(e) {
    logSync(`cargarConfig error: ${e.message}`);
    return null;
  }
}

async function guardarConfig(data) {
  try {
    const token  = await obtenerToken();
    const json   = JSON.stringify(data, null, 2);
    const r = await fetch(`${GRAPH}/me/drive/root:/${CONFIG.configFile}:/content`, {
      method: "PUT",
      headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
      body: json
    });
    return r.ok;
  } catch(e) {
    logSync(`guardarConfig error: ${e.message}`);
    return false;
  }
}

// ── Movimientos Excel — tabla con rango explícito ──────────────────────────
let _gastosFileId = null;

async function buscarGastosFile() {
  if (_gastosFileId) return _gastosFileId;
  const data = await apiGet(`/me/drive/root:/${CONFIG.gastosFile}`);
  if (data?.id) { _gastosFileId = data.id; return _gastosFileId; }
  logSync("Archivo de gastos no encontrado");
  return null;
}

// Leer todos los movimientos desde Excel
async function leerMovimientos() {
  try {
    const id = await buscarGastosFile();
    if (!id) return [];

    // Usar tabla definida (más seguro que usedRange)
    let data = await apiGet(
      `/me/drive/items/${id}/workbook/worksheets/Movimientos/tables/TMovimientos/rows`
    );

    // Fallback a usedRange si no existe la tabla aún
    if (!data) {
      data = await apiGet(
        `/me/drive/items/${id}/workbook/worksheets/Movimientos/usedRange`
      );
      if (!data?.values || data.values.length < 2) return [];
      const headers = data.values[0];
      return data.values.slice(1)
        .filter(row => row.some(c=>c!==""))
        .map(row => {
          const obj = {};
          headers.forEach((h,i) => { obj[h] = row[i] ?? ""; });
          // Parsear distribucion JSON si existe
          if (obj.distribucion) {
            try { obj.distribucion = JSON.parse(obj.distribucion); } catch{}
          }
          if (obj.requisas) {
            try { obj.requisas = JSON.parse(obj.requisas); } catch{}
          }
          return obj;
        });
    }

    // Respuesta de tabla
    if (data.value) {
      return data.value
        .filter(r => r.values?.[0]?.some(c=>c!==""))
        .map(r => {
          const obj = {};
          EXCEL_COLS.forEach((h,i) => { obj[h] = r.values[0][i] ?? ""; });
          if (obj.distribucion) { try{obj.distribucion=JSON.parse(obj.distribucion);}catch{} }
          if (obj.requisas)     { try{obj.requisas=JSON.parse(obj.requisas);}catch{} }
          return obj;
        });
    }
    return [];
  } catch(e) {
    logSync(`leerMovimientos error: ${e.message}`);
    return [];
  }
}

// Agregar un movimiento al Excel
async function agregarMovimiento(mov) {
  try {
    const id = await buscarGastosFile();
    if (!id) return false;

    // Intentar agregar a tabla primero
    const fila = EXCEL_COLS.map(col => {
      const v = mov[col];
      if (v === null || v === undefined) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return v;
    });

    // Buscar última fila usada
    const rango = await apiGet(
      `/me/drive/items/${id}/workbook/worksheets/Movimientos/usedRange`
    );
    if (!rango) return false;

    const ultimaFila = rango.rowCount + 1;
    const colFin     = String.fromCharCode(64 + EXCEL_COLS.length);
    const r = await apiPatch(
      `/me/drive/items/${id}/workbook/worksheets/Movimientos/range(address='A${ultimaFila}:${colFin}${ultimaFila}')`,
      { values: [fila] }
    );
    return r !== null;
  } catch(e) {
    logSync(`agregarMovimiento error: ${e.message}`);
    return false;
  }
}

// Función de compatibilidad para el código existente
async function agregarGasto(valores) {
  // Wrapper para código heredado — convertir array al nuevo formato
  return agregarMovimiento(timestamped({
    id:          uid(),
    tipo:        OP.GASTO,
    fecha:       valores[0] || hoyFormato(),
    fondoNombre: valores[1] || "",
    itemNombre:  valores[2] || "",
    monto:       valores[3] || 0,
    descripcion: valores[2] || "",
    medioPago:   valores[4] || "",
    debitoNombre:valores[4]==="Débito"?valores[5]:"",
    tcNombre:    valores[4]==="TC"?valores[5]:"",
    cuotas:      valores[6] || "No",
    notas:       valores[7] || "",
    requisas:     valores[8] || ""
  }));
}

async function agregarIngreso(valores) {
  return agregarMovimiento(timestamped({
    id:          uid(),
    tipo:        OP.INGRESO,
    fecha:       valores[0] || hoyFormato(),
    fondoNombre: valores[1] || "",
    descripcion: valores[2] || "",
    monto:       valores[3] || 0,
    distribucion:valores[4] || "",
    notas:       valores[5] || ""
  }));
}

// marcarDirty — alias para compatibilidad con código existente
function marcarDirty() {
  STATE._dirty = true;
  setSyncStatus("pending");
  scheduleSave();
}
