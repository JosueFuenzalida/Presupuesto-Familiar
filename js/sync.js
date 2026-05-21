// ══ SYNC — Cola de cambios pendientes ══════════════════════════════════════
// Guarda cambios localmente y los envía a Excel en background
// sin bloquear la interfaz.

const SYNC_KEY = "presupuesto_sync_queue";
let syncQueue  = JSON.parse(localStorage.getItem(SYNC_KEY) || "[]");
let syncTimer  = null;
let syncando   = false;

// ── Estado visual ──────────────────────────────────────────────────────────
function setSyncStatus(estado) {
  // estados: 'idle' | 'pending' | 'syncing' | 'error'
  const el = document.getElementById("sync-indicator");
  if (!el) return;
  const n = syncQueue.length;
  switch(estado) {
    case "idle":
      el.innerHTML = `<span class="sync-dot ok"></span>`;
      el.title = "Todo sincronizado";
      break;
    case "pending":
      el.innerHTML = `<span class="sync-dot pending"></span><span class="sync-count">${n}</span>`;
      el.title = `${n} cambio${n>1?"s":""} pendiente${n>1?"s":""}`;
      break;
    case "syncing":
      el.innerHTML = `<span class="sync-dot syncing"></span>`;
      el.title = "Sincronizando...";
      break;
    case "error":
      el.innerHTML = `<span class="sync-dot error"></span>`;
      el.title = "Error de sincronización — reintentando";
      break;
  }
}

// ── Encolar un cambio ──────────────────────────────────────────────────────
// tipo: 'celda' | 'fila'
// payload: { hoja, celda, valor } | { hoja, valores:[] }
function encolarCambio(tipo, payload) {
  const cambio = { id: Date.now() + Math.random(), tipo, payload, intentos: 0 };
  syncQueue.push(cambio);
  persistirQueue();
  setSyncStatus("pending");
  programarSync();
  return cambio.id;
}

function persistirQueue() {
  localStorage.setItem(SYNC_KEY, JSON.stringify(syncQueue));
}

// ── Programar sincronización (debounce 1.5s) ───────────────────────────────
function programarSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(procesarQueue, 1500);
}

// ── Procesar la cola ───────────────────────────────────────────────────────
async function procesarQueue() {
  if (syncando || syncQueue.length === 0) return;
  syncando = true;
  setSyncStatus("syncing");

  while (syncQueue.length > 0) {
    const cambio = syncQueue[0];
    try {
      let ok = false;
      if (cambio.tipo === "celda") {
        ok = await actualizarCelda(cambio.payload.hoja, cambio.payload.celda, cambio.payload.valor);
      } else if (cambio.tipo === "fila") {
        ok = await agregarFila(cambio.payload.hoja, cambio.payload.valores);
      }

      if (ok) {
        syncQueue.shift(); // sacar de la cola
        persistirQueue();
      } else {
        cambio.intentos++;
        if (cambio.intentos >= 3) {
          // Mover al final y continuar con el siguiente
          syncQueue.shift();
          syncQueue.push(cambio);
          persistirQueue();
          console.warn("Cambio fallido 3 veces, postergado:", cambio);
        }
        break; // esperar antes de reintentar
      }
    } catch(e) {
      console.error("Error procesando cambio:", e);
      cambio.intentos++;
      break;
    }
  }

  syncando = false;

  if (syncQueue.length > 0) {
    setSyncStatus("error");
    setTimeout(procesarQueue, 5000); // reintentar en 5s
  } else {
    setSyncStatus("idle");
  }
}

// ── Wrappers que usan la cola en vez de llamadas directas ─────────────────
function syncCelda(hoja, celda, valor) {
  // Actualizar en memoria ya ocurrió antes de llamar esto
  encolarCambio("celda", { hoja, celda, valor });
}

function syncFila(hoja, valores) {
  encolarCambio("fila", { hoja, valores });
}

// ── Al arrancar, intentar vaciar cola pendiente ────────────────────────────
function iniciarSync() {
  if (syncQueue.length > 0) {
    setSyncStatus("pending");
    programarSync();
  } else {
    setSyncStatus("idle");
  }
}

// ── Forzar sync manual (botón en topbar) ───────────────────────────────────
function forzarSync() {
  if (syncQueue.length === 0) { mostrarExito("Todo ya está sincronizado ✓"); return; }
  if (syncTimer) clearTimeout(syncTimer);
  procesarQueue();
}
