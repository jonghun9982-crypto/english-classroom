/* 데이터: 예시 기사, 등장인물, 작은 단어 사전, 저장소(localStorage: eclass.v1) */
(function(){
"use strict";
const EC = window.EC = window.EC || {};

EC.CAST = {
  ellie:{id:"ellie", name:"Ms. Ellie", short:"Ellie", emoji:"👩‍🏫", color:"var(--t)", role:"선생님"},
  max:  {id:"max",  name:"Max",  short:"Max",  emoji:"🦊", color:"var(--mint)",  side:"반대", desc:"늘 반대 의견부터 내요"},
  yuna: {id:"yuna", name:"Yuna", short:"Yuna", emoji:"🐰", color:"var(--coral)", side:"찬성", desc:"감정과 경험으로 말해요"},
  leo:  {id:"leo",  name:"Leo",  short:"Leo",  emoji:"🦉", color:"var(--lilac)", side:"중립", desc:"숫자와 근거를 좋아해요"},
  me:   {id:"me",   name:"나",   short:"나",   emoji:"🙂", color:"var(--me)"}
};

/* 예시 기사 — 실제 뉴스가 아님 (라벨 유지 필수) */
EC.EXAMPLE_ARTICLE = {
  id:"example-laptop-limit",
  source:"example",
  isExample:true,
  title:"Cafés in a Small Town Try a Two-Hour Laptop Limit",
  tags:["#Life"],
  text:[
    "Some cafés in a small town now ask laptop users to leave after two hours. The owners say the new rule is a test, and it may change after one month.",
    "Owners say tables stay crowded all afternoon while sales go down. One owner said that a single customer sometimes orders one coffee and stays for six hours.",
    "Students worry the new policy is unfair to them. Many say they cannot study at home because their rooms are small or noisy.",
    "Remote workers have mixed feelings. Some say they would happily pay a small fee for a quiet table. Others say a timer makes them feel unwelcome.",
    "A local business group suggested a trade-off: limits only during busy lunch hours, and no limits in the quiet evening.",
    "The town will collect opinions from customers before deciding whether to keep the rule."
  ].join("\n\n"),
  summary:{
    mid:[
      "Some cafés now ask laptop users to leave after two hours.",
      "Owners say tables stay <u>crowded</u> while sales go down.",
      "Students worry the new <u>policy</u> is unfair to them."
    ],
    easy:[
      "Some cafés have a new rule: laptops for two hours only.",
      "The cafés are full, but they sell less coffee.",
      "Students think the rule is not fair."
    ]
  },
  question:"Should cafés limit laptop time?",
  questions:[
    "Should cafés limit laptop time to 2 hours?",
    "Who loses the most from this rule: students, workers, or owners?",
    "What would be a fair trade-off for everyone?"
  ],
  words:[
    {w:"crowded", ko:"붐비는"},
    {w:"policy", ko:"정책, 방침"},
    {w:"trade-off", ko:"얻는 것과 잃는 것"}
  ]
};

/* 오프라인 미니 사전 — PDF에서 고른 어려운 단어에 뜻을 붙일 때 사용 (없는 단어는 "뜻은 AI 연결 후") */
EC.DICT = {
  "policy":"정책, 방침","crowded":"붐비는","trade-off":"얻는 것과 잃는 것","economy":"경제","economic":"경제의","inflation":"물가 상승",
  "government":"정부","regulation":"규제","regulations":"규제","legislation":"법률, 입법","significant":"중요한, 상당한","significantly":"상당히",
  "environment":"환경","environmental":"환경의","sustainable":"지속 가능한","sustainability":"지속 가능성","emissions":"배출(량)","renewable":"재생 가능한",
  "infrastructure":"사회 기반 시설","investment":"투자","investors":"투자자들","researchers":"연구자들","research":"연구","evidence":"증거, 근거",
  "controversial":"논란이 많은","controversy":"논란","consequences":"결과, 영향","consequence":"결과","approximately":"대략","estimated":"추정된",
  "population":"인구","residents":"주민","community":"지역 사회","communities":"지역 사회들","authorities":"당국","officials":"관계자, 공무원",
  "announced":"발표했다","implement":"시행하다","implemented":"시행된","implementation":"시행","proposal":"제안","proposed":"제안된",
  "opposition":"반대","criticism":"비판","critics":"비판하는 사람들","support":"지지","supporters":"지지자들","concerns":"우려","concern":"우려",
  "affordable":"감당할 수 있는(저렴한)","expensive":"비싼","revenue":"수익","profit":"이익","profits":"이익","customers":"손님, 고객",
  "technology":"기술","artificial":"인공의","intelligence":"지능","automation":"자동화","privacy":"사생활","security":"보안, 안전",
  "climate":"기후","temperature":"기온","temperatures":"기온","drought":"가뭄","flooding":"홍수","disaster":"재난",
  "healthcare":"의료","patients":"환자들","vaccine":"백신","treatment":"치료","mental":"정신의","wellbeing":"행복, 웰빙",
  "education":"교육","curriculum":"교육 과정","students":"학생들","university":"대학교","tuition":"등록금","graduates":"졸업생들",
  "unemployment":"실업","employment":"고용","employees":"직원들","employers":"고용주들","workforce":"노동력","remote":"원격의",
  "productivity":"생산성","efficient":"효율적인","efficiency":"효율","transportation":"교통","commute":"통근","congestion":"혼잡",
  "democracy":"민주주의","election":"선거","elections":"선거","negotiations":"협상","agreement":"합의","conflict":"갈등",
  "international":"국제적인","domestic":"국내의","global":"세계적인","crisis":"위기","recovery":"회복","decline":"감소",
  "increase":"증가","decrease":"감소","shortage":"부족","demand":"수요","supply":"공급","prices":"가격",
  "unfair":"불공평한","unwelcome":"환영받지 못하는","temporary":"임시의","permanent":"영구적인","experiment":"실험","survey":"설문 조사",
  "majority":"대다수","minority":"소수","individual":"개인","individuals":"개인들","responsibility":"책임","opportunity":"기회",
  "opportunities":"기회들","challenge":"도전, 어려움","challenges":"어려움들","solution":"해결책","solutions":"해결책들","strategy":"전략",
  "potential":"잠재적인","crucial":"매우 중요한","essential":"필수적인","benefit":"이익, 혜택","benefits":"혜택","impact":"영향",
  "independent":"독립적인","influence":"영향(력)","initiative":"계획, 주도권","launched":"시작했다","statement":"성명, 발표",
  "spokesperson":"대변인","according":"~에 따르면","analysts":"분석가들","analysis":"분석","forecast":"예측","generation":"세대",
  "neighborhood":"동네","pedestrians":"보행자들","electricity":"전기","consumption":"소비","manufacturing":"제조업","industry":"산업",
  "competition":"경쟁","competitive":"경쟁력 있는","subsidies":"보조금","budget":"예산","taxes":"세금","welfare":"복지"
};

/* ---------- 저장소: localStorage["eclass.v1"] ----------
  {
    version:1,
    createdAt, updatedAt,
    settings:{ name, tts, correction:"balanced" },
    currentArticleId,
    articles:[{ id, source:"example"|"pdf"|"link", isExample, title, tags[], text, summary:{mid[],easy[]}, question, questions[], words[{w,ko}], fileName?, pages?, createdAt }],
    sessions:[{ id, articleId, mode:"scripted", startedAt, endedAt, q, queue[], awaiting, done, messages[{id,who,text,fix?,t}] }],
    notes:[{ id, sessionId, articleId, articleTitle, date, minutes, sentences, opinion, stance, expressions[], fixes[{old,new,why}], words[{w,ko}] }],
    words:[{ w, ko, articleId, savedAt }]
  }
  새 필드는 추가만 하고(버전 올릴 때는 migrate()에서 변환) 기존 필드는 지우지 않는 방식. */
const KEY = "eclass.v1";
function fresh(){
  const now = Date.now();
  return { version:1, createdAt:now, updatedAt:now,
    settings:{ name:"Jonghoon", tts:false, correction:"balanced" },
    currentArticleId:EC.EXAMPLE_ARTICLE.id,
    articles:[JSON.parse(JSON.stringify(EC.EXAMPLE_ARTICLE))],
    sessions:[], notes:[], words:[] };
}
function migrate(d){
  if(!d || typeof d!=="object") return fresh();
  const f = fresh();
  for(const k of ["settings","articles","sessions","notes","words"]) if(d[k]==null) d[k]=f[k];
  d.settings = Object.assign({}, f.settings, d.settings);
  if(!d.articles.some(a=>a.id===EC.EXAMPLE_ARTICLE.id)) d.articles.unshift(f.articles[0]);
  if(!d.currentArticleId || !d.articles.some(a=>a.id===d.currentArticleId)) d.currentArticleId = EC.EXAMPLE_ARTICLE.id;
  d.version = 1;
  return d;
}
let memOnly = false;
EC.store = {
  KEY,
  data:null,
  load(){
    let d=null;
    try{ d = JSON.parse(localStorage.getItem(KEY)); }catch(e){ d=null; }
    this.data = migrate(d);
    return this.data;
  },
  save(){
    this.data.updatedAt = Date.now();
    try{ localStorage.setItem(KEY, JSON.stringify(this.data)); return true; }
    catch(e){
      // 용량 초과 시: 기사 원문이 큰 PDF부터 원문을 줄여서 다시 시도
      try{
        for(const a of this.data.articles) if(a.source==="pdf" && a.text && a.text.length>40000) a.text = a.text.slice(0,40000)+"\n…";
        localStorage.setItem(KEY, JSON.stringify(this.data)); return true;
      }catch(e2){ memOnly = true; return false; }
    }
  },
  get memOnly(){ return memOnly; },
  wipe(){ try{ localStorage.removeItem(KEY); }catch(e){} this.data = fresh(); },
  article(id){ return this.data.articles.find(a=>a.id===(id||this.data.currentArticleId)) || this.data.articles[0]; }
};
EC.uid = (p)=> (p||"id")+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
})();
