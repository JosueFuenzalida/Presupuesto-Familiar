function setSyncStatus(estado) {
  const el = document.getElementById("sync-indicator");
  if (!el) return;
  switch(estado) {
    case "idle":
      el.innerHTML = `<span class="sync-dot ok" title="Sincronizado"></span>`;
      break;
    case "pending":
      el.innerHTML = `<span class="sync-dot pending" title="Cambios pendientes"></span>`;
      break;
    case "syncing":
      el.innerHTML = `<span class="sync-dot syncing" title="Guardando..."></span>`;
      break;
    case "error":
      el.innerHTML = `<span class="sync-dot error" title="Error — reintentando"></span>`;
      break;
  }
}

function forzarSync() {
  if (!STATE.dirty) { mostrarExito("Todo sincronizado ✓"); return; }
  if (saveTimer) clearTimeout(saveTimer);
  setSyncStatus("syncing");
  persistirEstado().then(ok => setSyncStatus(ok ? "idle" : "error"));
}
