// Offline copy of the app suite's home screen (www.davyrockett.com/apps/).
// Each app keeps its own offline copy (its own sw.js); this one only covers the launcher and the icons.
// Uses the internet when it's there (so the page and its script always match after an update) and the
// saved copy when it isn't.
const CACHE = 'davyrockett-apps-v25';
const APPS = ['rundown', 'first-frets', 'page-fright', 'lip-service', 'jam-session', 'memory-lane', 'song-party', 'session-notes',
  'sos-band-editor', 'sos-band', 'ge150-presets', 'health-log', 'z4-log'];
const ASSETS = [
  './',
  './launcher.js',
  './apps.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './base.css',
  '../images/logo.png',
  '../images/figure.png',
  ...APPS.map((a) => `../${a}/icons/icon-192.png`),
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('davyrockett-apps-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  const key = request.mode === 'navigate' ? './' : request;
  // Pages always ask the server whether they changed (GitHub lets browsers reuse a page for 10 minutes,
  // which once left the screen on an old page after an update).
  const fresh = request.mode === 'navigate' ? fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(request);
  event.respondWith(
    fresh
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
        return res;
      })
      .catch(() => caches.match(key, { ignoreSearch: true }))
  );
});
