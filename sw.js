const VERSION = "0.31.0"; // это число будет менять tools/bumpVersion.js
const CACHE = "anti-kotopark-" + VERSION;

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

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  // Не перехватываем запросы расширений и прочих схем (chrome-extension:// и т.п.)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  const isCode = req.mode === "navigate" || /\.(html|js|css|json)$/i.test(url.pathname);
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, isCode ? { cache: "no-cache" } : {});
      // Кэширование — best effort: не ломаем ответ, если кэш не смог сохранить
      // (частичные ответы 206 Range, непрозрачные/кросс-доменные и т.п.).
      if (fresh.ok && fresh.status !== 206) {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(req, fresh.clone());
        } catch (e) {
          // Игнорируем ошибки кэша
        }
      }
      return fresh;
    } catch (e) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw e;
    }
  })());
});