// ══ ENGINE — rebuildState() + dispatchOperation() ══════════════════════════
// Nunca mutar STATE directamente fuera de este archivo.

// ── rebuildState ───────────────────────────────────────────────────────────
// Toma config + movimientos y recalcula TODO desde cero.
// Determinista: mismos inputs → mismo output, siempre.
function rebuildState(config, movimientos) {
  if (!config) return;

  // 1. Cargar configuración
  STATE.tcs           = config.tcs           || [];
  STATE.debitos       = config.debitos       || [];
  STATE.fondos        = config.fondos        || [];
  STATE.tiposIngreso  = config.tiposIngreso  || [];
  STATE.requisas      = config.requisas      || { modo:"proporcional", orden:[] };
  STATE.pagosAuto     = config.pagosAuto     || [];
  STATE.metas         = config.metas         || [];
  STATE.log           = config.log           || [];
  STATE.cartolas      = config.cartolas      || [];
  STATE.proximaCartola= config.proximaCartola|| 1;
  STATE.movimientos   = movimientos          || [];

  // 2. Resetear saldos derivados
  STATE._saldosFondos  = {};
  STATE._usadoTCs      = {};
  STATE._saldosDebitos = {};

  // Inicializar todos en 0
  STATE.fondos.forEach(f  => { STATE._saldosFondos[f.id]       = 0; });
  STATE.tcs.forEach(tc    => { STATE._usadoTCs[tc.nombre]      = 0; });
  STATE.debitos.forEach(d => { STATE._saldosDebitos[d.nombre]  = 0; });

  // 3. Reproducir todos los movimientos en orden cronológico
  const movs = [...STATE.movimientos].sort((a,b) => (a.createdAt||0)-(b.createdAt||0));

  for (const m of movs) {
    switch(m.tipo) {

      case OP.INGRESO:
        // Distribuir a fondos según reglas del movimiento
        if (m.distribucion) {
          m.distribucion.forEach(d => {
            if (STATE._saldosFondos[d.fondoId] !== undefined)
              STATE._saldosFondos[d.fondoId] += d.monto;
          });
        }
        break;

      case OP.GASTO:
        // Descontar del fondo
        if (m.fondoId && STATE._saldosFondos[m.fondoId] !== undefined)
          STATE._saldosFondos[m.fondoId] -= m.monto;
        // Aumentar usado en TC si aplica
        if (m.tcNombre && STATE._usadoTCs[m.tcNombre] !== undefined)
          STATE._usadoTCs[m.tcNombre] += m.monto;
        // Descontar débito si aplica
        if (m.debitoNombre && STATE._saldosDebitos[m.debitoNombre] !== undefined)
          STATE._saldosDebitos[m.debitoNombre] -= m.monto;
        // Aplicar requisas si las hubo
        if (m.requisas) {
          m.requisas.forEach(r => {
            if (r.fondoId && STATE._saldosFondos[r.fondoId] !== undefined)
              STATE._saldosFondos[r.fondoId] -= r.monto;
          });
        }
        break;

      case OP.PAGO_TC:
        // Bajar usado de TC
        if (m.tcNombre && STATE._usadoTCs[m.tcNombre] !== undefined)
          STATE._usadoTCs[m.tcNombre] = Math.max(0, STATE._usadoTCs[m.tcNombre] - m.monto);
        // Bajar saldo débito
        if (m.debitoNombre && STATE._saldosDebitos[m.debitoNombre] !== undefined)
          STATE._saldosDebitos[m.debitoNombre] -= m.monto;
        // Bajar fondo de pago
        if (m.fondoId && STATE._saldosFondos[m.fondoId] !== undefined)
          STATE._saldosFondos[m.fondoId] -= m.monto;
        break;

      case OP.AJUSTE_FONDO:
        // Ajuste manual — delta directo
        if (m.fondoId && STATE._saldosFondos[m.fondoId] !== undefined)
          STATE._saldosFondos[m.fondoId] += m.delta || 0;
        break;

      case OP.REVERSA:
        // Reversa de un movimiento anterior
        const original = movs.find(o => o.id === m.reversaDeId);
        if (original) {
          // Aplicar el movimiento original en sentido contrario
          _aplicarReversa(original);
        }
        break;

      case OP.TRANSFERENCIA:
        // Mover entre fondos
        if (m.fondoOrigenId && STATE._saldosFondos[m.fondoOrigenId] !== undefined)
          STATE._saldosFondos[m.fondoOrigenId] -= m.monto;
        if (m.fondoDestinoId && STATE._saldosFondos[m.fondoDestinoId] !== undefined)
          STATE._saldosFondos[m.fondoDestinoId] += m.monto;
        break;
    }
  }

  // 4. Aplicar saldos derivados a los objetos de config
  STATE.fondos.forEach(f => {
    f.saldoActual = STATE._saldosFondos[f.id] || 0;
  });
  STATE.tcs.forEach(tc => {
    // Solo sobrescribir si hay movimientos — si no, respetar el valor del config
    if (STATE.movimientos.length > 0 || tc.usado === undefined)
      tc.usado = STATE._usadoTCs[tc.nombre] || 0;
  });
  STATE.debitos.forEach(d => {
    if (STATE.movimientos.length > 0 || d.saldo === undefined)
      d.saldo = STATE._saldosDebitos[d.nombre] || 0;
  });

  logSync(`rebuildState: ${movs.length} movimientos procesados`);
}

function _aplicarReversa(m) {
  switch(m.tipo) {
    case OP.GASTO:
      if (m.fondoId) STATE._saldosFondos[m.fondoId]      = (STATE._saldosFondos[m.fondoId]||0) + m.monto;
      if (m.tcNombre) STATE._usadoTCs[m.tcNombre]        = Math.max(0,(STATE._usadoTCs[m.tcNombre]||0)-m.monto);
      if (m.debitoNombre) STATE._saldosDebitos[m.debitoNombre] = (STATE._saldosDebitos[m.debitoNombre]||0)+m.monto;
      break;
    case OP.INGRESO:
      if (m.distribucion) m.distribucion.forEach(d => {
        if (STATE._saldosFondos[d.fondoId]!==undefined) STATE._saldosFondos[d.fondoId] -= d.monto;
      });
      break;
  }
}

// ── dispatchOperation ──────────────────────────────────────────────────────
// Punto de entrada único para TODA modificación de estado.
// Nunca llamar a mutaciones directas fuera de aquí.
async function dispatchOperation(type, payload) {
  const op = timestamped({ id: uid(), type, payload });

  logSync(`dispatch: ${type}`);

  // 1. Aplicar a config en memoria (optimistic update)
  _aplicarOpConfig(type, payload);

  // 2. Encolar en pendingOps (IndexedDB)
  await pendingAdd(op);

  // 3. Marcar estado como sucio
  STATE._dirty = true;
  setSyncStatus("pending");

  // 4. Si es movimiento financiero, agregarlo al array y recalcular
  const esMovimiento = [OP.GASTO,OP.INGRESO,OP.PAGO_TC,OP.AJUSTE_FONDO,OP.REVERSA,OP.TRANSFERENCIA].includes(type);
  if (esMovimiento) {
    const mov = timestamped({ id: op.id, tipo: type, ...payload });
    STATE.movimientos.push(mov);
    rebuildState(_configSnapshot(), STATE.movimientos);
  }

  // 5. Programar sync
  scheduleSave();

  return op.id;
}

// Snapshot de la config actual (sin saldos derivados)
function _configSnapshot() {
  return {
    schemaVersion:  CONFIG.schemaVersion,
    tcs:            STATE.tcs,
    debitos:        STATE.debitos,
    fondos:         STATE.fondos,
    tiposIngreso:   STATE.tiposIngreso,
    requisas:       STATE.requisas,
    pagosAuto:      STATE.pagosAuto,
    metas:          STATE.metas,
    log:            STATE.log,
    cartolas:       STATE.cartolas,
    proximaCartola: STATE.proximaCartola
  };
}

// Aplicar operaciones de config (no movimientos) directamente al STATE
function _aplicarOpConfig(type, payload) {
  switch(type) {
    // TCs
    case OP.ADD_TC:
      STATE.tcs.push(timestamped({ ...payload }));
      break;
    case OP.UPDATE_TC: {
      const i = STATE.tcs.findIndex(t=>t.nombre===payload.nombre||t.id===payload.id);
      if (i>=0) STATE.tcs[i] = { ...STATE.tcs[i], ...payload, updatedAt:now() };
      break;
    }
    case OP.DELETE_TC:
      STATE.tcs = STATE.tcs.filter(t=>t.nombre!==payload.nombre&&t.id!==payload.id);
      break;

    // Débitos
    case OP.ADD_DEBITO:
      STATE.debitos.push(timestamped({ ...payload }));
      break;
    case OP.UPDATE_DEBITO: {
      const i = STATE.debitos.findIndex(d=>d.nombre===payload.nombre||d.id===payload.id);
      if (i>=0) STATE.debitos[i] = { ...STATE.debitos[i], ...payload, updatedAt:now() };
      break;
    }
    case OP.DELETE_DEBITO:
      STATE.debitos = STATE.debitos.filter(d=>d.nombre!==payload.nombre&&d.id!==payload.id);
      break;

    // Fondos
    case OP.ADD_FONDO:
      STATE.fondos.push(timestamped({ id:uid(), items:[], ...payload }));
      break;
    case OP.UPDATE_FONDO: {
      const i = STATE.fondos.findIndex(f=>f.id===payload.id);
      if (i>=0) STATE.fondos[i] = { ...STATE.fondos[i], ...payload, updatedAt:now() };
      break;
    }
    case OP.DELETE_FONDO:
      STATE.fondos = STATE.fondos.filter(f=>f.id!==payload.id);
      break;

    // Items
    case OP.ADD_ITEM: {
      const f = STATE.fondos.find(f=>f.id===payload.fondoId);
      if (f) { if(!f.items)f.items=[]; f.items.push(timestamped({id:uid(),...payload.item})); }
      break;
    }
    case OP.UPDATE_ITEM: {
      const f = STATE.fondos.find(f=>f.id===payload.fondoId);
      if (f) { const i=f.items.findIndex(it=>it.id===payload.item.id);
        if(i>=0) f.items[i]={...f.items[i],...payload.item,updatedAt:now()}; }
      break;
    }
    case OP.DELETE_ITEM: {
      const f = STATE.fondos.find(f=>f.id===payload.fondoId);
      if (f) f.items = f.items.filter(it=>it.id!==payload.itemId);
      break;
    }

    // Tipos ingreso
    case OP.ADD_TIPO_INGRESO:
      STATE.tiposIngreso.push(timestamped({id:uid(),reglas:[],...payload}));
      break;
    case OP.UPDATE_TIPO_INGRESO: {
      const i = STATE.tiposIngreso.findIndex(t=>t.id===payload.id);
      if (i>=0) STATE.tiposIngreso[i]={...STATE.tiposIngreso[i],...payload,updatedAt:now()};
      break;
    }
    case OP.DELETE_TIPO_INGRESO:
      STATE.tiposIngreso = STATE.tiposIngreso.filter(t=>t.id!==payload.id);
      break;

    // Otros
    case OP.UPDATE_REQUISAS:
      STATE.requisas = { ...STATE.requisas, ...payload, updatedAt:now() };
      break;
    case OP.ADD_PAGO_AUTO:
      STATE.pagosAuto.push(timestamped({...payload}));
      break;
    case OP.DELETE_PAGO_AUTO:
      STATE.pagosAuto.splice(payload.idx, 1);
      break;
    case OP.CERRAR_DIA:
      STATE.cartolas.push(payload.cartola);
      STATE.proximaCartola++;
      STATE.log.forEach(e=>{ if(e.cartola===0) e.cartola=payload.cartola.numero; });
      break;
  }
}

// ── Helpers de acceso ──────────────────────────────────────────────────────
function fondoById(id)    { return STATE.fondos.find(f=>f.id===id); }
function fondoByNombre(n) { return STATE.fondos.find(f=>f.nombre===n); }

function totalDeuda()        { return STATE.tcs.reduce((s,tc)=>s+(tc.usado||0),0); }
function totalCupo()         { return STATE.tcs.reduce((s,tc)=>s+(tc.cupo||0),0); }
function totalDisponibleTC() { return STATE.tcs.reduce((s,tc)=>s+Math.max(0,(tc.cupo||0)-(tc.usado||0)),0); }
function totalMantencion()   { return STATE.tcs.filter(tc=>tc.activa!==false).reduce((s,tc)=>s+(tc.mantencion||0),0); }
function totalCaja()         { return STATE.debitos.filter(d=>d.activa!==false).reduce((s,d)=>s+(d.saldo||0),0); }

// ── Logger interno ─────────────────────────────────────────────────────────
function logSync(msg)      { console.log(`[SYNC] ${msg}`); }
function logConflict(msg)  { console.warn(`[CONFLICT] ${msg}`); }
function logOperation(msg) { console.log(`[OP] ${msg}`); }
