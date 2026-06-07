// 5-Minute Dealer Coach — service worker
// Strategy:
//   - API calls: never intercepted
//   - Hashed build assets (/assets/*): cache-first (immutable, safe forever)
//   - Everything else (HTML, manifest, icons): NETWORK-FIRST with cache fallback,
//     so every deploy reaches every device on next launch. Cache is only used offline.
// Bumping CACHE_NAME purges all old caches on devices via the activate handler.
const CACHE_NAME = '5md-coach-v2'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Only handle same-origin GETs
  if (url.origin !== self.location.origin || e.request.method !== 'GET') return

  // Never intercept API calls
  if (url.pathname.includes('/ai-proxy') ||
      url.pathname.includes('/elevenlabs-proxy') ||
      url.pathname.includes('/dealer-sync')) {
    return
  }

  // Hashed build assets are immutable: cache-first
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // HTML, manifest, icons, everything else: network-first, cache only as offline fallback
  e.respondWith(
    fetch(e.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
      }
      return response
    }).catch(() =>
      caches.match(e.request).then(cached => {
        if (cached) return cached
        // Only fall back to the app shell for page navigations — never hand
        // HTML to an image/icon request (that's how broken icons happen)
        if (e.request.mode === 'navigate') return caches.match('/')
        return Response.error()
      })
    )
  )
})
