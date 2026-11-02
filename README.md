# 가상 영어 교실 🏫

영어 뉴스 기사(PDF)를 올리고, AI 선생님·반 친구들과 가상 교실에서 토론하는 연습용 웹앱 데모입니다.

👉 **바로 열기: https://jonghun9982-crypto.github.io/english-classroom/**
(아이폰 Safari → 공유 → "홈 화면에 추가"로 앱처럼 쓸 수 있어요)

## 지금 진짜로 되는 것
- **PDF 올리기**: 기기 안에서 글자를 꺼내요 (pdf.js · 서버로 보내지 않음) → 원문, 앞 문장 3개 요약, 어려운 단어 카드
- **단어 카드 저장 · 내 단어장 · 내 생각 노트** (이 기기의 브라우저에만 저장)
- **간단한 문장 교정 카드** (예: I am agree → I agree, cafe need → cafés need)
- 선생님 목소리 읽기(선택) — 「수업 시작」을 누른 뒤에만

## 아직 예시인 것
- **뉴스 링크 불러오기**: 지금은 예시 기사(실제 뉴스 아님)로 수업해요
- **토론 대사**: 미리 써둔 예시 대본이에요. 내 답에 맞춰 반응은 하지만 진짜 AI는 아니에요. 진짜 AI 토론은 다음 단계에서 연결할 예정이에요.

## 안내
- 회원가입·광고·분석 도구 없음, API 키 없음
- 디자인: 「프리미엄 다크 글라스」 (Pretendard 글꼴)
- 포함된 라이브러리: [pdf.js](https://github.com/mozilla/pdf.js) 4.10.38 (Apache-2.0, `vendor/pdfjs/LICENSE`)

## 개발자용
정적 파일만 있어요 (`index.html`, `app.css`, `js/`, `sw.js`). 로컬 실행: `python3 -m http.server 8140`.
테스트: `node test/e2e.js webkit 393 -` (Playwright 필요, `BASE=` 환경변수로 주소 지정).
