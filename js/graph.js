const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
let fileId = null;

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

async function leerHoja(hoja) {
  try {
    const token = await obtenerToken();
    if (!token) return [];
    const url = `${GRAPH_BASE}/me/drive/root:/${CONFIG.excelFileName}:/workbook/worksheets/${encodeURIComponent(hoja)}/usedRange`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { console.error("leerHoja error:", hoja, r.status); return []; }
    const data = await r.json();
    if (!data.values || data.values.length < 3) return [];
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
  try {
    const token = await obtenerToken();
    if (!token) return false;
    const urlRango = `${GRAPH_BASE}/me/drive/root:/${CONFIG.excelFileName}:/workbook/worksheets/${encodeURIComponent(hoja)}/usedRange`;
    const r0 = await fetch(urlRango, { headers: { Authorization: `Bearer ${token}` } });
    const rango = await r0.json();
    if (!rango) return false;
    const ultimaFila = rango.rowCount + 1;
    const colLetra = String.fromCharCode(64 + valores.length);
    const rangoDestino = `A${ultimaFila}:${colLetra}${ultimaFila}`;
    const urlPatch = `${GRAPH_BASE}/me/drive/root:/${CONFIG.excelFileName}:/workbook/worksheets/${encodeURIComponent(hoja)}/range(address='${rangoDestino}')`;
    const r = await fetch(urlPatch, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [valores] })
    });
    return r.ok;
  } catch(e) {
    console.error("agregarFila excepción:", hoja, e);
    return false;
  }
}

async function actualizarCelda(hoja, celda, valor) {
  try {
    const token = await obtenerToken();
    if (!token) return false;
    const url = `${GRAPH_BASE}/me/drive/root:/${CONFIG.excelFileName}:/workbook/worksheets/${encodeURIComponent(hoja)}/range(address='${celda}')`;
    const r = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[valor]] })
    });
    return r.ok;
  } catch(e) {
    console.error("actualizarCelda excepción:", hoja, e);
    return false;
  }
}
