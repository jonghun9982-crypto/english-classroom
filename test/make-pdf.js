const {chromium}=require('/workspace/wk/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file:///workspace/english-classroom/test/sample-article.html');
await p.pdf({path:'/workspace/english-classroom/test/sample-article.pdf',format:'A4'});await b.close();})();
