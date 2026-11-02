const {chromium,webkit,devices}=require('/workspace/wk/node_modules/playwright');
(async()=>{
 for(const eng of ['chromium','webkit']){
  const b=await (eng==='webkit'?webkit:chromium).launch(eng==='webkit'?{env:{...process.env,GIO_EXTRA_MODULES:'/workspace/wk/gio'}}:{});
  const ctx=await b.newContext(eng==='webkit'?{...devices['iPhone 15 Pro']}:{});
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('http://localhost:8140/index.html#1'); await pg.waitForFunction(()=>window.__eclassReady);
  const sw=await pg.evaluate(async()=>{ if(!navigator.serviceWorker) return 'no-sw-api'; const r=await navigator.serviceWorker.ready; await new Promise(r=>setTimeout(r,1500)); return !!r.active; });
  const tts=await pg.evaluate(()=>({api:'speechSynthesis' in window, btn:document.getElementById('ttsBtn').textContent}));
  await pg.evaluate(()=>location.hash='#2');
  await pg.click('#ttsBtn').catch(()=>{}); await pg.click('#startBtn'); await pg.waitForTimeout(800);
  let off='skipped';
  if(sw===true){ await ctx.setOffline(true); await pg.reload(); off=await pg.evaluate(()=>!!window.__eclassReady && document.querySelectorAll('.screen').length===4); await ctx.setOffline(false); }
  console.log(eng, JSON.stringify({sw,tts,offlineReload:off,errs}));
  await b.close();
 }
})();
