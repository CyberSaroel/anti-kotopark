const VERSION = "1.6.1"; // это число будет менять tools/bumpVersion.js
const CACHE = "royal-socio-cats-" + VERSION;

// Ставим новую версию воркера сразу, не ждём закрытия вкладок
self.addEventListener("install", () => {
  self.skipWaiting();
});

// При активации удаляем все старые кэши
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
  })());
});

// «Сеть в первую очередь»: для кода всегда спрашиваем сервер,
// для картинок/звуков — обычный кэш; нет сети — берём из кэша.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isCode = req.mode === "navigate" || /\.(html|js|css|json)$/i.test(url.pathname);
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, isCode ? { cache: "no-cache" } : {});
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw e;
    }
  })());
});