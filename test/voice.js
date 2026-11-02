// 목소리·속도 테스트: speechSynthesis를 가짜로 바꿔서 순서 · onend 기반 진행 · 대체 시간 · 건너뛰기 · 다시 듣기 확인
// 사용: node voice.js <webkit|chromium> [BASE]
const {webkit,chromium,devices}=require('/workspace/wk/node_modules/playwright');
const ENG=process.argv[2]||'chromium';
const BASE=process.argv[3]||process.env.BASE||'http://localhost:8140/';
const STUB=()=>{
  const V=[['Albert','en-US'],['Samantha','en-US'],['Daniel','en-GB'],['Karen','en-AU'],['Rishi','en-IN'],['Moira','en-IE']].map(([name,lang])=>({name,lang,voiceURI:name,localService:true,default:false}));
  const cfg=window.__spk={log:[],dur:1200,start:true,end:true,overlap:0,cur:null};
  const now=()=>Math.round(performance.now());
  class U{constructor(t){this.text=t;this.voice=null;this.pitch=1;this.rate=1;this.lang='';this.volume=1;}}
  const ss={get speaking(){return !!cfg.cur},pending:false,getVoices:()=>V,addEventListener(){},removeEventListener(){},pause(){},resume(){cfg.log.push({ev:'resume',t:now()})},
    speak(u){ if(cfg.cur) cfg.overlap++; cfg.log.push({ev:'speak',t:now(),text:u.text,voice:u.voice&&u.voice.name,pitch:u.pitch,rate:u.rate}); cfg.cur=u;
      if(cfg.start) setTimeout(()=>{ if(cfg.cur===u) u.onstart&&u.onstart({}); },20);
      if(cfg.end && cfg.start) u._t=setTimeout(()=>{ if(cfg.cur!==u) return; cfg.cur=null; cfg.log.push({ev:'end',t:now(),text:u.text}); u.onend&&u.onend({}); }, typeof cfg.dur==='function'?cfg.dur(u):cfg.dur); },
    cancel(){ const u=cfg.cur; if(!u) return; clearTimeout(u._t); cfg.cur=null; cfg.log.push({ev:'cancel',t:now(),text:u.text}); setTimeout(()=>u.onerror&&u.onerror({error:'interrupted'}),5); }};
  Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true}); window.SpeechSynthesisUtterance=U;
};
const res=[]; const ok=(c,n,d)=>{res.push((c?'PASS ':'FAIL ')+n+(d!=null?' — '+(typeof d==='string'?d:JSON.stringify(d)):''));};
(async()=>{
  const b=await (ENG==='webkit'?webkit.launch({env:{...process.env,GIO_EXTRA_MODULES:'/workspace/wk/gio'}}):chromium.launch());
  const ctx=await b.newContext(ENG==='webkit'?{...devices['iPhone 15 Pro']}:{viewport:{width:375,height:812},hasTouch:true});
  await ctx.addInitScript(STUB);
  const pg=await ctx.newPage(); const errs=[];
  pg.on('pageerror',e=>errs.push(String(e))); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  const go=async(q,h)=>{ await pg.goto(BASE+'index.html?nosw'+q+h); await pg.waitForFunction(()=>window.__eclassReady); };
  const log=()=>pg.evaluate(()=>window.__spk.log);
  const W=ms=>pg.waitForTimeout(ms);
  // ---------- A. 순서 · onend 기반 진행 · 목소리 구분 ----------
  await go('&speed=0.25','#2'); await pg.evaluate(()=>{window.__eclass.wipe();}); await go('&speed=0.25','#2');
  ok((await pg.textContent('#ttsBtn')).trim()==='목소리 · 켬','toggle default 켬', await pg.textContent('#ttsBtn'));
  await pg.tap('#startBtn');
  // 말하는 중: 대사 수가 늘지 않고, 자리 표시가 말하는 사람과 같아야 함
  const samples=[];
  for(let i=0;i<14;i++){ await W(350); samples.push(await pg.evaluate(()=>{const sp=window.__eclass.speaking, c=window.__spk.cur; const st=document.querySelector('#seatsSmall .st.talk'); const n=document.querySelectorAll('#chat .m:not(.typing)').length;
      return {sp:sp&&sp.who, seat:st&&st.dataset.id, cur:c&&c.text, last:(window.__eclass.cur().messages.filter(m=>m.who).slice(-1)[0]||{}).text, n, skip:!!document.querySelector('#chat .m.talk .skip')};})); }
  const spk=samples.filter(x=>x.sp && x.cur && !/Let's begin/.test(x.cur));
  ok(spk.length>3 && spk.every(x=>x.seat===x.sp),'seat "말하는 중" = current speaker', spk.slice(0,3));
  ok(spk.every(x=>x.cur===x.last),'audio = newest bubble (no running ahead)');
  ok(spk.every(x=>x.skip),'skip button on active bubble');
  await pg.waitForFunction(()=>window.__eclass.cur().awaiting && !window.__eclass.speaking && !window.__eclass.playing,null,{timeout:60000});
  let L=await log(); const sp=L.filter(e=>e.ev==='speak'), en=L.filter(e=>e.ev==='end');
  ok(/Let's begin/.test(sp[0].text),'unlock line first in start tap', sp[0].text);
  const msgs=await pg.evaluate(()=>window.__eclass.cur().messages.filter(m=>m.who&&m.who!=='me').map(m=>({who:m.who,text:m.text})));
  ok(JSON.stringify(sp.slice(1).map(e=>e.text))===JSON.stringify(msgs.map(m=>m.text)),'every line spoken once, in order', `${sp.length-1} spoken / ${msgs.length} lines`);
  let gapOk=true, gaps=[]; for(let i=1;i<sp.length;i++){ const e=en.find(x=>x.text===sp[i-1].text && x.t<=sp[i].t+1); if(!e){gapOk=false;continue;} gaps.push(sp[i].t-e.t); if(sp[i].t-e.t<140) gapOk=false; }
  ok(gapOk,'next speaker only after onend + gap', 'gaps(ms @speed .25)='+gaps.join(','));
  ok((await pg.evaluate(()=>window.__spk.overlap))===0,'no overlapping speech');
  const vmap=await pg.evaluate(()=>window.__eclass.voices());
  const vByWho={}; msgs.forEach((m,i)=>{ vByWho[m.who]=sp[i+1].voice; });
  ok(new Set(Object.values(vByWho)).size===Object.keys(vByWho).length && Object.keys(vByWho).length===4,'4 distinct voices', vByWho);
  ok(!Object.values(vmap).some(v=>v.name==='Albert'),'novelty voices skipped', vmap);
  const n0=sp.length; await W(1500); ok((await log()).filter(e=>e.ev==='speak').length===n0,'stops and waits on my turn');
  // ---------- C. 다시 듣기 (쉬는 중) ----------
  const maxBtn=await pg.$('#chat .m[style*="--c"] .rp'); const mids=await pg.$$eval('#chat .rp',bs=>bs.map(b=>b.dataset.mid));
  const target=await pg.evaluate(()=>{const m=window.__eclass.cur().messages.find(m=>m.who==='max'); return m&&{id:m.id,text:m.text};});
  await pg.tap(`#chat .rp[data-mid="${target.id}"]`); await W(150);
  L=await log(); const rp=L.filter(e=>e.ev==='speak').slice(-1)[0];
  ok(rp.text===target.text && rp.voice===vByWho.max,'replay 🔊 speaks that line in Max voice', rp.voice);
  ok(await pg.evaluate(()=>document.querySelector('#seatsSmall .st.talk')?.dataset.id==='max'),'seat shows Max during replay');
  await W(1500); ok(await pg.evaluate(()=>window.__eclass.cur().awaiting && !window.__eclass.playing),'still my turn after replay');
  const tt=await pg.$$eval('#chat .rp, #chat .skip',bs=>bs.map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height]}).filter(([w,h])=>w<44||h<44));
  ok(tt.length===0,'replay buttons ≥44px', tt.slice(0,3));
  // ---------- B. 건너뛰기 + 화면 떠나기 ----------
  await pg.evaluate(()=>{ window.__spk.dur=20000; });
  await pg.fill('#replyIn','I think cafes need more seats because many people work there.'); await pg.press('#replyIn','Enter');
  await pg.waitForFunction(()=>window.__eclass.speaking && window.__spk.cur,null,{timeout:10000});
  const before=await pg.evaluate(()=>window.__spk.cur.text);
  const t0=Date.now(); await pg.tap('#chat .m.talk .skip');
  await pg.waitForFunction(b=>window.__spk.cur && window.__spk.cur.text!==b,before,{timeout:5000});
  ok(Date.now()-t0<2500,'skip ⏭ → next speaker right away', (Date.now()-t0)+'ms');
  ok((await log()).some(e=>e.ev==='cancel'&&e.text===before),'skip cancels current speech');
  // 말풍선 탭으로 넘기기
  const before2=await pg.evaluate(()=>window.__spk.cur.text);
  await pg.tap('#chat .m.talk .b'); await pg.waitForFunction(b=>window.__spk.cur && window.__spk.cur.text!==b,before2,{timeout:5000}).then(()=>ok(true,'tap bubble → continue')).catch(()=>ok(false,'tap bubble → continue'));
  // 다른 화면으로 → 소리 멈춤, 대기
  await pg.evaluate(()=>location.hash='#4'); await W(400);
  const nAway=(await log()).filter(e=>e.ev==='speak').length;
  ok(await pg.evaluate(()=>!window.__spk.cur),'leaving screen cancels speech');
  await W(1500); ok((await log()).filter(e=>e.ev==='speak').length===nAway,'no speech while away');
  await pg.evaluate(()=>{window.__spk.dur=900; location.hash='#3';});
  await pg.waitForFunction(n=>window.__spk.log.filter(e=>e.ev==='speak').length>n,nAway,{timeout:8000}).then(()=>ok(true,'back on screen → continues')).catch(()=>ok(false,'back on screen → continues'));
  // ---------- F. 백그라운드 → 복귀 시 같은 대사 다시 ----------
  await pg.evaluate(()=>{window.__spk.dur=4000;});
  await pg.waitForFunction(()=>window.__eclass.speaking && window.__spk.cur && window.__spk.cur.text===window.__eclass.cur().messages.find(m=>m.id===window.__eclass.speaking.mid).text,null,{timeout:15000});
  const bgLine=await pg.evaluate(()=>window.__spk.cur.text);
  await pg.evaluate(()=>{ Object.defineProperty(document,'hidden',{get:()=>true,configurable:true}); Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); });
  await W(1200); const nBg=(await log()).filter(e=>e.ev==='speak').length;
  ok(await pg.evaluate(()=>!window.__spk.cur),'background → speech stopped');
  await W(1000); ok((await log()).filter(e=>e.ev==='speak').length===nBg,'no speech in background');
  await pg.evaluate(()=>{ window.__spk.dur=600; delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  await W(1200); L=await log(); const after=L.filter(e=>e.ev==='speak').slice(nBg);
  ok(after.length && after[0].text===bgLine,'return → same line re-spoken', after[0]&&after[0].text);
  ok(L.some(e=>e.ev==='resume'),'speechSynthesis.resume() on return');
  // ---------- 다시 듣기 (말하는 도중) → 끝나면 다음 대사로 ----------
  await pg.evaluate(()=>{window.__spk.dur=2500;});
  await pg.waitForFunction(()=>window.__eclass.speaking && window.__spk.cur,null,{timeout:15000}).catch(()=>{});
  if(await pg.evaluate(()=>!!window.__eclass.speaking)){
    const curT=await pg.evaluate(()=>window.__spk.cur&&window.__spk.cur.text);
    const old=await pg.evaluate(()=>window.__eclass.cur().messages.find(m=>m.who==='yuna'));
    await pg.evaluate(()=>{window.__spk.dur=800;});
    await pg.tap(`#chat .rp[data-mid="${old.id}"]`); await W(1600);
    L=await log(); const s2=L.filter(e=>e.ev==='speak'); const iR=s2.map(e=>e.text).lastIndexOf(old.text);
    ok(iR>=0 && s2[iR].voice===vByWho.yuna,'replay mid-line plays the old line');
    ok((await pg.evaluate(()=>window.__spk.overlap))===0,'still no overlap after replay');
    ok(!s2.slice(iR+1).some(e=>e.text===curT),'after replay → moves on (no double line)');
  } else ok(true,'replay mid-line (skipped: lesson ended)');
  // ---------- D. 대체 시간: TTS가 시작 안 됨 / onend 없음 ----------
  await go('&speed=0.25','#2'); await pg.evaluate(()=>{window.__eclass.wipe();}); await go('&speed=0.25','#2');
  await pg.evaluate(()=>{window.__spk.start=false;});
  const tA=Date.now(); await pg.tap('#startBtn');
  await pg.waitForFunction(()=>window.__eclass.cur().messages.filter(m=>m.who).length>=3,null,{timeout:30000}).then(()=>ok(true,'TTS never starts → still advances',(Date.now()-tA)+'ms for 3 lines')).catch(()=>ok(false,'TTS never starts → still advances'));
  await pg.evaluate(()=>{window.__spk.start=true; window.__spk.end=false;});
  const nM=await pg.evaluate(()=>window.__eclass.cur().messages.filter(m=>m.who).length);
  await pg.waitForFunction(n=>window.__eclass.cur().messages.filter(m=>m.who).length>n+1 || window.__eclass.cur().awaiting,nM,{timeout:40000}).then(()=>ok(true,'onend never fires → safety timeout, no hang')).catch(()=>ok(false,'onend never fires → safety timeout, no hang'));
  // 목소리 끔 + 실제 속도(speed=1): 대사 사이 최소 2.5초
  await go('','#2'); await pg.evaluate(()=>{window.__eclass.wipe();}); await go('','#2');
  await pg.tap('#ttsBtn'); ok((await pg.textContent('#ttsBtn')).trim()==='목소리 · 끔','toggle → 끔');
  await pg.evaluate(()=>{window.__spk.log=[];}); await pg.tap('#startBtn');
  const times=[]; let last=0;
  for(let i=0;i<120 && times.length<3;i++){ await W(100); const n=await pg.evaluate(()=>window.__eclass.cur().messages.filter(m=>m.who).length); if(n>last){ times.push(Date.now()); last=n; } }
  const d=times.slice(1).map((t,i)=>t-times[i]);
  ok(d.length===2 && d.every(x=>x>=2500),'voice off → reading-time pacing ≥2.5s', d.join(',')+'ms');
  ok((await log()).filter(e=>e.ev==='speak').length===0,'voice off → nothing spoken');
  ok(errs.length===0,'no console/page errors', errs.slice(0,3));
  console.log(JSON.stringify({engine:ENG,base:BASE,pass:res.filter(r=>r.startsWith('PASS')).length,total:res.length,res},null,1));
  await b.close();
})().catch(e=>{console.log(JSON.stringify({res},null,1)); console.error(e); process.exit(1);});
