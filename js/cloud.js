const GRAPH = "https://graph.microsoft.com/v1.0";

// ── Helpers HTTP ───────────────────────────────────────────────────────────
async function apiGet(url) {
  const token = await obtenerToken();
  if (!token) return null;
  const r = await fetch(GRAPH + url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) { console.error("GET", url, r.status); return null; }
  return r.json();
}

async function apiPut(url, body, contentType = "application/json") {
  const token = await obtenerToken();
  if (!token) return null;
  const r = await fetch(GRAPH + url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
  if (!r.ok) { console.error("PUT", url, r.status); return null; }
  return r.json();
}

async function apiPatch(url, body) {
  const token = await obtenerToken();
  if (!token) return null;
  const r = await fetch(GRAPH + url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) { console.error("PATCH", url, r.status); return null; }
  return r.json();
}

// ── Config JSON ────────────────────────────────────────────────────────────
async function cargarConfig() {
  try {
    const token = await obtenerToken();
    const r = await fetch(`${GRAPH}/me/drive/root:/${CONFIG.configFile}:/content`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.status === 404) {
      // Primera vez — crear config por defecto
      console.log("Config no encontrada, creando por defecto...");
      const defConfig = configDefault();
      await guardarConfig(defConfig);
      return defConfig;
    }
    if (!r.ok) return null;
    return r.json();
  } catch(e) {
    console.error("cargarConfig error:", e);
    return null;
  }
}

async function guardarConfig(data) {
  try {
    const token  = await obtenerToken();
    const json   = JSON.stringify(data, null, 2);
    const blob   = new Blob([json], { type: "application/json" });
    const buffer = await blob.arrayBuffer();
    const r = await fetch(`${GRAPH}/me/drive/root:/${CONFIG.configFile}:/content`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: buffer
    });
    if (!r.ok) { console.error("guardarConfig error:", r.status); return false; }
    STATE.dirty = false;
    setSyncStatus("idle");
    return true;
  } catch(e) {
    console.error("guardarConfig excepción:", e);
    return false;
  }
}

// Convierte STATE a objeto serializable y guarda
async function persistirEstado() {
  const data = {
    tcs:          STATE.tcs,
    debitos:      STATE.debitos,
    fondos:       STATE.fondos,
    tiposIngreso: STATE.tiposIngreso,
    requisas:     STATE.requisas,
    pagosAuto:    STATE.pagosAuto,
    metas:        STATE.metas
  };
  return guardarConfig(data);
}

// Marca estado como sucio y programa guardado
let saveTimer = null;
function marcarDirty() {
  STATE.dirty = true;
  setSyncStatus("pending");
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    setSyncStatus("syncing");
    const ok = await persistirEstado();
    setSyncStatus(ok ? "idle" : "error");
    if (!ok) setTimeout(() => { if (STATE.dirty) persistirEstado(); }, 8000);
  }, 2000);
}

// ── Gastos Excel ───────────────────────────────────────────────────────────
async function buscarGastosFile() {
  if (STATE.gastosFileId) return STATE.gastosFileId;
  const data = await apiGet(`/me/drive/root:/${CONFIG.gastosFile}`);
  if (data?.id) { STATE.gastosFileId = data.id; return data.id; }
  return null;
}

async function agregarGasto(valores) {
  // valores: [fecha, fondoNombre, itemNombre, monto, medioPago, cuenta, cuotas, notas, sobregasto]
  try {
    const id = await buscarGastosFile();
    if (!id) return false;
    const rango = await apiGet(`/me/drive/items/${id}/workbook/worksheets/Gastos/usedRange`);
    if (!rango) return false;
    const fila    = rango.rowCount + 1;
    const colFin  = String.fromCharCode(64 + valores.length);
    const r = await apiPatch(
      `/me/drive/items/${id}/workbook/worksheets/Gastos/range(address='A${fila}:${colFin}${fila}')`,
      { values: [valores] }
    );
    return r !== null;
  } catch(e) {
    console.error("agregarGasto error:", e);
    return false;
  }
}

async function agregarIngreso(valores) {
  try {
    const id = await buscarGastosFile();
    if (!id) return false;
    const rango = await apiGet(`/me/drive/items/${id}/workbook/worksheets/Ingresos/usedRange`);
    if (!rango) return false;
    const fila   = rango.rowCount + 1;
    const colFin = String.fromCharCode(64 + valores.length);
    const r = await apiPatch(
      `/me/drive/items/${id}/workbook/worksheets/Ingresos/range(address='A${fila}:${colFin}${fila}')`,
      { values: [valores] }
    );
    return r !== null;
  } catch(e) {
    console.error("agregarIngreso error:", e);
    return false;
  }
}

async function leerGastos() {
  try {
    const id = await buscarGastosFile();
    if (!id) return [];
    const data = await apiGet(`/me/drive/items/${id}/workbook/worksheets/Gastos/usedRange`);
    if (!data?.values || data.values.length < 2) return [];
    const headers = data.values[0];
    return data.values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
      return obj;
    });
  } catch(e) { return []; }
}

async function leerIngresos() {
  try {
    const id = await buscarGastosFile();
    if (!id) return [];
    const data = await apiGet(`/me/drive/items/${id}/workbook/worksheets/Ingresos/usedRange`);
    if (!data?.values || data.values.length < 2) return [];
    const headers = data.values[0];
    return data.values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
      return obj;
    });
  } catch(e) { return []; }
}
