// ══ CONFIG v2 ══════════════════════════════════════════════════════════════
const CONFIG = {
  clientId:      "645206e6-86a6-4523-b4c4-315ed72158aa",
  tenantId:      "d757f4c7-fbba-459e-9a62-b731aa74bd20",
  redirectUri:   "https://josuefuenzalida.github.io/Presupuesto-Familiar/",
  scopes:        ["User.Read", "Files.ReadWrite"],
  configFile:    "presupuesto-config.json",
  gastosFile:    "presupuesto-gastos.xlsx",
  version:       "3.1.0",
  schemaVersion: 2,
  syncInterval:  20000
};

// ── Device ID ──────────────────────────────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem("pf_device_id");
  if (!id) {
    id = "dev_" + (crypto.randomUUID ? crypto.randomUUID().slice(0,8) : Math.random().toString(36).slice(2,10));
    localStorage.setItem("pf_device_id", id);
  }
  return id;
}
const DEVICE_ID = getDeviceId();

// ── Factories ──────────────────────────────────────────────────────────────
function uid() {
  return crypto.randomUUID ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}
function now() { return Date.now(); }
function timestamped(obj) {
  return { ...obj, createdAt: now(), updatedAt: now(), deviceId: DEVICE_ID };
}

// ── Tipos de operación ─────────────────────────────────────────────────────
const OP = {
  GASTO:"GASTO", INGRESO:"INGRESO", PAGO_TC:"PAGO_TC",
  AJUSTE_FONDO:"AJUSTE_FONDO", TRANSFERENCIA:"TRANSFERENCIA", REVERSA:"REVERSA",
  ADD_TC:"ADD_TC", UPDATE_TC:"UPDATE_TC", DELETE_TC:"DELETE_TC",
  ADD_DEBITO:"ADD_DEBITO", UPDATE_DEBITO:"UPDATE_DEBITO", DELETE_DEBITO:"DELETE_DEBITO",
  ADD_FONDO:"ADD_FONDO", UPDATE_FONDO:"UPDATE_FONDO", DELETE_FONDO:"DELETE_FONDO",
  ADD_ITEM:"ADD_ITEM", UPDATE_ITEM:"UPDATE_ITEM", DELETE_ITEM:"DELETE_ITEM",
  ADD_TIPO_INGRESO:"ADD_TIPO_INGRESO", UPDATE_TIPO_INGRESO:"UPDATE_TIPO_INGRESO",
  DELETE_TIPO_INGRESO:"DELETE_TIPO_INGRESO",
  UPDATE_REGLAS:"UPDATE_REGLAS", UPDATE_REQUISAS:"UPDATE_REQUISAS",
  ADD_PAGO_AUTO:"ADD_PAGO_AUTO", DELETE_PAGO_AUTO:"DELETE_PAGO_AUTO",
  CERRAR_DIA:"CERRAR_DIA"
};

// ── Estado en memoria — SIEMPRE derivado, NUNCA fuente de verdad ───────────
let STATE = {
  tcs:[], debitos:[], fondos:[], tiposIngreso:[],
  requisas:{ modo:"proporcional", orden:[] },
  pagosAuto:[], metas:[], movimientos:[],
  log:[], cartolas:[], proximaCartola:1,
  _saldosFondos:{}, _usadoTCs:{}, _saldosDebitos:{},
  _lastSync:null, _dirty:false, _online:navigator.onLine
};

// ── Columnas Excel (orden fijo, nunca cambiar) ─────────────────────────────
const EXCEL_COLS = [
  "id","fecha","tipo","monto","fondoId","fondoNombre",
  "itemId","itemNombre","tcNombre","debitoNombre",
  "descripcion","cuotas","notas","requisa",
  "createdAt","updatedAt","deviceId","reversaDeId"
];

// ── Config por defecto ─────────────────────────────────────────────────────
function configDefault() {
  const ids = {};
  ["vivienda","alimentos","transporte","salud","educacion",
   "entrete","deudas","ahorro","varios"].forEach(k => ids[k] = uid());
  const sueldo = uid();

  const mkFondo = (id, nombre, color, intocable, items=[]) => timestamped({
    id, nombre, color, intocable, requisable:!intocable,
    cuentaAsociada:"",
    items: items.map(it => timestamped({ id:uid(), ...it }))
  });

  return {
    schemaVersion:2,
    tcs:[], debitos:[],
    fondos:[
      mkFondo(ids.vivienda, "Vivienda","#4f8ef7",true,[
        {nombre:"Arriendo",   pctDelFondo:70,presupuestado:false,montoPresupuesto:0,requisable:false},
        {nombre:"Servicios",  pctDelFondo:20,presupuestado:false,montoPresupuesto:0,requisable:false},
        {nombre:"Internet",   pctDelFondo:10,presupuestado:false,montoPresupuesto:0,requisable:false}
      ]),
      mkFondo(ids.alimentos,"Alimentación","#2ecc71",false,[
        {nombre:"Supermercado",pctDelFondo:60,presupuestado:false,montoPresupuesto:0,requisable:true},
        {nombre:"Feria",       pctDelFondo:20,presupuestado:false,montoPresupuesto:0,requisable:true},
        {nombre:"Delivery",    pctDelFondo:20,presupuestado:false,montoPresupuesto:0,requisable:true}
      ]),
      mkFondo(ids.transporte,"Transporte","#f39c12",false,[
        {nombre:"Bencina",    pctDelFondo:50,presupuestado:false,montoPresupuesto:0,requisable:true},
        {nombre:"TAG/Pasajes",pctDelFondo:50,presupuestado:false,montoPresupuesto:0,requisable:true}
      ]),
      mkFondo(ids.salud,"Salud","#e74c3c",true,[
        {nombre:"Médico",  pctDelFondo:50,presupuestado:false,montoPresupuesto:0,requisable:false},
        {nombre:"Farmacia",pctDelFondo:50,presupuestado:false,montoPresupuesto:0,requisable:false}
      ]),
      mkFondo(ids.educacion,"Educación","#9b59b6",true,[]),
      mkFondo(ids.entrete,"Entretenimiento","#1abc9c",false,[
        {nombre:"Streaming",pctDelFondo:30,presupuestado:false,montoPresupuesto:0,requisable:true},
        {nombre:"Salidas",  pctDelFondo:70,presupuestado:false,montoPresupuesto:0,requisable:true}
      ]),
      mkFondo(ids.deudas,"Pago Deudas","#e67e22",true,[]),
      mkFondo(ids.ahorro,"Ahorro","#27ae60",true,[]),
      mkFondo(ids.varios,"Varios","#7f8c8d",false,[])
    ],
    tiposIngreso:[
      timestamped({id:sueldo,nombre:"Sueldo",reglas:[
        {fondoId:ids.vivienda, tipo:"%",valor:30},
        {fondoId:ids.alimentos,tipo:"%",valor:20},
        {fondoId:ids.transporte,tipo:"%",valor:10},
        {fondoId:ids.salud,    tipo:"%",valor:8 },
        {fondoId:ids.educacion,tipo:"%",valor:7 },
        {fondoId:ids.entrete,  tipo:"%",valor:10},
        {fondoId:ids.deudas,   tipo:"%",valor:10},
        {fondoId:ids.ahorro,   tipo:"%",valor:5 }
      ]}),
      timestamped({id:uid(),nombre:"Pololito / Freelance",reglas:[
        {fondoId:ids.deudas,tipo:"%",valor:70},
        {fondoId:ids.ahorro,tipo:"%",valor:30}
      ]}),
      timestamped({id:uid(),nombre:"Bono",reglas:[
        {fondoId:ids.deudas,tipo:"%",valor:100}
      ]})
    ],
    requisas:{modo:"proporcional",orden:[]},
    pagosAuto:[], metas:[], log:[], cartolas:[], proximaCartola:1
  };
}
