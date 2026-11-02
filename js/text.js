/* 텍스트 도구: PDF 글자 추출(pdf.js), 간단 요약, 어려운 단어 고르기, 간단 문장 교정 규칙 — 모두 기기 안에서만 동작 */
(function(){
"use strict";
const EC = window.EC = window.EC || {};

/* ---------- PDF (pdf.js, 기기 안에서 처리 · 서버 전송 없음) ---------- */
let pdfjsP = null;
function loadPdfjs(){
  if(!pdfjsP){
    const base = new URL("vendor/pdfjs/", document.baseURI).href;
    pdfjsP = import(base+"pdf.min.mjs").then(m=>{ m.GlobalWorkerOptions.workerSrc = base+"pdf.worker.min.mjs"; return m; })
      .catch(e=>{ pdfjsP=null; throw e; });
  }
  return pdfjsP;
}
EC.loadPdfjs = loadPdfjs;

const MAX_PAGES = 40;
EC.extractPdf = async function(file, onProgress){
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({data:new Uint8Array(buf), isEvalSupported:false, disableFontFace:true}).promise;
  let meta = {};
  try{ meta = (await doc.getMetadata()).info || {}; }catch(e){}
  const n = Math.min(doc.numPages, MAX_PAGES);
  const pages = [];
  for(let i=1;i<=n;i++){
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    // 줄 사이 간격이 평소(중간값)보다 크면 문단이 바뀐 것으로 보고 빈 줄을 넣음
    const raw = []; let cur = "", lineY = null;
    const flush = ()=>{ if(cur.trim()) raw.push({t:cur, y:lineY}); cur=""; lineY=null; };
    for(const it of tc.items){
      if(typeof it.str!=="string") continue;
      if(!cur.trim() && it.str.trim() && it.transform) lineY = it.transform[5];
      cur += it.str;
      if(it.hasEOL) flush();
    }
    flush();
    const gaps = [];
    for(let k=1;k<raw.length;k++) if(raw[k].y!=null && raw[k-1].y!=null) gaps.push(Math.abs(raw[k-1].y-raw[k].y));
    const med = gaps.length ? gaps.slice().sort((x,y)=>x-y)[Math.floor(gaps.length/2)] : 0;
    const lines = [];
    raw.forEach((r,k)=>{
      if(k>0 && med>0 && r.y!=null && raw[k-1].y!=null){ const g = Math.abs(raw[k-1].y-r.y); if(g > med*1.4 || g < -1) lines.push(""); }
      lines.push(r.t);
    });
    pages.push(lines);
    page.cleanup && page.cleanup();
    onProgress && onProgress(i, n);
  }
  try{ await doc.destroy(); }catch(e){}
  return { pages, numPages: doc.numPages, truncatedPages: doc.numPages>n, meta };
};

/* 줄 배열 → 문단 텍스트 */
EC.linesToText = function(pages){
  const paras = [];
  for(const lines of pages){
    let p = "";
    for(let raw of lines){
      const l = raw.replace(/\s+/g," ").trim();
      if(!l){ if(p){ paras.push(p); p=""; } continue; }
      if(!p) p = l;
      else if(/[A-Za-z]-$/.test(p)) p = p.slice(0,-1)+l;   // 줄 끝 하이픈 이어 붙이기
      else p += " "+l;
    }
    if(p) paras.push(p);
  }
  return paras.join("\n\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").trim();
};

/* ---------- 문장 나누기 · 요약(앞 문장 3개) ---------- */
const ABBR = /\b(Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|vs|etc|e\.g|i\.e|U\.S|U\.K|No|Inc|Ltd|Co)\.$/i;
EC.sentences = function(text){
  const out = [];
  for(const para of text.split(/\n{2,}/)){
    const parts = para.match(/[^.!?]+(?:[.!?]+["”’')\]]*|$)/g) || [];
    let buf = "";
    for(const s of parts){
      buf += s;
      if(ABBR.test(buf.trim()) ) continue;
      const t = buf.replace(/\s+/g," ").trim(); buf = "";
      if(t) out.push(t);
    }
    if(buf.trim()) out.push(buf.replace(/\s+/g," ").trim());
  }
  return out;
};
const wc = s => (s.match(/[A-Za-z][A-Za-z'’-]*/g)||[]).length;
EC.guessTitle = function(text, meta, fileName){
  const mt = (meta && meta.Title || "").trim();
  if(mt && mt.length>3 && mt.length<140 && !/^untitled|\.(docx?|pdf|pages|html?)$|^(https?|file):/i.test(mt) && /[A-Za-z]/.test(mt)) return mt;
  const first = (text.split(/\n+/)[0]||"").trim();
  const firstSentence = EC.sentences(first)[0] || "";
  if(first && wc(first)>=2 && wc(first)<=16 && first.length<120 && !/[.!?]$/.test(firstSentence) ) return first;
  return (fileName||"내 PDF").replace(/\.pdf$/i,"").replace(/[_-]+/g," ").trim() || "내 PDF";
};
EC.summarize = function(text, title, n){
  n = n||3;
  let body = text;
  if(title && body.startsWith(title)) body = body.slice(title.length);
  const ss = EC.sentences(body).filter(s=>{ const k=wc(s); return k>=5 && k<=45 && /[a-z]/.test(s) && !/^(https?:|www\.)/i.test(s); });
  return ss.slice(0,n).map(s=> s.length>200 ? s.slice(0,197).replace(/\s+\S*$/,"")+"…" : s);
};

/* ---------- 어려운 단어 고르기 (긴 단어 · 흔하지 않은 단어 · 고유명사 제외) ---------- */
const COMMON = new Set(("the of and to a in is it you that he was for on are with as i his they be at one have this from or had by hot but some what there we can out other were all your when up use word how said an each she which do their time if will way about many then them would write like so these her long make thing see him two has look more day could go come did my sound no most number who over know water than call first people may down side been now find any new work part take get place made live where after back little only round man year came show every good me give our under name very through just form much great think say help low line before turn cause same mean differ move right boy old too does tell sentence set three want air well also play small end put home read hand port large spell add even land here must big high such follow act why ask men change went light kind off need house picture try us again animal point mother world near build self earth father head stand own page should country found answer school grow study still learn plant cover food sun four thought let keep eye never last door between city tree cross since hard start might story saw far sea draw left late run don't while press close night real life few stop open seem together next white children begin got walk example ease paper often always music those both mark book letter until mile river car feet care second group carry took rain eat room friend began idea fish mountain north once base hear horse cut sure watch color face wood main enough plain girl usual young ready above ever red list though feel talk bird soon body dog family direct pose leave song measure state product black short numeral class wind question happen complete ship area half rock order fire south problem piece told knew pass farm top whole king size heard best hour better true during hundred am remember step early hold west ground interest reach fast five sing listen six table travel less morning ten simple several vowel toward war lay against pattern slow center love person money serve appear road map science rule govern pull cold notice voice fall power town fine certain fly unit lead cry dark machine note wait plan figure star box noun field rest correct able pound done beauty drive stood contain front teach week final gave green oh quick develop sleep warm free minute strong special mind behind clear tail produce fact street inch lot nothing course stay wheel full force blue object decide surface deep moon island foot yet busy test record boat common gold possible plane age dry wonder laugh thousand ago ran check game shape yes miss brought heat snow bed bring sit perhaps fill east weight language among because however without within around another something someone everyone people's really things little before after while their there about would could should other these those being because between through during without against already almost although always another anything around because become becomes before behind believe better between beyond business company computer different during either enough especially everything example family finally following found friends getting government happened having important including information instead interest itself keeping knowing later least likely little looking making maybe meeting million moment money months morning mother national nothing number office often others outside paper parents perhaps person picture places playing please point possible pretty probably problem program public question quickly quite rather reason recent remember report result return running saying school second seemed service several should showed simply single sometimes something special started started still stories student system taking talking thing things thinking though thought three today together told toward trying under understand until using usually various water whatever whether which while whole without woman women working world would writing years young yourself said says saying also told added including according percent people afternoon evening tomorrow yesterday").split(/\s+/));
const SUFFIX = /(tion|sion|ment|ness|ity|ance|ence|ous|ious|ive|ical|ize|ise|ism|ist|able|ible|ogy|graphy|ship|ure)s?$/;
EC.hardWords = function(text, n){
  n = n||6;
  const toks = text.match(/[A-Za-z][A-Za-z'’-]*[A-Za-z]/g) || [];
  const info = new Map();
  toks.forEach((t,i)=>{
    const clean = t.replace(/['’]s$/,"");
    const low = clean.toLowerCase();
    let e = info.get(low); if(!e){ e={w:low, n:0, lower:0, first:i}; info.set(low,e); }
    e.n++; if(clean[0]===clean[0].toLowerCase()) e.lower++;
  });
  const cands = [];
  for(const e of info.values()){
    const w = e.w;
    if(w.length<6 || COMMON.has(w) || /['’]/.test(w)) continue;
    if(e.lower===0) continue;                 // 늘 대문자로만 나오면 이름(고유명사)으로 보고 제외
    if(/(.)\1\1/.test(w)) continue;
    let s = Math.min(w.length,13) + (EC.DICT[w]?3:0) + (SUFFIX.test(w)?2:0) + Math.min(e.n-1,3) + (w.includes("-")?1:0);
    if(/ing$|ed$/.test(w) && !EC.DICT[w]) s -= 2;   // 흔한 동사 변형은 조금 덜
    cands.push({w, s, first:e.first});
  }
  cands.sort((a,b)=> b.s-a.s || a.first-b.first);
  const picked = [], stems = new Set();
  for(const c of cands){
    const st = c.w.slice(0,5);
    if(stems.has(st)) continue;
    stems.add(st); picked.push({w:c.w, ko:EC.DICT[c.w]||""});
    if(picked.length>=n) break;
  }
  return picked;
};

/* ---------- 간단 교정 규칙 (예시 · 진짜 AI 교정 아님) ---------- */
const DET = /\b(a|an|the|this|that|one|every|each|my|our|your|his|her|their)\s*$/i;
const AUX = /\b(does|did|do|will|can|could|should|would|must|might|may|to|let|make|help)\s*$/i;
const PLURAL = {cafe:"cafés", "café":"cafés", student:"students", owner:"owners", worker:"workers", customer:"customers", shop:"shops", person:"people", company:"companies", city:"cities"};
const THIRD = {have:"has", go:"goes", do:"does", "don't":"doesn't"};
const s3 = v => THIRD[v.toLowerCase()] || (/(s|sh|ch|x|o)$/i.test(v) ? v+"es" : /[^aeiou]y$/i.test(v) ? v.slice(0,-1)+"ies" : v+"s");
const cap = (src, out) => src[0] && src[0]===src[0].toUpperCase() && src[0]!==src[0].toLowerCase() ? out[0].toUpperCase()+out.slice(1) : out;
const VERBS = "need|want|have|think|like|say|lose|make|go|pay|feel|believe|get|work|use|stay|spend|agree|love|hate";

const RULES = [
  {re:/\bI\s*(?:am|'m|’m)\s+(agree|disagree)\b/gi, fix:m=>"I "+m[1].toLowerCase(), why:"agree는 동사라 am 없이 써요"},
  {re:/\b(we|they|you)\s+(?:are|'re|’re)\s+(agree|disagree)\b/gi, fix:m=>m[1]+" "+m[2], why:"agree는 동사라 are 없이 써요"},
  {re:new RegExp("\\b(cafe|café|student|owner|worker|customer|shop|person|company|city)\\s+("+VERBS+")\\b","gi"),
    fix:(m,str,i)=>{
      const before = str.slice(0,i);
      if(AUX.test(before)) return null;
      if(DET.test(before)) return m[1]+" "+s3(m[2]);
      return cap(m[1], PLURAL[m[1].toLowerCase()])+" "+m[2];
    },
    why:(m,str,i)=> DET.test(str.slice(0,i)) ? "한 명·한 곳(3인칭 단수)이면 동사에 -s" : (/^caf/i.test(m[1]) ? "여러 카페는 cafés" : "여럿을 말할 땐 복수형으로")},
  {re:new RegExp("\\b(he|she|it)\\s+(don't|"+VERBS+")\\b","gi"),
    fix:(m,str,i)=> AUX.test(str.slice(0,i)) || /\b(do|does|did|will|can|could|should|would|must)\s*$/i.test(str.slice(0,i)) ? null : m[1]+" "+s3(m[2]),
    why:"he/she/it 뒤에는 동사에 -s (don't → doesn't)"},
  {re:/\bpeople\s+(is|was|needs|wants|thinks|likes|says|has)\b/gi,
    fix:m=>cap(m[0],"people ")+({is:"are",was:"were",has:"have"}[m[1].toLowerCase()] || m[1].replace(/s$/,"")), why:"people은 여러 명이라 복수 동사"},
  {re:/\bdiscuss(es|ed)?\s+about\b/gi, fix:m=>"discuss"+(m[1]||""), why:"discuss 뒤에는 about 없이"},
  {re:/\bmore\s+(better|worse|easier|cheaper|bigger|faster)\b/gi, fix:m=>m[1], why:"better 안에 이미 '더'가 있어요"},
  {re:/\b(can|must|should|will|could|would)\s+to\s+(?=[a-z])/gi, fix:m=>m[1]+" ", why:"can·must 같은 말 뒤에는 to 없이 동사"},
  {re:/\bagree\s+(?:to|on)\s+(you|him|her|them|max|yuna|leo|ellie|ms\.? ellie)\b/gi, fix:m=>"agree with "+m[1], why:"사람에게 동의할 땐 agree with"},
  {re:/\bdepend(s)?\s+of\b/gi, fix:m=>"depend"+(m[1]||"")+" on", why:"depend는 on과 함께"},
  {re:/\bit(?:'s|’s| is)\s+depends(\s+of)?\b/gi, fix:m=>cap(m[0],"it depends")+(m[1]?" on":""), why:m=>m[1]?"it depends on 으로 써요":"it depends 로 충분해요"},
  {re:/\bexplain\s+me\b/gi, fix:()=>"explain to me", why:"explain 뒤에 사람이 오면 to"},
  {re:/\bin my opinion,?\s+i think\b/gi, fix:m=>cap(m[0],"in my opinion,"), why:"같은 뜻이 두 번 — 하나만 써도 돼요"},
  {re:/\bI\s+very\s+(like|love|agree|want)\b/gi, fix:m=>"I really "+m[1], why:"동사 앞에는 very 대신 really"},
  {re:/\b(informations|advices|furnitures)\b/gi, fix:m=>m[1].replace(/s$/i,""), why:"셀 수 없는 말이라 -s 없이"},
  {re:/\bthere\s+(?:is|'s|’s)\s+(many|a lot of|lots of|some)\s+([a-z]+s)\b/gi, fix:m=>"there are "+m[1]+" "+m[2], why:"여러 개면 there are"},
  {re:/(^|[\s"“(])i(?=[\s'’,.!?]|$)/g, fix:m=>m[1]+"I", why:"나(I)는 항상 대문자"}
];
/* 결과: {changed, segs:[{t, old?, neu?}], corrected, whys[]} */
EC.correct = function(str){
  const hits = [];
  for(const r of RULES){
    r.re.lastIndex = 0; let m;
    while((m = r.re.exec(str))){
      if(m[0]==="" ){ r.re.lastIndex++; continue; }
      const neu = r.fix(m, str, m.index);
      if(neu==null || neu===m[0]) continue;
      const why = typeof r.why==="function" ? r.why(m,str,m.index) : r.why;
      // i 규칙은 앞 공백 포함 → 실제 바뀌는 부분만 표시
      let start = m.index, old = m[0], nn = neu;
      const lead = (old.match(/^[\s"“(]+/)||[""])[0];
      if(lead && nn.startsWith(lead)){ start += lead.length; old = old.slice(lead.length); nn = nn.slice(lead.length); }
      hits.push({start, end:start+old.length, old, neu:nn, why});
    }
  }
  hits.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
  const keep = []; let last = -1;
  for(const h of hits){ if(h.start>=last){ keep.push(h); last = h.end; } }
  const segs = []; let pos = 0;
  for(const h of keep){ if(h.start>pos) segs.push({t:str.slice(pos,h.start)}); segs.push({old:h.old, neu:h.neu}); pos = h.end; }
  if(pos<str.length) segs.push({t:str.slice(pos)});
  const corrected = segs.map(s=> s.t!=null ? s.t : s.neu).join("");
  const whys = [...new Set(keep.map(h=>h.why))];
  return {changed: keep.length>0, segs, corrected, whys};
};

/* 사용자가 쓴 표현 찾기 (노트용) */
const EXPR = ["I agree","I disagree","I think","I don't think","In my opinion","because","However","On the other hand","For example","only if","as long as","I'm not sure","That's a good point","I see your point","It depends","I believe","I feel","but"];
EC.expressions = function(texts){
  const found = [];
  const all = texts.join(" \n ");
  for(const e of EXPR){
    const re = new RegExp("(^|[^a-z])"+e.replace(/'/g,"['’]")+"(?![a-z])","i");
    if(re.test(all)) found.push(e);
  }
  return found;
};
EC.stance = function(text){
  const t = text.toLowerCase();
  const cond = /\b(but|only|if|as long as|depends|unless)\b/.test(t);
  let s = "생각 정리";
  if(/\b(disagree|no way|don't think|shouldn't|should not|unfair|not fair|against)\b/.test(t)) s = "반대";
  else if(/\b(agree|yes|should|fair|okay|ok|fine|good idea|support)\b/.test(t)) s = "찬성";
  return cond && s!=="생각 정리" ? s+" · 조건 있음" : s;
};
EC.hasHangul = s => /[\u3131-\uD79D]/.test(s);
EC.esc = s => String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
})();
