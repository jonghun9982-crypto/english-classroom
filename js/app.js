/* 앱 화면 · 흐름 */
(function(){
"use strict";
const EC = window.EC;
const $ = s => document.querySelector(s);
const esc = EC.esc;
const S = EC.store; S.load();
const D = () => S.data;
const params = new URLSearchParams(location.search);
const SPEED = params.has("fast") ? 0.04 : 1;          // 테스트용 빠른 재생 (?fast)
const sleep = ms => new Promise(r=>setTimeout(r, ms*SPEED));
const name = () => D().settings.name || "Jonghoon";

/* ---------------- 라우팅 ---------------- */
function route(){
  let n = (location.hash||"#1").slice(1);
  if(!/^[1-4]$/.test(n)) n = "1";
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("on", s.id==="s"+n));
  document.querySelectorAll("nav.tabs a").forEach(a=>a.classList.toggle("on", a.getAttribute("href")==="#"+n));
  const s = $("#s"+n);
  $("#title").textContent = s.dataset.title;
  $("#step").innerHTML = "<b>"+n+"</b> / 4 단계";
  closeSheet(); $("#toast").hidden = true;
  if(n==="1") renderS1();
  if(n==="2") renderS2();
  if(n==="3") renderS3();
  if(n==="4") renderS4();
}
addEventListener("hashchange", route);

/* ---------------- 공통 ---------------- */
let toastT;
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true, 2600); }
function openSheet(title, html){ $("#sheetTitle").textContent=title; $("#sheetBody").innerHTML=html; $("#sheet").hidden=false; $("#sheetBack").hidden=false; $("#sheetBody").scrollTop=0; }
function closeSheet(){ $("#sheet").hidden=true; $("#sheetBack").hidden=true; }
$("#sheetClose").onclick = closeSheet; $("#sheetBack").onclick = closeSheet;
function save(){ if(!S.save()) toast("저장 공간이 가득 찼어요 · 이번 내용은 이 화면에서만 보여요"); }
const paras = text => text.split(/\n{2,}/).map(p=>`<p lang="en">${esc(p)}</p>`).join("");
function underline(sentence, words){
  let h = esc(sentence);
  for(const w of words){
    const re = new RegExp("\\b("+w.w.replace(/[-]/g,"\\-")+")\\b","i");
    if(re.test(h)){ h = h.replace(re,"<u>$1</u>"); }
  }
  return h;
}

/* ---------------- ① 자료 넣기 ---------------- */
let level = "mid";
function renderS1(){
  const a = S.article();
  const tags = a.isExample
    ? `<span class="tag ex">예시 기사 · 실제 뉴스 아님</span>`+a.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")
    : `<span class="tag ex">내 PDF</span><span class="tag">${esc(a.fileName||"")}</span><span class="tag num">${a.pages||1}쪽</span>`;
  $("#artTags").innerHTML = tags;
  $("#artTitle").textContent = a.title; $("#artTitle").lang = "en";
  document.querySelectorAll("#seg button").forEach(b=>b.classList.toggle("on", b.dataset.lv===level));
  const box = $("#artSum");
  if(level==="orig"){
    box.outerHTML = `<ol class="sum" id="artSum"><li style="display:block"><div class="orig" lang="en">${esc(a.text)}</div></li></ol>`;
  } else {
    const list = (level==="easy" && a.summary.easy) ? a.summary.easy : a.summary.mid;
    let html = list.map((s,i)=>`<li><b>${String(i+1).padStart(2,"0")}</b><span lang="en">${a.isExample ? s : underline(s, a.words)}</span></li>`).join("");
    if(!a.isExample) html += `<li><span class="hint">${level==="easy" ? "쉬운 버전은 AI를 연결하면 만들어 드려요 · 지금은 원문 앞 문장이에요" : "요약 = 원문 앞쪽 문장 3개 (간이 방식)"}</span></li>`;
    box.outerHTML = `<ol class="sum" id="artSum">${html}</ol>`;
  }
  $("#artQ").textContent = a.question; $("#artQ").lang = "en";
  // 단어 카드
  const saved = new Set(D().words.map(w=>w.w));
  $("#words").classList.toggle("two", a.words.some(w=>w.w.length>10));
  $("#words").innerHTML = a.words.map(w=>`<button type="button" class="wc glass${saved.has(w.w)?" picked":""}" data-w="${esc(w.w)}" aria-pressed="${saved.has(w.w)}"><b lang="en">${esc(w.w)}</b><span>${esc(w.ko||"뜻은 AI 연결 후")}</span>${saved.has(w.w)?"<em>저장됨</em>":""}</button>`).join("")
    || `<p class="empty">어려운 단어를 찾지 못했어요.</p>`;
}
document.querySelector("#seg").addEventListener("click", e=>{ const b=e.target.closest("button"); if(!b) return; level=b.dataset.lv; renderS1(); });
$("#words").addEventListener("click", e=>{
  const c = e.target.closest(".wc"); if(!c) return;
  const a = S.article(); const w = a.words.find(x=>x.w===c.dataset.w); if(!w) return;
  const i = D().words.findIndex(x=>x.w===w.w);
  if(i>=0) D().words.splice(i,1); else D().words.push({w:w.w, ko:w.ko||"", articleId:a.id, savedAt:Date.now()});
  save(); renderS1();
});
$("#origBtn").onclick = ()=>{
  const a = S.article();
  const meta = a.isExample ? `<p class="meta">예시 기사 · 실제 뉴스 아님</p>` : `<p class="meta num">${esc(a.fileName||"")} · ${a.pages||1}쪽 · ${a.text.length.toLocaleString()}자${a.truncated?" · 앞 40쪽까지만":""}</p>`;
  openSheet(a.title, meta + paras(a.text));
  $("#sheetTitle").lang="en";
};
function notice(html, warn){ const n=$("#notice1"); n.innerHTML=html; n.classList.toggle("warn", !!warn); n.hidden=!html; }
$("#linkForm").addEventListener("submit", e=>{
  e.preventDefault();
  const v = $("#linkIn").value.trim();
  let ok = false; try{ const u = new URL(v); ok = /^https?:$/.test(u.protocol) && u.hostname.includes("."); }catch(_){}
  if(!ok){ notice("링크 모양이 아니에요. <b>https://</b>로 시작하는 주소를 붙여넣어 주세요.", true); return; }
  D().currentArticleId = EC.EXAMPLE_ARTICLE.id; save(); level="mid";
  notice("<b>링크 기사 가져오기는 준비 중이에요.</b> 다른 사이트의 글은 서버가 대신 가져와야 해서, 지금은 <b>예시 기사</b>로 수업해요. PDF는 지금도 진짜로 읽을 수 있어요.");
  $("#linkIn").blur(); renderS1();
});
$("#pdfBtn").onclick = ()=> $("#pdfIn").click();
$("#pdfIn").addEventListener("change", async e=>{
  const f = e.target.files && e.target.files[0]; e.target.value = "";
  if(!f) return;
  if(f.size > 30*1024*1024){ notice("파일이 너무 커요 (30MB까지). 더 작은 PDF를 골라 주세요.", true); return; }
  if(!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)){ notice("PDF 파일만 열 수 있어요.", true); return; }
  $("#pdfBtn").disabled = true;
  notice(`<span class="spin"></span>PDF 여는 중…`);
  try{
    const r = await EC.extractPdf(f, (i,n)=> notice(`<span class="spin"></span>글자 꺼내는 중… <span class="num">${i} / ${n}</span>쪽`));
    const text = EC.linesToText(r.pages);
    const words = (text.match(/[A-Za-z]{2,}/g)||[]).length;
    if(words < 30){ notice("이 PDF에서 영어 글자를 거의 찾지 못했어요. 사진(스캔)으로 만든 PDF는 아직 읽을 수 없어요.", true); return; }
    const title = EC.guessTitle(text, r.meta, f.name);
    const hard = EC.hardWords(text, 6);
    let summary = EC.summarize(text, title, 3);
    if(!summary.length) summary = [text.slice(0,180)+"…"];
    const art = { id:EC.uid("pdf"), source:"pdf", isExample:false, title, tags:["#내 PDF"], text, summary:{mid:summary},
      question:EC.GENERIC_QUESTIONS[1], questions:EC.GENERIC_QUESTIONS.slice(), words:hard,
      fileName:f.name, pages:r.numPages, truncated:r.truncatedPages, createdAt:Date.now() };
    D().articles.push(art);
    // 오래된 PDF는 최근 10개만 유지
    const pdfs = D().articles.filter(a=>a.source==="pdf");
    if(pdfs.length>10) D().articles = D().articles.filter(a=>a.source!=="pdf" || pdfs.slice(-10).includes(a));
    D().currentArticleId = art.id; level="mid"; save();
    notice(`✓ <b>${esc(f.name)}</b>에서 <span class="num">${text.length.toLocaleString()}</span>자를 꺼냈어요. 요약은 앞 문장 3개, 단어는 길고 드문 단어로 골랐어요 (간이 방식).`);
    renderS1();
  }catch(err){
    console.error(err);
    const msg = err && err.name==="PasswordException" ? "비밀번호가 걸린 PDF는 아직 열 수 없어요."
      : err && err.name==="InvalidPDFException" ? "PDF 파일이 손상됐거나 PDF가 아니에요."
      : "PDF를 읽지 못했어요. 다른 파일로 다시 해 볼까요?";
    notice(msg, true);
  }finally{ $("#pdfBtn").disabled = false; }
});

/* ---------------- 좌석 ---------------- */
const ORDER = ["leo","max","ellie","yuna","me"];
function seatsHTML(big, talk, hand){
  const X = big ? [12,27,50,73,88] : [11,29.5,50,70.5,89];
  const Y = big ? [88,44,14,44,88] : [22,10,10,10,22];
  return (big?'<div class="tbl"></div>':'') + ORDER.map((id,i)=>{
    const c = EC.CAST[id]; const isT = id===talk;
    const top = !big && isT ? 4 : Y[i];
    const nm = big ? c.name : c.short;
    return `<div class="st${isT?" talk":""}${isT&&id==="me"?" turn":""}${hand&&id==="me"?" hand":""}" data-id="${id}" style="--c:${c.color};left:${X[i]}%;top:${top}px"><div class="av" aria-hidden="true">${c.emoji}</div><span class="nm">${esc(nm)}</span></div>`;
  }).join("");
}

/* ---------------- ② 교실 입장 ---------------- */
const tts = { ok: "speechSynthesis" in window && typeof SpeechSynthesisUtterance!=="undefined", unlocked:false, voice:null };
function pickVoice(){
  if(!tts.ok) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find(v=>/en-US/i.test(v.lang) && /Samantha|Ava|Allison|Susan|Google US/i.test(v.name)) || vs.find(v=>/^en[-_]US/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null;
}
if(tts.ok){ try{ speechSynthesis.onvoiceschanged = ()=>{ tts.voice = pickVoice(); }; }catch(e){} }
function speak(text){
  return new Promise(res=>{
    if(!tts.ok || !tts.unlocked || !D().settings.tts) return res(false);
    try{
      const u = new SpeechSynthesisUtterance(text);
      tts.voice = tts.voice || pickVoice(); if(tts.voice) u.voice = tts.voice;
      u.lang = "en-US"; u.rate = 0.95;
      const t = setTimeout(()=>res(true), 15000);
      u.onend = u.onerror = ()=>{ clearTimeout(t); res(true); };
      speechSynthesis.speak(u);
    }catch(e){ res(false); }
  });
}
function welcomeText(a){
  return a.isExample ? `Welcome, ${name()}! Today we'll talk about cafés and laptop limits. Max, Yuna, Leo — say hi!`
    : `Welcome, ${name()}! Today we'll talk about "${a.title}". Max, Yuna, Leo — say hi!`;
}
function activeSession(){
  const a = S.article();
  const ss = D().sessions.filter(s=>s.articleId===a.id);
  return ss.length ? ss[ss.length-1] : null;
}
function renderS2(){
  const a = S.article();
  $("#seatsBig").innerHTML = seatsHTML(true, "ellie");
  $("#welcome").textContent = welcomeText(a); $("#welcome").lang="en";
  $("#cast").innerHTML = ["max","yuna","leo"].map(id=>{ const c=EC.CAST[id];
    return `<li class="glass" style="--c:${c.color}"><div class="av" aria-hidden="true">${c.emoji}</div><div><b>${c.name}</b><span>${c.desc}</span></div><i>${c.side}</i></li>`; }).join("");
  const b = $("#ttsBtn");
  if(!tts.ok){ b.disabled = true; b.textContent = "목소리 미지원"; }
  else { b.textContent = "선생님 목소리 · " + (D().settings.tts ? "켬" : "끔"); b.setAttribute("aria-pressed", D().settings.tts); b.classList.toggle("gold", !!D().settings.tts); }
  const s = activeSession();
  $("#startBtn").textContent = s && !s.done ? "수업 이어하기" : "수업 시작";
}
$("#ttsBtn").onclick = ()=>{
  D().settings.tts = !D().settings.tts; save(); renderS2();
  if(D().settings.tts) toast("수업 시작을 누르면 선생님 말을 소리로 읽어 드려요");
  else if(tts.ok) try{ speechSynthesis.cancel(); }catch(e){}
};
$("#startBtn").onclick = ()=>{
  // iOS: 소리는 사용자가 누른 순간에만 잠금 해제됨 → 이 탭 안에서 바로 한 번 말하기
  if(tts.ok && D().settings.tts){
    try{ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance("Let's begin!"); u.lang="en-US"; tts.voice = pickVoice(); if(tts.voice) u.voice=tts.voice; speechSynthesis.speak(u); tts.unlocked = true; }catch(e){}
  }
  let s = activeSession();
  if(!s || s.done) s = newSession();
  location.hash = "#3";
  play();
};
function newSession(){
  const a = S.article();
  const sc = EC.buildScript(a, name());
  const s = { id:EC.uid("ses"), articleId:a.id, mode:"scripted", startedAt:Date.now(), endedAt:null, q:0, attempt:0,
    queue: sc.pre[0].map(l=>Object.assign({pre:true}, l)), awaiting:false, done:false, retry:null,
    messages:[{id:EC.uid("m"), kind:"sys", t:Date.now()}] };
  D().sessions.push(s);
  if(D().sessions.length>30) D().sessions = D().sessions.slice(-30);
  save(); return s;
}

/* ---------------- ③ 토론 ---------------- */
let playing = false, gen = 0, talking = null;
function cur(){ const s = activeSession(); return s; }
function renderSeats(){
  const s=cur(); const last = s ? s.messages.filter(x=>x.who && x.who!=="me").slice(-1)[0] : null;
  $("#seatsSmall").innerHTML = seatsHTML(false, talking || (s&&s.awaiting ? "me" : (last && last.who)), s&&s.hand);
}
function renderQ(){
  const a = S.article(); const s = cur(); const qi = s ? Math.min(s.q, a.questions.length-1) : 0;
  $("#qNum").textContent = `질문 ${qi+1} / ${a.questions.length}`;
  $("#qBar").style.setProperty("--w", (s&&s.done?100:Math.round((qi+1)/a.questions.length*100))+"%");
  $("#qText").textContent = a.questions[qi]; $("#qText").lang="en";
}
function msgHTML(m, s){
  if(m.kind==="sys") return `<p class="sys"><span class="tag">예시 대본</span>미리 써둔 대본으로 진행돼요 · 진짜 AI 토론은 곧 연결돼요</p>`;
  if(m.kind==="end") return `<div class="sys" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap"><a class="txtbtn gold" href="#4">노트 보기</a><button type="button" class="txtbtn sub" data-act="again">처음부터 다시</button></div>`;
  const c = EC.CAST[m.who];
  const isMe = m.who==="me";
  const lastOther = s.messages.filter(x=>x.who && x.who!=="me").slice(-1)[0];
  const isTalk = !isMe && !talking && lastOther===m;
  let body;
  if(isMe && m.fix && m.fix.changed) body = m.fix.segs.map(g=> g.t!=null ? esc(g.t) : `<span class="oops">${esc(g.old)}</span>`).join("");
  else body = esc(m.text);
  const side = c.side && !isMe ? ` <span class="side">${c.side}</span>` : "";
  const role = m.who==="ellie" ? " · 선생님" : "";
  let h = `<div class="m${isMe?" me":""}${isTalk?" talk":""}" style="--c:${c.color}" data-mid="${m.id}"><div class="av" aria-hidden="true">${c.emoji}</div><div class="b glass"><div class="who">${esc(isMe?"나":c.short)}${role}${side}</div><span lang="en">${body}</span></div></div>`;
  if(isMe && m.fix && m.fix.changed){
    const neu = m.fix.segs.map(g=> g.t!=null ? esc(g.t) : `<ins>${esc(g.neu)}</ins>`).join("");
    h += `<div class="fix glass"><span class="h">더 자연스러운 표현</span><p lang="en">${neu}</p><div class="row"><small>${esc(m.fix.whys.join(" · "))}</small><button type="button" class="txtbtn sub" data-act="retry" data-mid="${m.id}">다시 말해보기</button></div></div>`;
  }
  return h;
}
function renderChat(){
  const s = cur(); const chat = $("#chat");
  if(!s){
    chat.innerHTML = `<p class="sys"><span class="tag">예시 대본</span>아직 수업 전이에요</p><div class="sys"><a class="pbtn" href="#2">교실로 가서 수업 시작</a></div>`;
    return;
  }
  let h = s.messages.map(m=>msgHTML(m,s)).join("");
  if(talking) { const c=EC.CAST[talking]; h += `<div class="m typing talk" style="--c:${c.color}"><div class="av" aria-hidden="true">${c.emoji}</div><div class="b glass"><div class="who">${esc(c.short)}</div>•••</div></div>`; }
  chat.innerHTML = h;
  chat.scrollTop = chat.scrollHeight;
}
function renderS3(){
  renderSeats(); renderQ(); renderChat();
  const s = cur();
  $(".composer .in").classList.toggle("ask", !!(s && s.awaiting));
  $("#replyIn").placeholder = s && s.awaiting ? "내 차례예요 · 영어로 써 보세요" : "영어로 내 생각 쓰기";
  $("#handBtn").classList.toggle("up", !!(s && s.hand));
  if(s && s.queue.length && !playing) play();
}
function refresh3(){ if(location.hash==="#3") renderS3(); }

async function play(){
  if(playing) return; playing = true;
  const my = gen;
  try{
    let s = cur();
    while(s && s.queue.length){
      // 테스트 전용: 스크린샷 순간을 고정할 때만 사용 (__eclassHoldAt = 메시지 수)
      while(window.__eclassHoldAt && s.messages.length >= window.__eclassHoldAt){ await new Promise(r=>setTimeout(r,60)); if(my!==gen) return; }
      const line = s.queue[0];
      talking = line.who; refresh3();
      const delay = Math.min(2600, 650 + line.text.length*16);
      await sleep(delay);
      if(my!==gen){ return; }
      { const qi = s.queue.indexOf(line); if(qi>=0) s.queue.splice(qi,1); }
      talking = null;
      if(line.q!=null){ s.q = line.q; s.attempt = 0; }
      s.messages.push({id:EC.uid("m"), who:line.who, text:line.text, t:Date.now()});
      if(line.invite){ s.awaiting = true; s.hand = false; }
      if(line.end){ s.done = true; s.endedAt = Date.now(); s.awaiting = false; s.messages.push({id:EC.uid("m"), kind:"end"}); makeNote(s); }
      save(); refresh3();
      if(line.who==="ellie"){ const spoke = await speak(line.text); if(my!==gen) return; if(!spoke) await sleep(300); }
      else await sleep(350);
      if(my!==gen) return;
      s = cur();
    }
  } finally {
    if(my===gen){ playing = false; talking = null; refresh3(); }
  }
}
function interrupt(){
  gen++; playing = false; talking = null;
  const s = cur(); if(!s) return;
  s.queue = s.queue.filter(l=>!l.pre);   // 아직 말하지 않은 친구 대사는 건너뜀
  try{ if(tts.ok) speechSynthesis.cancel(); }catch(e){}
}
$("#handBtn").onclick = ()=>{
  const s = cur();
  if(!s){ toast("먼저 ② 교실에서 수업 시작을 눌러 주세요"); return; }
  if(s.done){ toast("수업이 끝났어요 · 노트를 확인해 보세요"); return; }
  if(s.awaiting){ $("#replyIn").focus(); return; }
  interrupt();
  s.hand = true;
  s.queue.unshift({who:"ellie", text:`Oh, ${name()} has a hand up. Go ahead!`, invite:true});
  save(); renderS3(); play();
};
$("#composer").addEventListener("submit", e=>{
  e.preventDefault();
  const inp = $("#replyIn"); const text = inp.value.trim().slice(0,500);
  if(!text) { inp.focus(); return; }
  const s = cur();
  if(!s){ toast("먼저 ② 교실에서 수업 시작을 눌러 주세요"); return; }
  inp.value = "";
  const a = S.article();
  const fix = EC.correct(text);
  const msg = {id:EC.uid("m"), who:"me", text, fix: fix.changed ? fix : null, q:s.q, t:Date.now()};
  if(s.retry){
    // 「다시 말해보기」 답: 흐름은 그대로 두고 선생님 한마디만 먼저
    s.retry = null; msg.retryOf = true;
    gen++; playing = false; talking = null;   // 지금 말하려던 대사는 잠깐 미루고 선생님이 먼저 반응
    s.messages.push(msg);
    s.queue.unshift({who:"ellie", text: fix.changed ? `Almost there! Check the note once more.` : `Much better, ${name()}! That sounds natural.`});
    save(); renderS3(); play(); return;
  }
  if(s.done){
    s.messages.splice(s.messages.length-1, 0, msg);
    s.messages.splice(s.messages.length-1, 0, {id:EC.uid("m"), who:"ellie", text:`Thanks for adding that, ${name()}! I put it in your notes.`, t:Date.now()});
    makeNote(s); save(); renderS3(); return;
  }
  if(!s.awaiting) interrupt();
  s.messages.push(msg);
  s.awaiting = false; s.hand = false;
  const r = EC.respond(a, s.q, text, fix, name(), s.attempt||0);
  const sc = EC.buildScript(a, name());
  let lines = r.lines.slice();
  if(!r.advance){ s.attempt = (s.attempt||0)+1; lines[lines.length-1] = Object.assign({}, lines[lines.length-1], {invite:true}); }
  else if(s.q < sc.pre.length-1){ lines = lines.concat(sc.pre[s.q+1].map(l=>Object.assign({pre:true}, l))); }
  else lines = lines.concat(sc.wrap);
  s.queue = lines.concat(s.queue);
  save(); renderS3(); play();
});
$("#chat").addEventListener("click", e=>{
  const b = e.target.closest("[data-act]"); if(!b) return;
  const s = cur(); if(!s) return;
  if(b.dataset.act==="retry"){
    const m = s.messages.find(x=>x.id===b.dataset.mid);
    s.retry = b.dataset.mid; save();
    const inp = $("#replyIn"); inp.value = m ? m.text : ""; inp.placeholder = "고쳐서 다시 보내 보세요"; inp.focus();
  }
  if(b.dataset.act==="again"){ newSession(); renderS3(); play(); }
});

/* ---------------- ④ 내 생각 노트 ---------------- */
function makeNote(s){
  const a = D().articles.find(x=>x.id===s.articleId) || S.article();
  const mine = s.messages.filter(m=>m.who==="me");
  const texts = mine.map(m=> m.fix ? m.fix.corrected : m.text);
  const firstOp = mine.find(m=>!m.retryOf && (m.text.match(/[A-Za-z]+/g)||[]).length>=3) || mine[0];
  const opinion = firstOp ? (firstOp.fix ? firstOp.fix.corrected : firstOp.text) : "";
  const fixes = mine.filter(m=>m.fix && m.fix.changed).map(m=>({old:m.text, new:m.fix.corrected, why:m.fix.whys.join(" · "), segs:m.fix.segs}));
  const sentences = texts.reduce((n,t)=> n + Math.max(1, EC.sentences(t).length), 0);
  const savedForArticle = D().words.filter(w=>w.articleId===a.id).map(w=>({w:w.w, ko:w.ko}));
  const used = a.words.filter(w=> texts.some(t=> new RegExp("\\b"+w.w.replace(/-/g,"\\-")+"\\b","i").test(t)));
  const words = []; for(const w of savedForArticle.concat(used)) if(!words.some(x=>x.w===w.w)) words.push(w);
  const reason = texts.some(t=>/\bbecause\b/i.test(t)), cond = texts.some(t=>/\b(but|only|if|as long as)\b/i.test(t));
  const teacher = !mine.length ? "Join the talk next time — even one sentence counts!"
    : reason && cond ? "Nice! You gave a reason and a condition."
    : reason ? `Great job giving reasons with "because".`
    : `Good effort! Next time, add a reason with "because".`;
  const note = { id:EC.uid("note"), sessionId:s.id, articleId:a.id, articleTitle:a.title, isExample:!!a.isExample,
    date:Date.now(), minutes:Math.max(1, Math.round(((s.endedAt||Date.now())-s.startedAt)/60000)),
    sentences: mine.length ? sentences : 0, opinion, stance: opinion ? EC.stance(opinion) : "",
    expressions: EC.expressions(texts), fixes, words, teacher };
  const i = D().notes.findIndex(n=>n.sessionId===s.id);
  if(i>=0){ note.id = D().notes[i].id; note.saved = D().notes[i].saved; D().notes[i] = note; } else D().notes.push(note);
  return note;
}
const fixOld = f => f.segs ? `<span class="old2">${f.segs.map(g=>g.t!=null?esc(g.t):`<span class="oops">${esc(g.old)}</span>`).join("")}</span>` : `<span class="old">${esc(f.old)}</span>`;
const fixNew = f => f.segs ? `<span class="new">${f.segs.map(g=>g.t!=null?esc(g.t):`<ins>${esc(g.neu)}</ins>`).join("")}</span>` : `<span class="new">${esc(f.new)}</span>`;
let viewNoteId = null;
const DOW = ["일","월","화","수","목","금","토"];
function fmtDate(t){ const d = new Date(t); return `${d.getMonth()+1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`; }
function renderS4(){
  const body = $("#noteBody");
  const s = cur();
  if(s && !s.done && s.messages.some(m=>m.who==="me")) makeNote(s);   // 진행 중 수업도 미리보기
  const notes = D().notes;
  const n = (viewNoteId && notes.find(x=>x.id===viewNoteId)) || notes.slice().sort((a,b)=>b.date-a.date)[0];
  if(!n){
    body.innerHTML = `<div class="rc glass"><h4><span>아직 노트가 없어요</span></h4><p class="empty">토론에서 영어로 한 문장이라도 말하면, 여기에 내 의견 · 고친 표현 · 새 단어가 모여요.</p></div>
      <div class="cta" style="margin-top:16px"><button type="button" class="txtbtn sub" data-act="bank">내 단어장 <span class="num">${D().words.length}</span>개</button><a class="pbtn" href="#2">교실로 가기</a></div>`;
    return;
  }
  const live = s && s.id===n.sessionId && !s.done;
  body.innerHTML = `
  <div class="stats glass num"><div class="stat"><b>${n.minutes}분</b><span>토론 시간</span></div><div class="stat"><b>${n.sentences}개</b><span>내가 말한 문장</span></div><div class="stat"><b>${n.words.length}개</b><span>새 단어</span></div></div>
  <div class="rc glass"><h4><span>내 의견 한 줄</span><em>${esc(n.stance||"—")}</em></h4><p class="op" lang="en">${n.opinion?esc(n.opinion):"<span class='empty'>아직 없어요</span>"}</p></div>
  <div class="rc glass"><h4><span>내가 쓴 표현</span><em class="num">${n.expressions.length}개</em></h4>${n.expressions.length?`<div class="ex-list" lang="en">${n.expressions.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:`<p class="empty">I agree · because · In my opinion 같은 표현을 써 보세요.</p>`}</div>
  <div class="rc glass"><h4><span>고친 표현</span><em class="num">${n.fixes.length}개</em></h4>${n.fixes.length?`<ul class="fx" lang="en">${n.fixes.map(f=>`<li>${fixOld(f)}${fixNew(f)}<span class="why" lang="ko">${esc(f.why)}</span></li>`).join("")}</ul>`:`<p class="empty">고칠 문장이 없었어요 👍</p>`}</div>
  <div class="rc glass"><h4><span>오늘의 단어</span><em class="num">${n.words.length}개</em></h4>${n.words.length?`<div class="wl">${n.words.map(w=>`<b lang="en">${esc(w.w)}</b><span>${esc(w.ko||"뜻은 AI 연결 후")}</span>`).join("")}</div>`:`<p class="empty">① 자료 화면에서 단어 카드를 눌러 저장해 보세요.</p>`}</div>
  <div class="say glass" style="--c:var(--t);margin-top:10px;padding:12px 16px"><div class="who"><span class="dot"></span>Ms. Ellie · 한마디 <span class="side" style="margin-left:2px">예시</span></div><p style="font-size:14.5px" lang="en">${esc(n.teacher)}</p></div>
  <p class="step num" style="margin-top:10px;line-height:1.5">${fmtDate(n.date)} · ${n.isExample?"예시 기사":"내 PDF"}: <span lang="en">${esc(n.articleTitle)}</span>${live?" · 수업 중":""}</p>
  ${notes.length>1?`<div class="rc glass"><h4><span>지난 노트</span><em class="num">${notes.length}개</em></h4><ul class="past">${notes.slice().sort((a,b)=>b.date-a.date).map(x=>`<li><span>${fmtDate(x.date)} · <span lang="en">${esc(x.articleTitle)}</span></span><button type="button" class="txtbtn sub" data-act="view" data-id="${x.id}">${x.id===n.id?"보는 중":"보기"}</button></li>`).join("")}</ul></div>`:""}
  <div class="cta"><button type="button" class="txtbtn sub" data-act="bank">내 단어장 <span class="num">${D().words.length}</span>개</button><button type="button" class="pbtn" data-act="save" data-id="${n.id}">${n.saved?"저장됨 ✓":"노트 저장"}</button></div>`;
}
$("#noteBody").addEventListener("click", e=>{
  const b = e.target.closest("[data-act]"); if(!b) return;
  if(b.dataset.act==="save"){ const n = D().notes.find(x=>x.id===b.dataset.id); if(n){ n.saved = Date.now(); save(); toast("이 기기에 저장했어요"); renderS4(); } }
  if(b.dataset.act==="view"){ viewNoteId = b.dataset.id; renderS4(); $("#s4").scrollTop = 0; }
  if(b.dataset.act==="bank"){
    const ws = D().words.slice().sort((a,b)=>b.savedAt-a.savedAt);
    openSheet("내 단어장", ws.length ? `<p class="meta num">저장한 단어 ${ws.length}개 · 이 기기에만 저장돼요</p><div class="wl">${ws.map(w=>`<b lang="en">${esc(w.w)}</b><span>${esc(w.ko||"뜻은 AI 연결 후")}</span>`).join("")}</div>` : `<p class="empty">아직 저장한 단어가 없어요. ① 자료 화면의 단어 카드를 눌러 보세요.</p>`);
  }
});

/* ---------------- iOS 키보드 · 화면 높이 ---------------- */
const app = $("#app");
function fitViewport(){
  const vv = window.visualViewport;
  const h = vv ? vv.height : innerHeight;
  app.style.setProperty("--appH", h+"px");
  const focused = document.activeElement && document.activeElement.tagName==="INPUT";
  app.classList.toggle("kb", !!(focused && vv && vv.height < innerHeight - 120));
  if(focused) window.scrollTo(0,0);
  const chat = $("#chat"); if(chat && location.hash==="#3") chat.scrollTop = chat.scrollHeight;
}
if(window.visualViewport){ visualViewport.addEventListener("resize", fitViewport); visualViewport.addEventListener("scroll", ()=>window.scrollTo(0,0)); }
addEventListener("resize", fitViewport);
document.addEventListener("focusout", ()=>setTimeout(fitViewport, 50));
fitViewport();

/* ---------------- 오프라인 캐시 (https 또는 localhost에서만) ---------------- */
if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost" || location.hostname==="127.0.0.1") && !params.has("nosw")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}

/* 테스트용 훅 (분석·추적 없음) */
window.__eclass = { store:S, get playing(){ return playing; }, cur, wipe(){ S.wipe(); S.save(); } };
route();
window.__eclassReady = true;
})();
