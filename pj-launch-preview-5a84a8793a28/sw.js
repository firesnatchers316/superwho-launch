/* SuperWho service worker for PJ's page.
   - push: shows a short, content-free notification; tapping opens the page
   - HTML and status.json are always fetched fresh (network first) */
const CACHE = 'superwho-pj-v1';
self.addEventListener('install', e => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/status.json')) { event.respondWith(fetch(req, { cache: 'no-store' })); return; }
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(self.registration.scope, copy)); }
      return res;
    }).catch(() => caches.match(self.registration.scope).then(r => r || Response.error())));
  }
});
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'SuperWho', {
    body: d.body || "There's an update on your SuperWho page.",
    icon: 'icons/icon-192.svg',
    badge: 'icons/icon-192.svg',
    tag: d.tag || 'superwho-pj',
    renotify: true,
    data: { url: d.url || self.registration.scope + '?src=push#where' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || self.registration.scope, self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope)) {
        return ('navigate' in c ? c.navigate(target).catch(() => c) : Promise.resolve(c)).then(w => (w || c).focus());
      }
    }
    return self.clients.openWindow(target);
  }));
});
