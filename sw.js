const CACHE='sk-house-construction-stable-v23-11';
const APP_SHELL=['./','./index.html','./styles.css','./app.js','./cloud.js','./logo.jpg','./logo.svg','./logo_pdf_hd.png','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
const STATIC_EXTERNAL=[
 'cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
 'cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
 'cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];
self.addEventListener('install',e=>{e.waitUntil((async()=>{
 const c=await caches.open(CACHE);
 await c.addAll(APP_SHELL);
 await Promise.all(STATIC_EXTERNAL.map(async path=>{
 try{
 const u='https://'+path;
 const r=await fetch(u,{cache:'no-store'});
 if(r.ok)await c.put(u,r.clone());
 }catch(_e){}
 }));
 await self.skipWaiting();
})());});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET')return;
 if(u.origin===location.origin){
 // App files use network-first so deployments are picked up promptly;
 // if offline, the last known cached version remains available.
 e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
 if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}
 return r;
 }).catch(()=>caches.match(e.request)));
 return;
 }
 if(STATIC_EXTERNAL.some(path=>u.href.includes(path))){
 e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
 if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}
 return r;
 }).catch(()=>cached)));
 }
});
