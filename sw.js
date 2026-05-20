const CACHE = "presupuesto-v1";
const ASSETS = [
  "/Presupuesto-Familiar/",
  "/Presupuesto-Familiar/index.html",
  "/Presupuesto-Familiar/css/main.css",
  "/Presupuesto-Familiar/js/config.js",
  "/Presupuesto-Familiar/js/auth.js",
  "/Presupuesto-Familiar/js/graph.js",
  "/Presupuesto-Familiar/js/fondos.js",
  "/Presupuesto-Familiar/js/tarjetas.js",
  "/Presupuesto-Familiar/js/gastos.js",
  "/Presupuesto-Familiar/js/ingresos.js",
  "/Presupuesto-Familiar/js/deuda.js",
  "/Presupuesto-Familiar/js/charts.js",
  "/Presupuesto-Familiar/js/app.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Solo cachear assets propios, no las llamadas a Graph API
  if (e.request.url.includes("graph.microsoft.com") ||
      e.request.url.includes("login.microsoftonline.com")) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
