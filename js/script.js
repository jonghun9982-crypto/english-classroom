/* 예시 대본 토론 엔진 — 진짜 AI가 아님. 미리 써둔 대사 + 사용자 답에 맞춘 간단한 규칙 반응 */
(function(){
"use strict";
const EC = window.EC = window.EC || {};
const L = (who, text, extra) => Object.assign({who, text}, extra||{});

function exampleScript(a, name){
  const q = a.questions;
  return {
    questions:q,
    pre:[
      [L("ellie",`Let's start. ${q[0]}`,{q:0}),
       L("max","No way. If I buy coffee, I can stay as long as I want.",{side:"반대"}),
       L("yuna","I think it's fair. Other people need a seat too.",{side:"찬성"}),
       L("leo","The article says one customer stayed six hours with one coffee. That's a real cost for the owner.",{side:"중립"}),
       L("ellie",`${name}, what do you think? Agree or disagree — and tell us why.`,{invite:true})],
      [L("ellie",`Next question. ${q[1]}`,{q:1}),
       L("yuna","Students, I think. Some of them can't study at home because their rooms are small.",{side:"찬성"}),
       L("max","I disagree. Owners lose the most. They pay rent every single month.",{side:"반대"}),
       L("ellie",`${name}, who do you think loses the most?`,{invite:true})],
      [L("ellie",`Last one. ${q[2]}`,{q:2}),
       L("leo","The business group's idea makes sense to me: limits only during busy lunch hours.",{side:"중립"}),
       L("max","Or a small fee for long stays. Pay a little more, stay a little longer.",{side:"반대"}),
       L("ellie",`${name}, what trade-off would you choose?`,{invite:true})]
    ],
    counter:[
      {pro:L("max",`Fair point, ${name}. But what about people who really need a place to work?`,{side:"반대"}),
       con:L("yuna",`I see your point, ${name}. But owners need to pay rent too.`,{side:"찬성"}),
       mid:L("leo","Interesting. I'd love to see real numbers on that, but it's a good point.",{side:"중립"})},
      {pro:L("max","Hmm, maybe. But if the café closes, everyone loses.",{side:"반대"}),
       con:L("yuna","That's true, but students have fewer choices than owners.",{side:"찬성"}),
       mid:L("leo","Good thinking. It probably depends on the town.",{side:"중립"})},
      {pro:L("yuna","I like that. It sounds fair to both sides.",{side:"찬성"}),
       con:L("max","Okay, I could live with that. Maybe.",{side:"반대"}),
       mid:L("leo","That's a balanced idea. The town should test it for a month.",{side:"중립"})}
    ],
    wrap:[L("ellie",`Great class, everyone! ${name}, you shared real opinions in English today. Let's look at your notes.`,{end:true})]
  };
}

function genericScript(a, name){
  const w = (a.words[0]&&a.words[0].w) || "this topic";
  const w2 = (a.words[1]&&a.words[1].w) || "the details";
  const q = a.questions;
  return {
    questions:q,
    pre:[
      [L("ellie",`Let's start with the big picture. ${q[0]}`,{q:0}),
       L("leo",`I'll go first. I think it's mainly about "${w}". The first part explains it.`,{side:"중립"}),
       L("max","I read it differently. I think the main point is the problem, not the facts.",{side:"반대"}),
       L("ellie",`${name}, how would you say it in one sentence?`,{invite:true})],
      [L("ellie",`Next question. ${q[1]}`,{q:1}),
       L("yuna","I mostly agree. It made me think about my own life.",{side:"찬성"}),
       L("max","I'm not convinced yet. I'd like to see more evidence first.",{side:"반대"}),
       L("ellie",`${name}, do you agree with the main idea? Tell us why.`,{invite:true})],
      [L("ellie",`Last one. ${q[2]}`,{q:2}),
       L("leo",`Korea changes fast, so "${w2}" could matter a lot here.`,{side:"중립"}),
       L("yuna","I think young people would feel it first.",{side:"찬성"}),
       L("ellie",`${name}, what do you think?`,{invite:true})]
    ],
    counter:[
      {pro:L("max",`Good summary, ${name}. But I still think the problem is the main point.`,{side:"반대"}),
       con:L("yuna",`Oh, I see it a bit differently, ${name}, but that's interesting.`,{side:"찬성"}),
       mid:L("leo","Nice. Short and clear — that's a good summary.",{side:"중립"})},
      {pro:L("max",`Hmm, you and Yuna agree. I still want more evidence, ${name}!`,{side:"반대"}),
       con:L("yuna","That's fair. Not everyone has to agree with the writer.",{side:"찬성"}),
       mid:L("leo","Good point. Maybe the answer is somewhere in the middle.",{side:"중립"})},
      {pro:L("yuna","Yes! I think so too.",{side:"찬성"}),
       con:L("max","Interesting. I'm not sure it would change much here.",{side:"반대"}),
       mid:L("leo","That's a thoughtful answer.",{side:"중립"})}
    ],
    wrap:[L("ellie",`Great class, everyone! ${name}, thanks for sharing your ideas in English. Let's look at your notes.`,{end:true})]
  };
}

EC.GENERIC_QUESTIONS = [
  "In one sentence, what is this article about?",
  "Do you agree with the main idea? Why or why not?",
  "How could this topic affect people in Korea?"
];

EC.buildScript = function(article, name){
  return article.isExample ? exampleScript(article, name) : genericScript(article, name);
};

/* 사용자 답 분석 → 반응 대사. advance=false 이면 같은 질문에 한 번 더 답하도록 기다림 */
EC.respond = function(article, qi, text, fix, name, attempt){
  const sc = EC.buildScript(article, name);
  const t = text.toLowerCase();
  const enWords = (text.match(/[A-Za-z]+/g)||[]).length;
  const lines = [];
  if(EC.hasHangul(text) && enWords<3){
    lines.push(L("ellie",`That's okay! Try it in English — even a short sentence is fine. For example: "I agree with Yuna."`));
    return {lines, advance:false};
  }
  if(enWords<3 && attempt<1){
    lines.push(L("ellie",`Good start, ${name}! Can you say a little more? Try adding "because …".`));
    return {lines, advance:false};
  }
  const reason = /\b(because|since|so|for example|that's why|the reason)\b/.test(t);
  const cond = /\b(but|only|if|as long as|unless|depends)\b/.test(t);
  let praise;
  if(fix && fix.changed) praise = `Thanks, ${name}! Good idea. I left a small note under your sentence.`;
  else if(reason && cond) praise = `Nice! You gave a reason and a condition.`;
  else if(reason) praise = `Great — you gave a clear reason with "because".`;
  else praise = `Thanks, ${name}! Next time, try adding a reason with "because …".`;
  if(/\?\s*$/.test(text.trim())) praise = `Good question, ${name}! I'll save it in your notes so we can come back to it.`;
  lines.push(L("ellie", praise));

  // 반 친구 반응: 이름을 부르면 그 친구가 먼저, 아니면 입장에 따라 반대편 친구
  const st = EC.stance(text);
  const mentioned = ["max","yuna","leo"].find(n=> new RegExp("\\b"+n+"\\b").test(t));
  const c = sc.counter[qi] || sc.counter[0];
  if(mentioned && /\bagree\b/.test(t) && !/\bdisagree\b/.test(t)){
    lines.push(L(mentioned, `Thanks, ${name}! Glad we're on the same side.`, {side:EC.CAST[mentioned].side}));
  } else if(mentioned && /\bdisagree\b/.test(t)){
    lines.push(L(mentioned, `Okay, ${name}, fair enough. Let's agree to disagree!`, {side:EC.CAST[mentioned].side}));
  } else {
    lines.push(st.startsWith("찬성") ? c.pro : st.startsWith("반대") ? c.con : c.mid);
  }
  return {lines, advance:true};
};
})();
