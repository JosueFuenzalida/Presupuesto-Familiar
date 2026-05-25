const CACHE = "presupuesto-v3";
const ASSETS = [
  "/Presupuesto-Familiar/",
  "/Presupuesto-Familiar/index.html",
  "/Presupuesto-Familiar/css/main.css",
  "/Presupuesto-Familiar/js/config.js",
  "/Presupuesto-Familiar/js/auth.js",
  "/Presupuesto-Familiar/js/sync.js",
  "/Presupuesto-Familiar/js/cloud.js",
  "/Presupuesto-Familiar/js/logica.js",
  "/Presupuesto-Familiar/js/gastos.js",
  "/Presupuesto-Familiar/js/ingresos.js",
  "/Presupuesto-Familiar/js/deuda.js",
  "/Presupuesto-Familiar/js/ajustes.js",
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
  if (e.request.url.includes("graph.microsoft.com") ||
      e.request.url.includes("login.microsoftonline.com") ||
      e.request.url.includes("msauth.net")) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
