// Offline copy of the app suite's home screen (www.davyrockett.com/apps/).
// Each app keeps its own offline copy (its own sw.js); this one only covers the launcher and the icons.
// Shows the saved copy straight away and refreshes it in the background, so changes appear on the next open.
const CACHE = 'davyrockett-apps-v2';
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
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: true });
      const fresh = fetch(request).then((res) => {
        if (res.ok) cache.put(key, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
