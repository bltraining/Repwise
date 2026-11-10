// Repwise : cache de la coquille de l'appli uniquement.
// Les appels à Supabase, Stripe et aux fonctions /api ne sont jamais mis en cache.
// Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne.
const CACHE = "repwise-v11";
const SHELL = ["/", "/index.html", "/runtime-config.js", "/app.js", "/vendor/supabase-2.45.4.min.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, Stripe : réseau direct
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.netlify/")) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/index.html") : Response.error()))
      )
  );
});
