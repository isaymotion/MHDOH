// Offline cache. Bump CACHE whenever any file below changes so clients refresh.
const CACHE = 'mhpt-v1.0.0';
const FILES = [
  './', 'index.html', 'css/styles.css', 'js/app.js', 'js/store.js', 'js/router.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  ...['meta', 'sections', 'glossary', 'questions', 'lessons', 'flashcards', 'scenarios', 'paths', 'checklist', 'comparison'].map((n) => `data/${n}.json`),
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('index.html')))
  );
});
