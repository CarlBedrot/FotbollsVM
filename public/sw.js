// App-shell service worker. Strategi per resurstyp:
//   /_next/static/* + media (woff2/png/svg) → cache-first. Hashade och
//     oföränderliga, så de laddas direkt från cache vid varje appstart —
//     det är den stora upplevda snabbheten i den installerade appen.
//   sidnavigeringar → network-first med offline-fallback till senast sedda
//     sida (eller en minimal offline-skärm). Online = alltid färskt.
//   allt annat (RSC-payloads, /api) → rakt till nätet, aldrig cachat, så
//     ställning och resultat aldrig serveras inaktuellt.
const CACHE = "vmt-v2";
const STATIC = /\/_next\/static\//;
const ASSET = /\.(?:woff2?|png|svg|ico|jpg|jpeg|webp)$/;

const OFFLINE_HTML = `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline – VM-tipset</title>
<style>html{background:#0f2b1f;color:#f2f0e4;font-family:-apple-system,sans-serif}
body{display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}
h1{font-size:20px;margin:0 0 8px}p{opacity:.7;margin:0}</style></head>
<body><div><h1>Ingen anslutning</h1><p>VM-tipset laddar igen när du är online.</p></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function putInCache(req, res) {
  // Only durable, complete responses belong in the cache.
  if (res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  return putInCache(req, await fetch(req));
}

async function networkFirst(req) {
  try {
    return putInCache(req, await fetch(req));
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  if (STATIC.test(url.pathname) || ASSET.test(url.pathname)) {
    e.respondWith(cacheFirst(req));
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req));
    return;
  }

  // RSC-payloads och övrigt: låt nätet svara, aldrig cachat.
});
