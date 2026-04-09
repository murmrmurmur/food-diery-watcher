/* ══ sw-push.js — Web Push Service Worker ══
   위치: GitHub Pages 루트 (/food-diery-watcher/sw-push.js 아님 — 루트에!)
   즉, https://murmrmurmur.github.io/sw-push.js 로 접근 가능해야 함
*/

var APP_URL   = 'https://murmrmurmur.github.io/food-diery-watcher';
var FB_DB_URL = 'https://food-diary-watcher-default-rtdb.asia-southeast1.firebasedatabase.app';

/* ── 설치/활성화 ── */
self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(clients.claim()); });

/* ── 메시지 수신: 앱이 구독 정보 + roomId + side 전달 ── */
var myRoomId = null;
var mySide   = null;
var lastSeenTs = 0;

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'INIT') {
    myRoomId   = e.data.roomId;
    mySide     = e.data.side;
    lastSeenTs = e.data.ts || 0;
    startPolling();
  }
});

/* ── Firebase DB 폴링 (30초 간격) ── */
var pollTimer = null;
function startPolling() {
  if (pollTimer) return; // 이미 실행 중
  poll();
  pollTimer = setInterval(poll, 30000);
}

function poll() {
  if (!myRoomId || !mySide) return;
  var url = FB_DB_URL + '/rooms/' + myRoomId + '/pushQueue.json?orderBy="ts"&startAt=' + (lastSeenTs + 1);
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data) return;
      var msgs = Object.values(data).filter(function(m) {
        return m && m.to === mySide && m.ts > lastSeenTs;
      });
      msgs.sort(function(a, b) { return a.ts - b.ts; });
      msgs.forEach(function(m) {
        lastSeenTs = Math.max(lastSeenTs, m.ts);
        showPush(m.title || '식단 감시당하기', m.body || '');
      });
    })
    .catch(function(e) { console.warn('[SW] 폴링 오류:', e); });
}

function showPush(title, body) {
  /* 앱이 포그라운드에 열려 있으면 알림 생략 (앱 내 토스트로 충분) */
  return clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(function(list) {
      var appOpen = list.some(function(c) { return c.visibilityState === 'visible'; });
      if (appOpen) return; // 앱 열려있으면 SW 알림 안 띄움
      return self.registration.showNotification(title, {
        body:    body,
        icon:    APP_URL + '/icon-192.png',
        badge:   APP_URL + '/icon-192.png',
        vibrate: [200, 100, 200],
        data:    { url: APP_URL }
      });
    });
}

/* ── 알림 클릭 → 앱 포커스 ── */
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var c of list) {
        if (c.url.includes('food-diery-watcher') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(APP_URL);
    })
  );
});
