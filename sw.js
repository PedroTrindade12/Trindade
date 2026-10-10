const CACHE = "trindade-v3-2026-10-10";
const ASSETS = [
  "./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png",
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/react-is@18/umd/react-is.production.min.js",
  "https://unpkg.com/prop-types@15/prop-types.min.js",
  "https://unpkg.com/recharts@2/umd/Recharts.js",
  "https://unpkg.com/tesseract.js@5/dist/tesseract.min.js",
  "https://unpkg.com/@babel/standalone@7/babel.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;

  // dados do Firebase: sempre da rede
  if (url.includes("firebaseio.com")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // a página do app (index.html / navegação): SEMPRE tenta a rede primeiro,
  // assim toda atualização subida no GitHub aparece na hora. Cache só se estiver offline.
  const isPage = e.request.mode === "navigate" || url.endsWith("/") || url.includes("index.html") || url.includes("manifest.json");
  if (isPage) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // bibliotecas e ícones: cache primeiro (não mudam), atualiza em segundo plano
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
