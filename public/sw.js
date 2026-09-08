self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  let data;
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = typeof data.title === "string" ? data.title.slice(0, 100) : "StockPulse";
  const body = typeof data.body === "string" ? data.body.slice(0, 500) : "새 알림이 있습니다.";
  event.waitUntil(self.registration.showNotification(title, { body, icon: "/icon.svg", tag: typeof data.eventId === "string" ? data.eventId : undefined, data: { url: "/app" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate("/app");
        return client.focus();
      }
    }
    return self.clients.openWindow("/app");
  }));
});
