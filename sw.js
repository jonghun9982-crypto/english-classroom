/* 오프라인 캐시: 앱 파일은 캐시 우선, 글꼴(CDN)은 받아본 뒤 캐시. 분석·추적 없음 */
const V = "eclass-v1-1";
const CORE = ["./","index.html","app.css","js/data.js","js/text.js","js/script.js","js/app.js","manifest.webmanifest","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png"];
const LAZY = ["vendor/pdfjs/pdf.min.mjs","vendor/pdfjs/pdf.worker.min.mjs"];
self.addEventListener("install", e=>{ e.waitUntil(caches.open(V).then(c=>c.addAll(CORE).then(()=>c.addAll(LAZY).catch(()=>{}))).then(()=>self.skipWaiting())); });
self.addEventListener("activate", e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch", e=>{
  const r = e.request; if(r.method!=="GET") return;
  const u = new URL(r.url);
  const sameOrigin = u.origin===location.origin;
  const font = /cdn\.jsdelivr\.net$/.test(u.hostname);
  if(!sameOrigin && !font) return;
  e.respondWith(caches.match(r, {ignoreSearch:sameOrigin}).then(hit=>{
    const net = fetch(r).then(res=>{ if(res && (res.ok || res.type==="opaque")){ const cl=res.clone(); caches.open(V).then(c=>c.put(r, cl)); } return res; });
    if(hit){ if(sameOrigin) net.catch(()=>{}); return hit; }   // 캐시 우선 + 뒤에서 새로 받기
    return net.catch(()=> sameOrigin && r.mode==="navigate" ? caches.match("index.html") : Response.error());
  }));
});
