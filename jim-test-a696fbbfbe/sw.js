/* SuperWho workspace service worker (subpath-scoped). */
'use strict';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      data = { body: event.data ? event.data.text() : '' };
    } catch (e2) {
      data = {};
    }
  }
  var title = data.title || 'New message from your SuperWho team';
  var body = data.body || 'Open your workspace to read it.';
  var targetUrl = data.url || './?src=push#messages';
  var tag = data.tag || 'superwho-msg';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: tag,
      renotify: true,
      data: { url: targetUrl }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var rawUrl = (event.notification && event.notification.data && event.notification.data.url) || './?src=push#messages';
  var targetUrl = new URL(rawUrl, self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.registration.scope) === 0 && 'focus' in client) {
          client.postMessage({ type: 'superwho-push-open', url: targetUrl });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
