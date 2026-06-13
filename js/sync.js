// ══ SYNC ENGINE ════════════════════════════════════════════════════════════
let _saveTimer   = null;
let _syncTimer   = null;
let _syncRunning = false;

function setSyncStatus(estado) {
  const el = document.getElementById("sync-indicator");
  if (!el) return;
  const map = {
    idle:    { dot:"ok",      title:"Sincronizado" },
    pending: { dot:"pending", title:"Cambios pendientes" },
    syncing: { dot:"syncing", title:"Sincronizando..." },
    offline: { dot:"offline", title:"Sin conexión" },
    error:   { dot:"error",   title:"Error — reintentando" }
  };
  const s = map[estado] || map.idle;
  el.innerHTML = `<span class="sync-dot ${s.dot}"></span>`;
  el.title = s.title;
}

function forzarSync() {
  if (!STATE._online) { mostrarError("Sin conexión"); return; }
  if (_saveTimer) clearTimeout(_saveTimer);
  ejecutarSync();
}

function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    if (STATE._online) ejecutarSync();
    else setSyncStatus("offline");
  }, 2000);
}

// ── Ciclo correcto: pull → merge pending → rebuild → push ─────────────────
async function ejecutarSync() {
  if (_syncRunning) return;
  _syncRunning = true;
  setSyncStatus("syncing");

  try {
    // 1. PULL config y movimientos del cloud
    const cloudConfig = await cargarConfig();
    if (!cloudConfig) throw new Error("No se pudo leer config del cloud");
    const cloudMovs = await leerMovimientos();

    // 2. OBTENER pending ops locales
    const pending = await pendingGetAll();

    // 3. SEPARAR pending en: movimientos financieros vs cambios de config
    const tiposMovimiento = [
      OP.GASTO, OP.INGRESO, OP.PAGO_TC,
      OP.AJUSTE_FONDO, OP.REVERSA, OP.TRANSFERENCIA
    ];
    const pendingMovs   = pending.filter(op => tiposMovimiento.includes(op.op));
    const pendingConfig = pending.filter(op => !tiposMovimiento.includes(op.op));

    // 4. COMBINAR movimientos cloud + pending locales
    // Los IDs únicos evitan duplicados si el Excel ya los tiene
    const cloudMovIds = new Set(cloudMovs.map(m => m.id));
    const movsPendientes = pendingMovs
      .filter(op => !cloudMovIds.has(op.id))
      .map(op => timestamped({ id:op.id, tipo:op.op, ...op.payload }));

    const todosMovs = [...cloudMovs, ...movsPendientes];

    // 5. REBUILD con todos los movimientos
    rebuildState(cloudConfig, todosMovs);

    // 6. APLICAR pending de config
    for (const op of pendingConfig) {
      _aplicarOpConfig(op.op, op.payload);
    }

    // 7. PUSH config actualizada al cloud
    const configActualizada = _configSnapshot();
    const ok = await guardarConfig(configActualizada);
    if (!ok) throw new Error("Error al guardar config");

    // 8. Marcar todos los pending como sincronizados
    for (const op of pending) {
      await pendingMarkSynced(op.id);
    }

    // 9. Guardar snapshot y cache local
    await snapshotSave({ config: configActualizada, movimientos: todosMovs });
    await cacheSet("lastConfig", configActualizada);
    await cacheSet("lastMovimientos", todosMovs);

    STATE._lastSync = now();
    STATE._dirty    = false;
    setSyncStatus("idle");
    logSync(`sync OK — cloud:${cloudMovs.length} + pending:${movsPendientes.length} movs`);

    // 10. Refrescar UI con datos actualizados
    renderDashboard();

  } catch(e) {
    console.error("Sync error:", e);
    setSyncStatus("error");
    setTimeout(() => { if (STATE._online) ejecutarSync(); }, 10000);
  } finally {
    _syncRunning = false;
  }
}

// ── Arranque offline ───────────────────────────────────────────────────────
async function arrancarOffline() {
  logSync("Arrancando offline...");
  const cached = await cacheGet("lastConfig");
  const movs   = await cacheGet("lastMovimientos");
  if (cached) {
    rebuildState(cached, movs || []);
    setSyncStatus("offline");
    mostrarError("Sin conexión — datos locales");
    return true;
  }
  const snap = await snapshotGetLatest();
  if (snap) {
    rebuildState(snap.config, snap.movimientos || []);
    setSyncStatus("offline");
    mostrarError("Sin conexión — último snapshot");
    return true;
  }
  return false;
}

// ── Autosync — solo si hay pendientes ────────────────────────────────────
function iniciarAutoSync() {
  if (_syncTimer) clearInterval(_syncTimer);
  _syncTimer = setInterval(async () => {
    if (!STATE._online || _syncRunning) return;
    const count = await pendingCount();
    if (count > 0) {
      logSync(`autosync — ${count} ops pendientes`);
      ejecutarSync();
    }
  }, CONFIG.syncInterval);
}

window.addEventListener("online", () => {
  STATE._online = true;
  setSyncStatus("pending");
  logSync("Conexión restaurada");
  ejecutarSync();
});
window.addEventListener("offline", () => {
  STATE._online = false;
  setSyncStatus("offline");
  logSync("Sin conexión");
});
