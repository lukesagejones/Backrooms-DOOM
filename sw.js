/* Backrooms DOOM service worker: page loads go to the network first (so updates arrive as soon as the device is online), with the cached copy as the offline fallback. */
var CACHE = "bkdoom-v22";
var FILES = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
function fromNetwork(req) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error("timeout")); }, 4000);
    fetch(req.url, { cache: "no-cache" }).then(function (res) {   // revalidate with the server even if the host allows browser caching (GitHub Pages does)
      clearTimeout(timer);
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      resolve(res);
    }, function (err) { clearTimeout(timer); reject(err); });
  });
}
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var isPage = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") >= 0;
  if (isPage) {
    e.respondWith(fromNetwork(req).catch(function () { return caches.match(req).then(function (r) { return r || caches.match("index.html") || caches.match("./"); }); }));
  } else {
    e.respondWith(caches.match(req).then(function (r) { return r || fetch(req); }));
  }
});
