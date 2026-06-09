// ══ IndexedDB — cache local y pendingOps ═══════════════════════════════════
const DB_NAME    = "PresupuestoFamiliar";
const DB_VERSION = 1;
let _db = null;

function abrirDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      // Cache del último estado cloud válido
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }
      // Cola de operaciones pendientes de sync
      if (!db.objectStoreNames.contains("pendingOps")) {
        const store = db.createObjectStore("pendingOps", { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("synced",    "synced");
      }
      // Snapshots de backup (últimos 5)
      if (!db.objectStoreNames.contains("snapshots")) {
        const snap = db.createObjectStore("snapshots", { keyPath: "id", autoIncrement:true });
        snap.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => { console.error("IndexedDB error:", e); reject(e); };
  });
}

function dbTx(storeName, mode="readonly") {
  return _db.transaction([storeName], mode).objectStore(storeName);
}

// ── Cache ──────────────────────────────────────────────────────────────────
async function cacheSet(key, value) {
  await abrirDB();
  return new Promise((res,rej) => {
    const req = dbTx("cache","readwrite").put({ key, value, updatedAt: now() });
    req.onsuccess = () => res(true);
    req.onerror   = e  => rej(e);
  });
}

async function cacheGet(key) {
  await abrirDB();
  return new Promise((res,rej) => {
    const req = dbTx("cache").get(key);
    req.onsuccess = e => res(e.target.result?.value ?? null);
    req.onerror   = e => rej(e);
  });
}

// ── Pending Ops ────────────────────────────────────────────────────────────
async function pendingAdd(op) {
  await abrirDB();
  const entry = {
    id:        uid(),
    op:        op.type,
    payload:   op.payload,
    createdAt: now(),
    deviceId:  DEVICE_ID,
    synced:    false,
    intentos:  0
  };
  return new Promise((res,rej) => {
    const req = dbTx("pendingOps","readwrite").add(entry);
    req.onsuccess = () => res(entry);
    req.onerror   = e  => rej(e);
  });
}

async function pendingGetAll() {
  await abrirDB();
  return new Promise((res,rej) => {
    const req = dbTx("pendingOps").getAll();
    req.onsuccess = e => res(e.target.result.filter(o => !o.synced));
    req.onerror   = e => rej(e);
  });
}

async function pendingMarkSynced(id) {
  await abrirDB();
  return new Promise((res,rej) => {
    const store = dbTx("pendingOps","readwrite");
    const get   = store.get(id);
    get.onsuccess = e => {
      const record = e.target.result;
      if (!record) { res(false); return; }
      record.synced   = true;
      record.syncedAt = now();
      const put = dbTx("pendingOps","readwrite").put(record);
      put.onsuccess = () => res(true);
      put.onerror   = ev => rej(ev);
    };
    get.onerror = e => rej(e);
  });
}

async function pendingCount() {
  await abrirDB();
  return new Promise((res,rej) => {
    const req = dbTx("pendingOps").getAll();
    req.onsuccess = e => res(e.target.result.filter(o=>!o.synced).length);
    req.onerror   = e => rej(e);
  });
}

// ── Snapshots (backup de los últimos 5 estados) ────────────────────────────
async function snapshotSave(data) {
  await abrirDB();
  const store = dbTx("snapshots","readwrite");
  store.add({ data, createdAt: now() });
  // Mantener solo los últimos 5
  const all = await new Promise(res => {
    const r = dbTx("snapshots").getAll();
    r.onsuccess = e => res(e.target.result);
  });
  if (all.length > 5) {
    const oldest = all.sort((a,b)=>a.createdAt-b.createdAt).slice(0, all.length-5);
    const s2 = dbTx("snapshots","readwrite");
    oldest.forEach(o => s2.delete(o.id));
  }
}

async function snapshotGetLatest() {
  await abrirDB();
  return new Promise((res,rej) => {
    const req = dbTx("snapshots").getAll();
    req.onsuccess = e => {
      const all = e.target.result.sort((a,b)=>b.createdAt-a.createdAt);
      res(all[0]?.data ?? null);
    };
    req.onerror = e => rej(e);
  });
}
