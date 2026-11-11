const CACHE = 'repwise-cloudflare-preview-v1'
const SHELL = [
  '/', '/index.html', '/app.js', '/runtime-config.js', '/preview-mode.js',
  '/manifest.webmanifest', '/cgv.html', '/confidentialite.html',
  '/mentions-legales.html', '/legal/legal.css', '/icons/icon-192.png',
  '/icons/icon-512.png', '/icons/apple-touch-icon.png',
]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return
  event.respondWith(fetch(request).then(response => {
    if (response.ok && response.type === 'basic') caches.open(CACHE).then(cache => cache.put(request, response.clone()))
    return response
  }).catch(() => caches.match(request).then(hit => hit || (request.mode === 'navigate' ? caches.match('/index.html') : Response.error()))))
})
