/* 博多SKルーキーズ メンバー成績アプリ — Service Worker
 * Web Push 通知の受信と、通知タップ時のアプリ起動を担当する。 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "博多SKルーキーズ", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "博多SKルーキーズ";
  const options = {
    body: payload.body || "",
    icon: "/apple-icon.png",
    badge: "/apple-icon.png",
    tag: payload.tag || "skr-notify",
    renotify: true,
    data: { url: payload.url || "/stats" },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/stats";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // 既に開いているタブがあればフォーカス
      for (const client of clients) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
