/* ══ sw-push.js — Web Push Service Worker ══
   Cloudflare Worker가 직접 Web Push를 전송하므로
   이 SW는 push 이벤트 수신 + 알림 표시만 담당
*/

const APP_URL = 'https://murmrmurmur.github.io/food-diery-watcher';

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

/* ── Push 수신 → 알림 표시 ── */
self.addEventListener('push', function(e) {
  let data = { title: '식단 감시당하기', body: '' };
  try { data = e.data.json(); } catch {}

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      /* 앱이 포그라운드에 열려 있으면 SW 알림 생략 */
      const appOpen = list.some(c => c.visibilityState === 'visible');
      if (appOpen) return;

      return self.registration.showNotification(data.title, {
        body:    data.body,
        icon:    APP_URL + '/icon-192.png',
        badge:   APP_URL + '/icon-192.png',
        vibrate: [200, 100, 200],
        data:    { url: APP_URL }
      });
    })
  );
});

/* ── 알림 클릭 → 앱 포커스 ── */
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (const c of list) {
        if (c.url.includes('food-diery-watcher') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(APP_URL);
    })
  );
});
