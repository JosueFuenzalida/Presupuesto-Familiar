// ══ UTILS — funciones compartidas ══════════════════════════════════════════

function hoyFormato() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function formatCLP(n) {
  return "$" + (parseInt(n)||0).toLocaleString("es-CL");
}

// Convierte nombre de fondo a clave compacta sin tildes ni espacios
function fondoKey(nombre) {
  return (nombre||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g,"")
    .replace(/[^a-zA-Z0-9]/g,"");
}

// Semáforo visual
function semaforo(pct) {
  if (pct >= 100) return "🔴";
  if (pct >= 80)  return "🟡";
  return "🟢";
}

function colorFondo(pct) {
  if (pct >= 100) return "var(--red)";
  if (pct >= 80)  return "var(--yellow)";
  return "var(--green)";
}

// Log entries para cartola
function logEntry(tipo, descripcion, monto, extra) {
  const entry = {
    id:          uid(),
    fecha:       hoyFormato() + " " + new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}),
    tipo,
    descripcion,
    monto,
    cartola:     0,
    ...extra
  };
  if (!STATE.log) STATE.log = [];
  STATE.log.unshift(entry);
  return entry;
}

// TC helpers
function pctUsoTC(tc) {
  if (!tc.cupo) return 0;
  return Math.min(100, Math.round(((tc.usado||0) / tc.cupo) * 100));
}

function estadoTC(pct) {
  if (pct >= 80) return { label:"URGENTE", color:"var(--red)",    icon:"🔴", cls:"urgente" };
  if (pct >= 40) return { label:"ALERTA",  color:"var(--yellow)", icon:"🟡", cls:"alerta"  };
  return           { label:"OK",      color:"var(--green)",  icon:"🟢", cls:"ok"      };
}

function diasParaFecha(dia) {
  if (!dia) return 999;
  const hoy  = new Date();
  const mes  = hoy.getMonth();
  const anio = hoy.getFullYear();
  let fecha  = new Date(anio, mes, dia);
  if (fecha < hoy) fecha = new Date(anio, mes+1, dia);
  return Math.ceil((fecha - hoy) / 86400000);
}

function estadoVencimiento(tc) {
  const diaV = tc.diaVencimiento || 0;
  const diaC = tc.diaCorte       || 0;
  if (!diaV) return null;
  const diasV = diasParaFecha(diaV);
  const diasC = diasParaFecha(diaC);
  if (diasV < 0)                return { label:`Vencida ${Math.abs(diasV)}d`,  cls:"venc-mora"   };
  if (diasV === 0)              return { label:"Vence HOY",                     cls:"venc-hoy"    };
  if (diasV <= 3)               return { label:`Vence en ${diasV}d`,            cls:"venc-hoy"    };
  if (diasC >= 0 && diasC <= 3) return { label:`Corte en ${diasC}d`,            cls:"venc-ok"     };
  if (diasC < 0  && diasV > 3)  return { label:`Período pago (${diasV}d)`,      cls:"venc-pronto" };
  return null;
}

// Distribución de ingresos
function calcularDistribucion(tipoIngresoId, monto) {
  const tipo = STATE.tiposIngreso.find(t => t.id === tipoIngresoId);
  if (!tipo || !monto) return [];
  return (tipo.reglas || []).map(r => {
    const fondo  = fondoById(r.fondoId);
    if (!fondo) return null;
    const montoF = r.tipo === "%" ? Math.round(monto * r.valor / 100) : (r.valor || 0);
    return { fondoId:r.fondoId, fondoNombre:fondo.nombre, tipo:r.tipo, valor:r.valor, monto:montoF };
  }).filter(Boolean).filter(r => r.monto > 0);
}

// Requisa interna (dentro del fondo)
function calcularRequisaInterna(fondo, itemId, sobregasto) {
  if (sobregasto <= 0) return [];
  const candidatos = (fondo.items||[]).filter(it =>
    it.id !== itemId && it.requisable && (it.saldoActual||0) > 0
  );
  return _distribuirRequisa(candidatos, sobregasto, "saldoActual");
}

// Requisa externa (entre fondos)
function calcularRequisaExterna(fondoId, sobregasto) {
  if (sobregasto <= 0) return [];
  const candidatos = STATE.fondos.filter(f =>
    f.id !== fondoId && f.requisable && (f.saldoActual||0) > 0
  );
  if (STATE.requisas.modo === "orden") {
    const orden = STATE.requisas.orden.length > 0
      ? STATE.requisas.orden : candidatos.map(f=>f.id);
    return _distribuirOrden(orden, sobregasto);
  }
  return _distribuirRequisa(candidatos, sobregasto, "saldoActual");
}

function _distribuirRequisa(candidatos, total, campoSaldo) {
  const totalDisp = candidatos.reduce((s,c)=>s+(c[campoSaldo]||0),0);
  if (totalDisp === 0) return [];
  let restante = total;
  return candidatos.map((c,i) => {
    const pct   = (c[campoSaldo]||0) / totalDisp;
    const monto = i === candidatos.length-1
      ? restante
      : Math.min(Math.round(total*pct), c[campoSaldo]||0);
    restante -= monto;
    return { id:c.id, nombre:c.nombre, monto:Math.max(0,monto) };
  }).filter(r=>r.monto>0);
}

function _distribuirOrden(orden, total) {
  let restante = total;
  const result = [];
  for (const id of orden) {
    if (restante <= 0) break;
    const f = fondoById(id);
    if (!f || !f.requisable || (f.saldoActual||0) <= 0) continue;
    const monto = Math.min(restante, f.saldoActual);
    result.push({ id, nombre:f.nombre, monto });
    restante -= monto;
  }
  return result;
}

function aplicarRequisaInterna(fondo, itemId, requisas) {
  for (const r of requisas) {
    const item = (fondo.items||[]).find(it=>it.id===r.id);
    if (item) item.saldoActual = (item.saldoActual||0) - r.monto;
  }
}

function aplicarRequisaExterna(requisas) {
  for (const r of requisas) {
    const f = fondoById(r.id);
    if (f) f.saldoActual = (f.saldoActual||0) - r.monto;
  }
}
