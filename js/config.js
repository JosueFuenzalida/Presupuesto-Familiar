const CONFIG = {
  clientId:    "645206e6-86a6-4523-b4c4-315ed72158aa",
  tenantId:    "d757f4c7-fbba-459e-9a62-b731aa74bd20",
  redirectUri: "https://josuefuenzalida.github.io/Presupuesto-Familiar/",
  scopes:      ["User.Read", "Files.ReadWrite"],
  configFile:  "presupuesto-config.json",
  gastosFile:  "presupuesto-gastos.xlsx",
  version:     "3.0.0"
};

// Estado global — fuente de verdad en memoria
const STATE = {
  tcs:          [],
  debitos:      [],
  fondos:       [],   // { id, nombre, pctPresupuesto, montoFijo, usarMonto, saldoActual, color, intocable, requisable, items:[] }
  tiposIngreso: [],   // { id, nombre, reglas:[ {fondoId, tipo:'%'|'$', valor} ] }
  requisas:     { modo: "proporcional", orden: [] },
  pagosAuto:    [],
  metas:        [],
  gastosFileId: null,
  configFileId: null,
  dirty:        false
};

// Helpers de ID únicos
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Config por defecto para primer uso
function configDefault() {
  const fondoIds = {
    vivienda:  uid(), alimentos: uid(), transporte: uid(),
    salud:     uid(), educacion:  uid(), entrete:    uid(),
    deudas:    uid(), ahorro:     uid(), varios:     uid()
  };
  const sueldo = uid();
  return {
    tcs: [],
    debitos: [],
    fondos: [
      { id: fondoIds.vivienda,  nombre:"Vivienda",        pctPresupuesto:30, montoFijo:0, usarMonto:false, saldoActual:0, color:"#4f8ef7", intocable:true,  requisable:false, items:[
        { id:uid(), nombre:"Arriendo",    pctDelFondo:70, presupuestado:false, montoPresupuesto:0, requisable:false },
        { id:uid(), nombre:"Servicios",   pctDelFondo:20, presupuestado:false, montoPresupuesto:0, requisable:false },
        { id:uid(), nombre:"Internet",    pctDelFondo:10, presupuestado:false, montoPresupuesto:0, requisable:false }
      ]},
      { id: fondoIds.alimentos, nombre:"Alimentación",    pctPresupuesto:20, montoFijo:0, usarMonto:false, saldoActual:0, color:"#2ecc71", intocable:false, requisable:true,  items:[
        { id:uid(), nombre:"Supermercado",pctDelFondo:60, presupuestado:false, montoPresupuesto:0, requisable:true  },
        { id:uid(), nombre:"Feria",       pctDelFondo:20, presupuestado:false, montoPresupuesto:0, requisable:true  },
        { id:uid(), nombre:"Delivery",    pctDelFondo:20, presupuestado:false, montoPresupuesto:0, requisable:true  }
      ]},
      { id: fondoIds.transporte,nombre:"Transporte",      pctPresupuesto:10, montoFijo:0, usarMonto:false, saldoActual:0, color:"#f39c12", intocable:false, requisable:true,  items:[
        { id:uid(), nombre:"Bencina",     pctDelFondo:50, presupuestado:false, montoPresupuesto:0, requisable:true  },
        { id:uid(), nombre:"TAG/Pasajes", pctDelFondo:50, presupuestado:false, montoPresupuesto:0, requisable:true  }
      ]},
      { id: fondoIds.salud,     nombre:"Salud",           pctPresupuesto:8,  montoFijo:0, usarMonto:false, saldoActual:0, color:"#e74c3c", intocable:true,  requisable:false, items:[
        { id:uid(), nombre:"Médico",      pctDelFondo:50, presupuestado:false, montoPresupuesto:0, requisable:false },
        { id:uid(), nombre:"Farmacia",    pctDelFondo:50, presupuestado:false, montoPresupuesto:0, requisable:false }
      ]},
      { id: fondoIds.educacion, nombre:"Educación",       pctPresupuesto:7,  montoFijo:0, usarMonto:false, saldoActual:0, color:"#9b59b6", intocable:true,  requisable:false, items:[] },
      { id: fondoIds.entrete,   nombre:"Entretenimiento", pctPresupuesto:10, montoFijo:0, usarMonto:false, saldoActual:0, color:"#1abc9c", intocable:false, requisable:true,  items:[
        { id:uid(), nombre:"Streaming",  pctDelFondo:30, presupuestado:false, montoPresupuesto:0, requisable:true  },
        { id:uid(), nombre:"Salidas",    pctDelFondo:70, presupuestado:false, montoPresupuesto:0, requisable:true  }
      ]},
      { id: fondoIds.deudas,    nombre:"Pago Deudas",     pctPresupuesto:10, montoFijo:0, usarMonto:false, saldoActual:0, color:"#e67e22", intocable:true,  requisable:false, items:[] },
      { id: fondoIds.ahorro,    nombre:"Ahorro",          pctPresupuesto:5,  montoFijo:0, usarMonto:false, saldoActual:0, color:"#27ae60", intocable:true,  requisable:false, items:[] },
      { id: fondoIds.varios,    nombre:"Varios",          pctPresupuesto:0,  montoFijo:0, usarMonto:false, saldoActual:0, color:"#7f8c8d", intocable:false, requisable:true,  items:[] }
    ],
    tiposIngreso: [
      { id: sueldo, nombre:"Sueldo", reglas:[
        { fondoId: fondoIds.vivienda,  tipo:"%", valor:30 },
        { fondoId: fondoIds.alimentos, tipo:"%", valor:20 },
        { fondoId: fondoIds.transporte,tipo:"%", valor:10 },
        { fondoId: fondoIds.salud,     tipo:"%", valor:8  },
        { fondoId: fondoIds.educacion, tipo:"%", valor:7  },
        { fondoId: fondoIds.entrete,   tipo:"%", valor:10 },
        { fondoId: fondoIds.deudas,    tipo:"%", valor:10 },
        { fondoId: fondoIds.ahorro,    tipo:"%", valor:5  }
      ]},
      { id: uid(), nombre:"Pololito / Freelance", reglas:[
        { fondoId: fondoIds.deudas, tipo:"%", valor:70 },
        { fondoId: fondoIds.ahorro, tipo:"%", valor:30 }
      ]},
      { id: uid(), nombre:"Bono", reglas:[
        { fondoId: fondoIds.deudas, tipo:"%", valor:100 }
      ]}
    ],
    requisas:  { modo:"proporcional", orden:[] },
    pagosAuto: [],
    metas:     []
  };
}
