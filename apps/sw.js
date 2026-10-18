// Offline copy of the app suite's home screen (www.davyrockett.com/apps/).
// Each app keeps its own offline copy (its own sw.js); this one only covers the launcher and the icons.
// Uses the internet when it's there (so the page and its script always match after an update) and the
// saved copy when it isn't.
const CACHE = 'davyrockett-apps-v3';
const APPS = ['first-frets', 'page-fright', 'lip-service', 'jam-session', 'memory-lane',
  'sos-band-editor', 'sos-band', 'ge150-presets', 'health-log', 'z4-log'];
const ASSETS = [
  './',
  './launcher.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  '../styles.css',
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
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
        return res;
      })
      .catch(() => caches.match(key, { ignoreSearch: true }))
  );
});
