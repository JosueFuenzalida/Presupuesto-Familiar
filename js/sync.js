// ══ SYNC ENGINE — pull → rebuild → push ═══════════════════════════════════
let _saveTimer    = null;
let _syncTimer    = null;
let _syncRunning  = false;

// ── Indicador visual ───────────────────────────────────────────────────────
function setSyncStatus(estado) {
  const el = document.getElementById("sync-indicator");
  if (!el) return;
  const estados = {
    idle:     { dot:"ok",      title:"Sincronizado" },
    pending:  { dot:"pending", title:"Cambios pendientes" },
    syncing:  { dot:"syncing", title:"Sincronizando..." },
    offline:  { dot:"offline", title:"Sin conexión — cambios guardados localmente" },
    error:    { dot:"error",   title:"Error de sync — reintentando" }
  };
  const s = estados[estado] || estados.idle;
  el.innerHTML = `<span class="sync-dot ${s.dot}"></span>`;
  el.title = s.title;
}

function forzarSync() {
  if (!STATE._online) { mostrarError("Sin conexión — los cambios se guardarán al reconectar"); return; }
  if (_saveTimer) clearTimeout(_saveTimer);
  ejecutarSync();
}

// ── Programar guardado con debounce ───────────────────────────────────────
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    if (STATE._online) ejecutarSync();
    else setSyncStatus("offline");
  }, 2000);
}

// ── Ciclo de sync completo: pull → rebuild → aplicar pending → push ────────
async function ejecutarSync() {
  if (_syncRunning) return;
  _syncRunning = true;
  setSyncStatus("syncing");

  try {
    // 1. PULL — traer config actual del cloud
    const cloudConfig = await cargarConfig();
    if (!cloudConfig) throw new Error("No se pudo leer la configuración del cloud");

    // 2. PULL — traer movimientos del cloud
    const cloudMovs = await leerMovimientos();

    const pendingMovs = await pendingGetAll();
    const todosMovs = [
    ...cloudMovs,
    ...pendingMovs
    .filter(op => [OP.GASTO,OP.INGRESO,OP.PAGO_TC].includes(op.op))
    .map(op => timestamped({ id:op.id, tipo:op.op, ...op.payload }))
];
rebuildState(cloudConfig, todosMovs);

    // 3. REBUILD — recalcular todo desde cloud
    rebuildState(cloudConfig, cloudMovs);

    // 4. APLICAR PENDING OPS — operaciones locales pendientes
    const pending = await pendingGetAll();
    for (const op of pending) {
      _aplicarOpConfig(op.op, op.payload);
      await pendingMarkSynced(op.id);
      logSync(`pending aplicado: ${op.op}`);
    }

    // 5. PUSH — guardar config actualizada
    const configActualizada = _configSnapshot();
    const ok = await guardarConfig(configActualizada);
    if (!ok) throw new Error("Error al guardar config en cloud");

    // 6. GUARDAR SNAPSHOT LOCAL
    await snapshotSave({ config: configActualizada, movimientos: cloudMovs });
    await cacheSet("lastConfig", configActualizada);
    await cacheSet("lastMovimientos", cloudMovs);

    STATE._lastSync = now();
    STATE._dirty    = false;
    setSyncStatus("idle");
    logSync(`sync completo — ${pending.length} ops aplicadas`);

  } catch(e) {
    console.error("Sync error:", e);
    setSyncStatus("error");
    // Reintentar en 10s
    setTimeout(() => { if(STATE._online) ejecutarSync(); }, 10000);
  } finally {
    _syncRunning = false;
  }
}

// ── Arranque offline ───────────────────────────────────────────────────────
async function arrancarOffline() {
  logSync("Arrancando en modo offline...");
  // Intentar usar cache local
  const cached = await cacheGet("lastConfig");
  const movs   = await cacheGet("lastMovimientos");
  if (cached) {
    rebuildState(cached, movs || []);
    setSyncStatus("offline");
    mostrarError("Sin conexión — usando datos locales");
    return true;
  }
  // Intentar snapshot
  const snap = await snapshotGetLatest();
  if (snap) {
    rebuildState(snap.config, snap.movimientos || []);
    setSyncStatus("offline");
    mostrarError("Sin conexión — usando último snapshot");
    return true;
  }
  return false;
}

// ── Autosync cada 20s si hay pending ops ──────────────────────────────────
function iniciarAutoSync() {
  if (_syncTimer) clearInterval(_syncTimer);
  _syncTimer = setInterval(async () => {
    if (!STATE._online || _syncRunning) return;
    const count = await pendingCount();
    if (count > 0) ejecutarSync();
  }, CONFIG.syncInterval);
}

// ── Detectar online/offline ───────────────────────────────────────────────
window.addEventListener("online",  () => {
  STATE._online = true;
  setSyncStatus("pending");
  logSync("Conexión restaurada — sincronizando...");
  ejecutarSync();
});
window.addEventListener("offline", () => {
  STATE._online = false;
  setSyncStatus("offline");
  logSync("Sin conexión — modo offline activado");
});
