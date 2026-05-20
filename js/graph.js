const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
let fileId = null;

async function graphGet(url) {
  const token = await obtenerToken();
  if (!token) return null;
  const r = await fetch(GRAPH_BASE + url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!r.ok) { console.error("Graph GET error:", url, r.status); return null; }
  return r.json();
}

async function graphPost(url, body) {
  const token = await obtenerToken();
  if (!token) return null;
  const r = await fetch(GRAPH_BASE + url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) { console.error("Graph POST error:", url, r.status); return null; }
  return r.json();
}

async function graphPatch(url, body) {
  const token = await obtenerToken();
  if (!token) return null;
  const r = await fetch(GRAPH_BASE + url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) { console.error("Graph PATCH error:", url, r.status); return null; }
  return r.json();
}

async function buscarArchivo() {
  if (fileId) return fileId;
  try {
    const data = await graphGet(`/me/drive/root:/${CONFIG.excelFileName}`);
    if (!data || !data.id) {
      mostrarError(`No se encontró "${CONFIG.excelFileName}" en la raíz de OneDrive.`);
      return null;
    }
    fileId = data.id;
    return fileId;
  } catch (e) {
    mostrarError("Error al acceder a OneDrive. Verifica los permisos.");
    return null;
  }

async function leerHoja(hoja) {
  try {
    const token = await obtenerToken();
    if (!token) return [];
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${CONFIG.excelFileName}:/workbook/worksheets/${encodeURIComponent(hoja)}/usedRange`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { console.error("leerHoja error:", hoja, r.status); return []; }
    const data = await r.json();
    if (!data.values || data.values.length < 3) return [];
    // Fila 0 = título, Fila 1 = headers, Fila 2+ = datos
    const headers = data.values[1];
    return data.values.slice(2).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ""; });
      return obj;
    });
  } catch(e) {
    console.error("leerHoja excepción:", hoja, e);
    return [];
  }
}

async function agregarFila(hoja, valores) {
  const id = await buscarArchivo();
  if (!id) return false;
  const result = await graphPost(
    `/me/drive/items/${id}/workbook/worksheets/${encodeURIComponent(hoja)}/tables`,
    null
  );
  // Agregar al final de la hoja usada
  const rango = await graphGet(`/me/drive/items/${id}/workbook/worksheets/${encodeURIComponent(hoja)}/usedRange`);
  if (!rango) return false;
  const ultimaFila = rango.rowCount + 1;
  const cols = valores.length;
  const colLetra = String.fromCharCode(64 + cols);
  const rangoDestino = `A${ultimaFila}:${colLetra}${ultimaFila}`;
  const r = await graphPatch(
    `/me/drive/items/${id}/workbook/worksheets/${encodeURIComponent(hoja)}/range(address='${rangoDestino}')`,
    { values: [valores] }
  );
  return r !== null;
}

async function actualizarCelda(hoja, celda, valor) {
  const id = await buscarArchivo();
  if (!id) return false;
  const r = await graphPatch(
    `/me/drive/items/${id}/workbook/worksheets/${encodeURIComponent(hoja)}/range(address='${celda}')`,
    { values: [[valor]] }
  );
  return r !== null;
}

async function actualizarRango(hoja, rango, valores) {
  const id = await buscarArchivo();
  if (!id) return false;
  const r = await graphPatch(
    `/me/drive/items/${id}/workbook/worksheets/${encodeURIComponent(hoja)}/range(address='${rango}')`,
    { values: valores }
  );
  return r !== null;
}
