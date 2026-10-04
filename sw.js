// يحفظ واجهة التطبيق فقط — بيانات الأصناف دايماً لحظية من السيرفر ولا تُخزَّن
const CACHE = 'emdad-v3';
const SHELL = ['./', './index.html', './style.css?v=1', './app1.js?v=1', './app2.js?v=1', './app3.js?v=1', './app4.js?v=1', './logo.png', './icon-192.png', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
