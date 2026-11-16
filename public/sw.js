/* VAULT — Personal OS service worker.
   Caches the app shell so an installed VAULT opens offline; user data lives in
   localStorage / IndexedDB and is never touched here. */

const VERSION = 'vault-os-v1'
const SHELL = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION)
      await Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' }))))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'vault:skip-waiting') self.skipWaiting()
})

async function networkFirst(request) {
  const cache = await caches.open(VERSION)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const root = await cache.match('/')
    if (root) return root
    const offline = await cache.match('/offline.html')
    if (offline) return offline
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)
  return cached || (await network) || new Response('', { status: 504 })
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname === '/sw.js' || url.pathname === '/healthz') return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  event.respondWith(networkFirst(request))
})
