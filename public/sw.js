/* Luby AI — Web Push 서비스 워커 (알림 표시 + 클릭 시 이동). 오프라인 캐시는 하지 않는다. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "루비AI", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "루비AI";
  const options = {
    body: data.body || "",
    icon: "/icon.png",
    badge: "/symbol-128.png",
    tag: data.tag || data.link || "luby",
    renotify: false,
    data: { link: data.link || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.link) || "/dashboard";
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c && new URL(c.url).origin === self.location.origin) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
