let tcsData = [];
let debitosData = [];

async function cargarTCs() {
  tcsData = await leerHoja(CONFIG.sheets.tcs) || [];
  return tcsData;
}

async function cargarDebitos() {
  debitosData = await leerHoja(CONFIG.sheets.debitos) || [];
  return debitosData;
}

function pctUsoTC(tc) {
  const cupo  = parseInt(tc["Cupo"])  || 0;
  const usado = parseInt(tc["Usado"]) || 0;
  if (cupo === 0) return 0;
  return Math.round((usado / cupo) * 100);
}

function estadoTC(pct) {
  if (pct >= 80) return { label:"URGENTE", color:"var(--red)",    icon:"🔴", cls:"urgente" };
  if (pct >= 40) return { label:"ALERTA",  color:"var(--yellow)", icon:"🟡", cls:"alerta"  };
  return           { label:"OK",      color:"var(--green)",  icon:"🟢", cls:"ok"      };
}

function diasParaFecha(dia) {
  const hoy = new Date();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();
  let fecha = new Date(anio, mes, dia);
  if (fecha < hoy) fecha = new Date(anio, mes + 1, dia);
  return Math.ceil((fecha - hoy) / (1000*60*60*24));
}

function estadoVencimiento(tc) {
  const diaVenc = parseInt(tc["F. Vencimiento"]) || 0;
  const diaCorte= parseInt(tc["F. Corte"]) || 0;
  if (!diaVenc) return null;
  const dias = diasParaFecha(diaVenc);
  if (dias < 0)  return { label:`Vencida (${Math.abs(dias)}d)`,    cls:"venc-vencida" };
  if (dias === 0)return { label:"Vence HOY",                        cls:"venc-hoy" };
  if (dias <= 3) return { label:`Vence en ${dias}d`,                cls:"venc-pronto" };
  return           { label:`Vence ${dias}d`,                        cls:"venc-ok" };
}

function totalDeuda()         { return tcsData.reduce((s,tc) => s + (parseInt(tc["Usado"])||0), 0); }
function totalCupo()          { return tcsData.reduce((s,tc) => s + (parseInt(tc["Cupo"])||0), 0); }
function totalDisponibleTC()  { return tcsData.reduce((s,tc) => s + Math.max(0,(parseInt(tc["Cupo"])||0)-(parseInt(tc["Usado"])||0)), 0); }
function totalMantencion()    { return tcsData.filter(tc=>tc["Activa"]==="SI").reduce((s,tc)=>s+(parseInt(tc["Mantención"])||0),0); }
function totalCaja()          { return debitosData.filter(d=>d["Activa"]==="SI").reduce((s,d)=>s+(parseInt(d["Saldo Actual"])||0),0); }

async function actualizarSaldoTC(nombre, nuevoUsado) {
  const idx = tcsData.findIndex(tc=>tc["Nombre"]===nombre);
  if (idx<0) return false;
  tcsData[idx]["Usado"] = nuevoUsado;
  return actualizarCelda(CONFIG.sheets.tcs, `D${idx+3}`, nuevoUsado);
}

async function actualizarSaldoDebito(nombre, nuevoSaldo) {
  const idx = debitosData.findIndex(d=>d["Nombre"]===nombre);
  if (idx<0) return false;
  debitosData[idx]["Saldo Actual"] = nuevoSaldo;
  return actualizarCelda(CONFIG.sheets.debitos, `C${idx+3}`, nuevoSaldo);
}
