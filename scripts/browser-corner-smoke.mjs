import assert from 'node:assert/strict';import puppeteer from 'puppeteer-core';
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {once} from 'node:events';
import {resolve,extname,sep} from 'node:path';import {readdirSync,existsSync} from 'node:fs';import {homedir} from 'node:os';import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{try{const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html');if(!file.startsWith(root+sep))throw Error('path');const body=await readFile(file);res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');
const base=resolve(homedir(),'.cache/ms-playwright'),executablePath=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium',...readdirSync(base).filter(x=>x.startsWith('chromium-')).map(x=>resolve(base,x,'chrome-linux64/chrome'))].find(x=>x&&existsSync(x));assert(executablePath);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox']});
const initial={xtemplate:1,name:'Corner geometry',kind:'cover',items:[
 {type:'rect',x:'20mm',y:'30mm',w:'70mm',h:'45mm',rx:'1mm',fill:'#b8dbe8'},
 {type:'path',d:'M 0 0 L 45 0 L 45 35 L 0 35 Z',fill:'#9bb99e',stroke:'ink'},
 {type:'text',x:'20mm',y:'130mm',size:'8mm',text:'Height check'},
 {type:'path',d:'M 0 0 C 10 0 15 10 20 10 Z',stroke:'#fa5555'}]};
try{
 for(const [width,height,mobile] of [[1440,900,false],[390,844,true]]){
 const page=await browser.newPage();await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
 await page.$eval('#fileInput',(input,data)=>{const dt=new DataTransfer();dt.items.add(new File([data],'corners.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},JSON.stringify(initial));
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Corner geometry');
 if(mobile)await page.click('[data-toggle-panel="layers"]');
 const json=()=>page.$eval('#jsonEditor',el=>JSON.parse(el.value));
 await page.$eval('.tree-item[data-path="items.0"]',x=>x.click());
 const knobs=await page.$$eval('[data-corner-control="rect"]',xs=>xs.map(x=>x.getBoundingClientRect().toJSON()));
 assert.equal(knobs.length,4,'rectangular selection has 4 corner widgets');
 const geometry=await page.$eval('[data-corner-control="rect"][data-corner-index="0"]',el=>{
  const circles=el.querySelectorAll('circle'),visual=circles[1].getBoundingClientRect(),target=circles[0].getBoundingClientRect();
  return{visual:visual.width,target:target.width};
 });
 assert(geometry.visual<=8,'visual corner marker should be small and unobtrusive');
 assert(geometry.target>=geometry.visual,'hit region should not be smaller than the visible dot');
 const p=await page.$eval('[data-corner-control="rect"][data-corner-index="1"]',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x-24,p.y+24,{steps:6});await page.mouse.up();
 const result=(await json()).items[0];
 const widgetsAfter=await page.$$eval('[data-corner-control="rect"]',els=>els.map(el=>el.getBoundingClientRect().toJSON()));
 assert.equal(widgetsAfter.length,4);
 assert(widgetsAfter[0].left>knobs[0].left&&widgetsAfter[0].top>knobs[0].top,
  'upper-left corner widget should move diagonally toward center as rounding increases');
 assert.equal(result.x,initial.items[0].x);assert.equal(result.y,initial.items[0].y);
 assert(Number.parseFloat(result.rx)>1,'rect rounding drag changes rx');
 assert(Number.parseFloat(result.rx)<=22.5,'native rectangle radius respects height/2');
 await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
 assert.equal((await json()).items[0].rx,'1mm','single undo restores previous rx');
 if(mobile)await page.click('[data-toggle-panel="layers"]');
 await page.$eval('.tree-item[data-path="items.1"]',x=>x.click());
 assert.equal(await page.$$eval('[data-corner-control="path"]',xs=>xs.length),4);
 const pc=await page.$eval('[data-corner-control="path"][data-corner-index="1"]',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
 await page.mouse.move(pc.x,pc.y);await page.mouse.down();await page.mouse.move(pc.x-26,pc.y+19,{steps:7});await page.mouse.up();
 const doc=await json(),rounded=doc.items[1].d;
 assert(rounded.includes('Q '),'path corners bake native quadratic SVG commands');
 assert(!('rx' in doc.items[1]),'path never gains unsupported rx');
 await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
 assert.equal((await json()).items[1].d,initial.items[1].d,'undo restores exact original SVG path');
 if(mobile)await page.click('[data-toggle-panel="layers"]');
 await page.$eval('.tree-item[data-path="items.3"]',x=>x.click());
 assert.equal(await page.$$eval('[data-corner-control="path"]',xs=>xs.length),0,'curved source does not expose unsafe bake handles');
 if(!mobile){
  await page.$eval('.tree-item[data-path="items.2"]',x=>x.click());
  const before=await json(),start=before.items[2];
  const sample=async()=>page.evaluate(()=>{const input=document.querySelector('#transformH'),n=JSON.parse(document.querySelector('#jsonEditor').value).items[2];return {height:Number(input.value),node:n,box:document.querySelector('#page-artwork g[data-path="items.2"] > text').getBBox().height};});
  const h=await page.$eval('#transformH',e=>{const r=e.closest('label').getBoundingClientRect();return{x:r.x+5,y:r.y+r.height/2}});
  await page.mouse.move(h.x,h.y);await page.mouse.down();let previous=null;
  for(let i=1;i<=12;i++){
   await page.mouse.move(h.x+i*4,h.y,{steps:1});const val=await sample();
   assert.equal(val.node.x,start.x);assert.equal(val.node.y,start.y,'text authored anchor should never jump while dragging Height');
   const actualSize=Number.parseFloat(val.node.size);
   if(previous!==null)assert(actualSize>=previous-.0001,'font size cannot oscillate while increasing Height');
   previous=actualSize;
  }
  await page.mouse.up();
  const final=await sample();assert.equal(final.node.y,start.y);assert(Number.parseFloat(final.node.size)>8);
 }
 assert.deepEqual(errors,[]);
 console.log(`PASS ${width}x${height}: rect rx handles; native path round corners, safe refusal, undo${mobile?'':'; stable text Height scrub'}`);
 await page.close();
 }
}finally{await browser.close();server.close();}
