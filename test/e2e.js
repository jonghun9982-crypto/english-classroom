// E2E: node e2e.js <engine webkit|chromium> <width> <shots-prefix|-> [wide]
const {webkit,chromium,devices}=require('/workspace/wk/node_modules/playwright');
const ENG=process.argv[2]||'webkit', W=+(process.argv[3]||393), PFX=process.argv[4]||'-', WIDE=process.argv[5]==='wide';
const BASE=(process.env.BASE||'http://localhost:8140/')+'index.html?fast'+(process.env.SW?'':'&nosw');
const SHOTS='/workspace/english-classroom/shots/';
const PDF='/workspace/english-classroom/test/sample-article.pdf';
const WIDECSS='*{font-family:"DejaVu Sans","Noto Sans CJK KR",sans-serif!important}';
const res={ENG,W,WIDE,checks:[],overflow:{},taps:{},errors:[]};
const ok=(name,cond,extra)=>{res.checks.push((cond?'PASS ':'FAIL ')+name+(extra?' — '+extra:''));};
(async()=>{
  const b=await (ENG==='webkit'?webkit:chromium).launch(ENG==='webkit'?{env:{...process.env,GIO_EXTRA_MODULES:'/workspace/wk/gio'}}:{});
  const H={375:812,390:844,393:852,430:932}[W]||852;
  const opts=ENG==='webkit'?{...devices['iPhone 15 Pro'],viewport:{width:W,height:H}}:{viewport:{width:W,height:H},deviceScaleFactor:3,isMobile:true,hasTouch:true};
  const ctx=await b.newContext(opts);
  const pg=await ctx.newPage();
  pg.on('pageerror',e=>res.errors.push('PAGEERR '+e.message));
  pg.on('console',m=>{ if(m.type()==='error') res.errors.push('console: '+m.text()); });
  pg.on('requestfailed',r=>res.errors.push('REQFAIL '+r.url()));
  await pg.goto(BASE+'#1'); await pg.waitForFunction(()=>window.__eclassReady);
  await pg.evaluate(()=>window.__eclass.wipe()); await pg.reload(); await pg.waitForFunction(()=>window.__eclassReady);
  await pg.evaluate(()=>document.fonts.ready);
  if(WIDE) await pg.addStyleTag({content:WIDECSS});
  const shot=async n=>{ if(PFX!=='-'){ await pg.waitForTimeout(250); await pg.screenshot({path:SHOTS+PFX+'-'+n+'.png'}); } };
  const check=async tag=>{
    const r=await pg.evaluate(()=>{
      const out=[]; const vw=document.documentElement.clientWidth;
      if(document.documentElement.scrollWidth>vw+1) out.push('doc scrollWidth '+document.documentElement.scrollWidth);
      const scope=[...document.querySelectorAll('.screen.on *, header *, nav *, .sheet:not([hidden]) *')];
      for(const e of scope){
        const s=getComputedStyle(e); if(s.display==='none'||s.visibility==='hidden') continue;
        if(e.closest('.seats')) continue; // 좌석 바는 overflow:hidden 안에서 위치 지정
        const r=e.getBoundingClientRect(); if(!r.width) continue;
        if(r.right>vw+0.5||r.left<-0.5) out.push('outside '+e.tagName+'.'+e.className+' "'+(e.textContent||'').trim().slice(0,30)+'" '+Math.round(r.left)+'..'+Math.round(r.right));
        if((s.overflowX==='hidden'||s.overflowX==='auto'||s.overflowX==='scroll') && e.scrollWidth>e.clientWidth+1 && e.tagName!=='INPUT') out.push('xclip '+e.tagName+'.'+e.className+' '+e.scrollWidth+'>'+e.clientWidth);
      }
      // 좌석 바: 이름이 바깥으로 잘리는지
      document.querySelectorAll('.screen.on .seats .st').forEach(st=>{ const p=st.closest('.seats').getBoundingClientRect(); const r=st.querySelector('.av').getBoundingClientRect(); if(r.left<p.left-0.5||r.right>p.right+0.5) out.push('seat avatar clipped '+st.dataset.id); const n=st.querySelector('.nm').getBoundingClientRect(); if(n.left<p.left+2||n.right>p.right-2) out.push('seat name clipped '+st.dataset.id+' '+Math.round(n.left-p.left)+'/'+Math.round(p.right-n.right)); });
      const small=[]; document.querySelectorAll('.screen.on button, .screen.on a, nav a, .screen.on input:not([type=file])').forEach(e=>{ const r=e.getBoundingClientRect(); if(!r.width) return; const h=e.tagName==='INPUT'?e.closest('.field,.in').getBoundingClientRect().height:r.height; if(h<44-0.5||r.width<44-0.5) small.push((e.textContent||e.placeholder||'').trim().slice(0,14)+' '+Math.round(r.width)+'x'+Math.round(h)); });
      return {out,small};
    });
    res.overflow[tag]=r.out; res.taps[tag]=r.small;
  };
  // ① 예시 기사
  ok('example label shown', await pg.locator('.tag.ex',{hasText:'예시 기사 · 실제 뉴스 아님'}).isVisible());
  await pg.click('.wc[data-w="crowded"]');
  ok('word card saved', await pg.evaluate(()=>window.__eclass.store.data.words.some(w=>w.w==='crowded')));
  await check('1-example'); await shot('1');
  await pg.click('#seg button[data-lv=orig]'); await check('1-orig'); await pg.click('#seg button[data-lv=mid]');
  await pg.fill('#linkIn','https://www.example-news.com/2026/11/03/very-long-article-slug-with-many-words-that-could-overflow-the-input-on-small-iphones');
  await pg.click('#linkForm .pbtn');
  ok('link → scripted notice', (await pg.textContent('#notice1')).includes('준비 중'));
  await check('1-link');
  await pg.fill('#linkIn','');
  // ② 교실
  await pg.goto(BASE+'#2'); await pg.waitForFunction(()=>window.__eclassReady); if(WIDE) await pg.addStyleTag({content:WIDECSS});
  ok('classroom seats 5', (await pg.locator('#seatsBig .st').count())===5);
  ok('scripted note on classroom', (await pg.textContent('#s2')).includes('진짜 AI 토론은 곧'));
  await check('2'); await shot('2');
  await pg.click('#startBtn');
  // ③ 토론 — Q1
  await pg.waitForFunction(()=>{const s=window.__eclass.cur();return s&&s.awaiting;},null,{timeout:20000});
  const n1=await pg.locator('#chat .m').count();
  ok('Q1 teacher + classmates spoke before my turn', n1>=5, n1+' bubbles');
  await pg.evaluate(()=>{ window.__eclassHoldAt = window.__eclass.cur().messages.length+3; });
  await pg.fill('#replyIn','I am agree with Yuna, because cafe need more seats.');
  await pg.click('#sendBtn');
  await pg.waitForSelector('#chat .fix');
  ok('correction card', (await pg.textContent('#chat .fix p')).includes('I agree with Yuna, because cafés need more seats.'));
  ok('amber wavy marks (2)', (await pg.locator('#chat .m.me .oops').count())===2);
  const fixColor=await pg.$eval('#chat .fix .h',e=>getComputedStyle(e).color);
  ok('correction color amber', /201, 138, 18/.test(fixColor), fixColor);
  // 교정 + 반응 2줄 재생 후 캡처 (목업 3번 화면과 비슷한 순간)
  await pg.waitForFunction(()=>window.__eclass.cur().messages.length>=window.__eclassHoldAt);
  await pg.evaluate(()=>window.__eclass.cur()); await pg.waitForTimeout(150);
  const ellie=await pg.evaluate(()=>window.__eclass.cur().messages.filter(m=>m.who==='ellie').map(m=>m.text));
  ok('teacher follow-up to my reply', ellie.some(t=>t.includes('small note under your sentence')), ellie.slice(-1)[0]);
  await pg.evaluate(()=>{const c=document.getElementById('chat'); c.scrollTop=c.scrollHeight;});
  await check('3-fix'); await shot('3');
  await pg.evaluate(()=>{ window.__eclassHoldAt = null; });
  // 「다시 말해보기」
  await pg.click('#chat .fix [data-act=retry]');
  ok('retry prefills input', (await pg.inputValue('#replyIn')).includes('I am agree'));
  await pg.fill('#replyIn','I agree with Yuna, because cafés need more seats.'); await pg.click('#sendBtn');
  await pg.waitForFunction(()=>window.__eclass.cur().messages.some(m=>m.text&&m.text.startsWith('Much better')),null,{timeout:10000}).catch(()=>{});
  // Q2
  await pg.waitForFunction(()=>{const s=window.__eclass.cur();return s.q===1&&s.awaiting&&!s.queue.length;},null,{timeout:20000});
  { const ms=await pg.evaluate(()=>window.__eclass.cur().messages.map(m=>(m.who||m.kind)+': '+(m.text||'')));  ok('retry praised', ms.some(t=>t.includes('Much better')), ms.slice(9).join(' / ')); }
  await pg.fill('#replyIn','i think students lose the most because they can\'t study at home.'); await pg.click('#sendBtn');
  // Q3: 손들기로 끼어들기 (친구들이 말하는 중)
  await pg.waitForFunction(()=>{const s=window.__eclass.cur();return s.q===2 && !s.awaiting;},null,{timeout:20000});
  await pg.click('#handBtn');
  await pg.waitForFunction(()=>window.__eclass.cur().awaiting,null,{timeout:10000});
  ok('raise hand → teacher gives turn', (await pg.evaluate(()=>window.__eclass.cur().messages.slice(-1)[0].text)).includes('has a hand up'));
  await check('3-hand'); if(PFX!=='-') await pg.screenshot({path:SHOTS+PFX+'-3-hand.png'});
  await pg.fill('#replyIn','A time limit is okay, but only at busy hours.'); await pg.click('#sendBtn');
  await pg.waitForFunction(()=>window.__eclass.cur().done,null,{timeout:20000});
  ok('discussion finished', true);
  await check('3-end'); if(PFX!=='-') await pg.screenshot({path:SHOTS+PFX+'-3-end.png'});
  // ④ 노트
  await pg.click('nav a[href="#4"]');
  const note=await pg.evaluate(()=>window.__eclass.store.data.notes.slice(-1)[0]);
  ok('note: 2+ fixes', note.fixes.length>=2, note.fixes.map(f=>f.new).join(' | '));
  ok('note: expressions', note.expressions.includes('I agree')&&note.expressions.includes('because'), note.expressions.join(', '));
  ok('note: saved word', note.words.some(w=>w.w==='crowded'));
  await check('4'); await shot('4');
  await pg.click('#noteBody [data-act=save]');
  ok('note saved button', (await pg.textContent('#noteBody [data-act=save]')).includes('저장됨'));
  await check('4-saved'); if(PFX!=='-') await pg.screenshot({path:SHOTS+PFX+'-4-saved.png'});
  await pg.click('#noteBody [data-act=bank]'); await check('4-bank'); if(PFX!=='-') await pg.screenshot({path:SHOTS+PFX+'-4-wordbank.png'}); await pg.click('#sheetClose');
  // 새로고침 후 유지
  await pg.reload(); await pg.waitForFunction(()=>window.__eclassReady);
  const ls=await pg.evaluate(()=>{const d=JSON.parse(localStorage.getItem('eclass.v1'));return {keys:Object.keys(d),v:d.version,notes:d.notes.length,words:d.words.length,sessions:d.sessions.length,msgs:d.sessions[0].messages.length};});
  ok('localStorage eclass.v1 persisted', ls.v===1&&ls.notes===1&&ls.words===1&&ls.sessions===1, JSON.stringify(ls));
  // ① 진짜 PDF 업로드
  await pg.goto(BASE+'#1'); await pg.waitForFunction(()=>window.__eclassReady); if(WIDE) await pg.addStyleTag({content:WIDECSS});
  const [fc]=await Promise.all([pg.waitForEvent('filechooser'),pg.click('#pdfBtn')]);
  const t0=Date.now(); await fc.setFiles(PDF);
  await pg.waitForFunction(()=>/✓|못|없어요/.test(document.getElementById('notice1').textContent),null,{timeout:30000});
  const pdfMs=Date.now()-t0;
  const art=await pg.evaluate(()=>{const a=window.__eclass.store.article();return {title:a.title,sum:a.summary.mid,words:a.words.map(w=>w.w+(w.ko?'('+w.ko+')':'')),len:a.text.length,paras:a.text.split(/\n\n/).length,src:a.source};});
  ok('PDF parsed with pdf.js', art.src==='pdf'&&art.len>800, `${pdfMs}ms, ${art.len} chars, ${art.paras} paras`);
  ok('PDF title', art.title==='City Libraries Stay Open Until Midnight', art.title);
  ok('PDF summary = first sentences', art.sum[0]&&art.sum[0].startsWith('Public libraries'), art.sum.join(' / '));
  ok('PDF hard words', art.words.length>=4, art.words.join(', '));
  ok('PDF not labeled as example', !(await pg.locator('#artTags .tag.ex',{hasText:'예시 기사'}).count()));
  await check('1-pdf'); if(PFX!=='-') await pg.screenshot({path:SHOTS+PFX+'-1-pdf.png'});
  await pg.evaluate(()=>{const s=document.getElementById('s1'); s.scrollTop=s.scrollHeight;}); await check('1-pdf-words'); if(PFX!=='-') await pg.screenshot({path:SHOTS+PFX+'-1-pdf-words.png'});
  await pg.click('#origBtn'); await check('1-pdf-orig'); if(PFX!=='-') await pg.screenshot({path:SHOTS+PFX+'-1-pdf-original.png'}); await pg.click('#sheetClose');
  // PDF로 수업 시작 → 일반 질문 대본
  await pg.goto(BASE+'#2'); await pg.waitForFunction(()=>window.__eclassReady);
  await pg.click('#startBtn');
  await pg.waitForFunction(()=>{const s=window.__eclass.cur();return s&&s.awaiting;},null,{timeout:20000});
  await pg.fill('#replyIn','The article discuss about longer library hours.'); await pg.click('#sendBtn');
  await pg.waitForSelector('#chat .fix');
  ok('PDF class correction', (await pg.textContent('#chat .fix p')).includes('discuss longer'), await pg.textContent('#chat .fix p'));
  await pg.waitForFunction(()=>window.__eclass.cur().q===1 || window.__eclass.cur().messages.length>9,null,{timeout:20000});
  await check('3-pdf'); if(PFX!=='-') await pg.screenshot({path:SHOTS+PFX+'-3-pdf.png'});
  ok('no page errors', !res.errors.filter(e=>!/favicon/.test(e)).length, res.errors.join(' | '));
  const bad=Object.entries(res.overflow).filter(([k,v])=>v.length);
  ok('no horizontal overflow (all screens)', !bad.length, JSON.stringify(bad));
  const tapBad=Object.entries(res.taps).filter(([k,v])=>v.length);
  ok('tap targets ≥44px', !tapBad.length, JSON.stringify(tapBad));
  console.log(JSON.stringify(res,null,1));
  await b.close();
})().catch(e=>{console.log(JSON.stringify(res,null,1));console.error('FATAL',e);process.exit(1);});
