# 💰 Presupuesto Familiar

App PWA de gestión de presupuesto personal, conectada a Excel en OneDrive vía Microsoft Graph API.

## Características

- 📊 Dashboard con métricas clave
- 💳 Gestión de tarjetas de crédito con semáforo de uso
- 📦 Fondos/cajas por categoría de gasto
- ➕ Registro de gastos y descuento automático de fondos
- 💵 Registro de ingresos con distribución automática según reglas
- 📉 Plan de pago de deuda (método bola de nieve)
- 🔗 Sincronización bidireccional con Excel en OneDrive
- 📱 Instalable como app en celular (PWA)

## Stack

- HTML + CSS + JavaScript vanilla
- MSAL.js (autenticación Microsoft)
- Chart.js (gráficos)
- Microsoft Graph API (Excel en OneDrive)
- GitHub Pages (hosting)

## Estructura

```
presupuesto-familiar/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   └── main.css
└── js/
    ├── config.js      ← credenciales Azure
    ├── auth.js        ← login Microsoft
    ├── graph.js       ← leer/escribir Excel
    ├── fondos.js      ← lógica de cajas
    ├── tarjetas.js    ← lógica TCs y débitos
    ├── gastos.js      ← registro de gastos
    ├── ingresos.js    ← registro e ingresos con reglas
    ├── deuda.js       ← proyección plan de pago
    ├── charts.js      ← gráficos
    └── app.js         ← orquestador principal
```

## Configuración

El archivo `js/config.js` contiene el `clientId` y `tenantId` de la app registrada en Azure.
El Excel `Presupuesto.xlsx` debe estar en la raíz de OneDrive.
