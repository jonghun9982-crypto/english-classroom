const {webkit,chromium,devices}=require('/workspace/wk/node_modules/playwright');
const URL0='https://jonghun9982-crypto.github.io/english-classroom/';
(async()=>{
 for(const name of ['webkit','chromium']){
  const b=await (name==='webkit'?webkit.launch({env:{...process.env,GIO_EXTRA_MODULES:'/workspace/wk/gio'}}):chromium.launch());
  const ctx=await b.newContext(name==='webkit'?{...devices['iPhone 15 Pro']}:{viewport:{width:375,height:812}});
  const p=await ctx.newPage(); const errs=[]; const bad=[];
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push(String(e)));
  p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url())});
  await p.goto(URL0,{waitUntil:'load'});
  const info=await p.evaluate(async()=>{const reg=await Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(()=>r(null),15000))]);
    if(!reg) return {reg:null};
    for(let i=0;i<30;i++){const ks=await caches.keys(); if(ks.length){const c=await caches.open(ks[0]); const k=(await c.keys()).map(r=>r.url); if(k.length>5) return {scope:reg.scope,script:reg.active&&reg.active.scriptURL,caches:ks,keys:k};} await new Promise(r=>setTimeout(r,500));}
    return {scope:reg.scope,script:reg.active&&reg.active.scriptURL,caches:await caches.keys(),keys:[]};});
  const manifest=await p.evaluate(async()=>{const h=document.querySelector('link[rel=manifest]').href; const m=await (await fetch(h)).json(); return {href:h,start:new URL(m.start_url,h).href,scope:new URL(m.scope,h).href,icons:m.icons.map(i=>new URL(i.src,h).href)};});
  let offline='skipped (WebKit offline reload unsupported in Playwright)';
  if(name==='chromium'){await ctx.setOffline(true); await p.reload({waitUntil:'load'}); offline=await p.evaluate(()=>!!document.querySelector('#s1')&&document.body.innerText.length>50?'reload offline OK':'FAIL'); await ctx.setOffline(false);}
  const outside=(info.keys||[]).filter(u=>u.startsWith('https://jonghun9982-crypto.github.io/')&&!u.startsWith(URL0));
  console.log(JSON.stringify({name,...info,outsideSubpath:outside,manifest,offline,errs,bad},null,1));
  await b.close();
 }
})();
