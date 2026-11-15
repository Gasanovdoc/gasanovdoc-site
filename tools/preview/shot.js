// Скриншот блока страницы для проверки: node tools/preview/shot.js <папка-превью> <css-селектор> <файл.png> [ширина]
const {chromium}=require('playwright');
(async()=>{const [dir,sel,out,w='1280']=process.argv.slice(2);const b=await chromium.launch();
const p=await b.newPage({viewport:{width:+w,height:900}});await p.goto('file://'+require('path').resolve(dir)+'/index.html');
const el=p.locator(sel).first();await el.scrollIntoViewIfNeeded();await p.waitForTimeout(600);const bb=await el.boundingBox();
await p.screenshot({path:out,clip:{x:0,y:Math.max(0,bb.y-80),width:+w,height:Math.min(900,bb.height+160)}});await b.close();})();
