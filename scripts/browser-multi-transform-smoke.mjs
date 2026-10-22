import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {resolve,extname,sep} from 'node:path';
import {readdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{try{
 const path=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html');
 if(!path.startsWith(root+sep))throw Error('path');const body=await readFile(path);
 res.writeHead(200,{'content-type':{'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'}[extname(path)]||'application/octet-stream'});res.end(body);
}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base=resolve(homedir(),'.cache/ms-playwright');
const executablePath=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium',...(existsSync(base)?readdirSync(base):[]).filter(x=>x.startsWith('chromium-')).map(x=>resolve(base,x,'chrome-linux64/chrome'))].find(x=>x&&existsSync(x));
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox']});
const template={xtemplate:1,kind:'page',name:'Multi transform',items:[
 {type:'rect',x:'20mm',y:'30mm',w:'20mm',h:'15mm',fill:'#5586c5'},
 {type:'rect',x:'55mm',y:'42mm',w:'20mm',h:'15mm',fill:'#92c4a1'},
 {type:'text',text:'Transform together',x:'30mm',y:'90mm',size:'6mm',fill:'#225599'},
 {type:'path',d:'M 90 120 L 110 120 L 110 135 L 90 135 Z',fill:'#b29ec8'},
 {type:'rect',x:'125mm',y:'65mm',w:'22mm',h:'25mm',fill:'#aa9966'}
]};
try{
 for(const [width,height,mobile] of [[1440,900,false],[390,844,true]]){
 const page=await browser.newPage();await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));page.on('dialog',dialog=>dialog.accept());
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
 await page.$eval('#fileInput',(input,raw)=>{const dt=new DataTransfer();dt.items.add(new File([raw],'multi.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},JSON.stringify(template));
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Multi transform');
 const spacingLabelStyle=await page.evaluate(()=>{
  const text=document.createElementNS('http://www.w3.org/2000/svg','text');
  text.setAttribute('class','smart-spacing-label');document.querySelector('#paper').append(text);
  const result={stroke:getComputedStyle(text).stroke,paintOrder:getComputedStyle(text).paintOrder};
  text.remove();return result;
 });
 assert.equal(spacingLabelStyle.stroke,'none','Spacing numbers have no text outline');
 if(mobile)await page.click('[data-toggle-panel="layers"]');
 const json=()=>page.$eval('#jsonEditor',x=>JSON.parse(x.value));
 await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
 await page.$eval('.tree-item[data-path="items.1"]',el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
 await page.$eval('.tree-item[data-path="items.4"]',el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
 assert(await page.$('#multi-scale-controls'),'Scale is the default for multi-selection');
 await page.keyboard.press('k');
 const handles=await page.$$eval('#editor-selection-overlay .selection-control-layer [data-handle]',els=>
  els.reduce((out,el)=>(out[el.closest('[data-path]')?.dataset.path]=(out[el.closest('[data-path]')?.dataset.path]||0)+1,out),{}));
 assert.equal(handles['items.0'],8,'First rectangle retains its own eight controls');
 assert.equal(handles['items.1'],8,'Second rectangle retains independent controls');
 assert.equal(handles['items.4'],8,'Third rectangle retains independent controls');
 assert.equal(await page.$('#multi-selection-controls'),null,'No shared stretchable frame remains');
 if(!mobile)await page.screenshot({path:'/tmp/xt-multi-selection-before.png'});
 const bottom=await page.$eval('#editor-selection-overlay [data-path="items.0"] [data-handle="s"]',el=>el.getBoundingClientRect().toJSON());
 const visibleHandle=await page.$eval('#editor-selection-overlay [data-path="items.0"] rect.transform-handle[data-handle="s"]',e=>e.getBoundingClientRect().toJSON());
 const mm=await page.$eval('#paper',e=>e.getBoundingClientRect().width/210);
 await page.mouse.move(bottom.x+bottom.width/2,bottom.y+bottom.height/2);await page.mouse.down();
 await page.mouse.move(bottom.x+bottom.width/2,bottom.y+bottom.height/2-5*mm,{steps:6});
 const duringHandle=await page.$eval('#editor-selection-overlay [data-path="items.0"] rect.transform-handle[data-handle="s"]',e=>e.getBoundingClientRect().toJSON());
 assert(Math.abs(duringHandle.width-visibleHandle.width)<1.5&&Math.abs(duringHandle.height-visibleHandle.height)<1.5,
  'Resize handles stay fixed size instead of stretching with artwork');
 assert.equal(await page.$$eval('#editor-selection-overlay .selection-control-layer [data-handle]',els=>els.length),24,
  'Three independent sets of handles remain visible during live resize');
 await page.mouse.up();
 const result=(await json()).items;
 for(const i of [0,1,4]){
  const before=template.items[i];
  const ratio=parseFloat(result[i].w)/parseFloat(before.w);
  const heightRatio=parseFloat(result[i].h)/parseFloat(before.h);
  assert(Math.abs(ratio-heightRatio)<.03,'Every rectangle retains its original proportions');
  assert.equal(result[i].y,before.y,'South handle anchors the top edge of each marked rectangle');
 }
 assert.equal(await page.$$eval('#editor-selection-overlay .selection-control-layer [data-handle]',els=>els.length),24);
 if(!mobile)await page.screenshot({path:'/tmp/xt-multi-selection-after.png'});
 await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
 assert.deepEqual((await json()).items,template.items,'Undo restores all selected heights atomically');
 // Undo intentionally clears selection. Selecting again preserves normal multi-move.
 for(const [index,ctrl] of [[0,false],[1,true],[4,true]]){
  await page.$eval(`.tree-item[data-path="items.${index}"]`,(el,ctrl)=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:ctrl})),ctrl);
 }
 await page.keyboard.press('k');
 const center=await page.$eval('#page-artwork g[data-path="items.0"] .svg-hitbox',e=>{
  const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await page.mouse.move(center.x,center.y);await page.mouse.down();
 await page.mouse.move(center.x+8*mm,center.y+7*mm,{steps:5});await page.mouse.up();
 const moved=(await json()).items;
 for(const i of [0,1,4]){
  assert(parseFloat(moved[i].x)>parseFloat(template.items[i].x)+5,'Moving any selected shape moves the full set');
 }
 await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
 assert.deepEqual((await json()).items,template.items);
 // Compatible mixed selections reuse separate outlines for text and a path.
 await page.$eval('.tree-item[data-path="items.2"]',el=>el.click());
 await page.$eval('.tree-item[data-path="items.3"]',el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
 assert.equal(await page.$('#multi-selection-controls'),null);
 await page.keyboard.press('k');
 const pathHandles=await page.$$eval('#editor-selection-overlay [data-path="items.3"] [data-handle]',els=>els.map(e=>e.dataset.handle));
 assert(pathHandles.includes('s'),'SVG path exposes independent resize controls');
 const last=await page.$eval('#editor-selection-overlay [data-path="items.3"] [data-handle="s"]',e=>e.getBoundingClientRect().toJSON());
 await page.mouse.move(last.x+last.width/2,last.y+last.height/2);await page.mouse.down();
 await page.mouse.move(last.x+last.width/2,last.y+last.height/2+5*mm,{steps:5});await page.mouse.up();
 const updated=(await json()).items;
 assert(Number.parseFloat(updated[2].size)>6,'Text font scales natively');
 assert.notEqual(updated[3].d,template.items[3].d,'SVG path coordinates scale natively');
 assert(!('transform' in updated[3]),'Export never invents transform field');
 await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
 assert.deepEqual((await json()).items,template.items,'Mixed element transform undo restores all');

 // Gap snapping must be both visible and non-destructive: the middle rectangle
 // moves to precisely equal intervals between its neighbors.
 const spacingScene={xtemplate:1,kind:'page',name:'Spacing test',items:[
  {type:'rect',x:'20mm',y:'70mm',w:'15mm',h:'20mm',fill:'#baccd8'},
  {type:'rect',x:'80mm',y:'70mm',w:'15mm',h:'20mm',fill:'#baccd8'},
  {type:'rect',x:'47mm',y:'70mm',w:'15mm',h:'20mm',fill:'#dbaabb'}
 ]};
 await page.$eval('#fileInput',(el,data)=>{const transfer=new DataTransfer();
  transfer.items.add(new File([data],'spacing.xtemplate',{type:'application/json'}));
  el.files=transfer.files;el.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(spacingScene));
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Spacing test');
 const target=await page.$eval('#page-artwork g[data-path="items.2"] > .svg-hitbox',el=>{
  const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 const pixelsPerMm=await page.$eval('#paper',el=>el.getBoundingClientRect().width/210);
 await page.mouse.move(target.x,target.y);await page.mouse.down();
 await page.mouse.move(target.x+3.5*pixelsPerMm,target.y,{steps:6});
 const guides=await page.$$eval('.smart-spacing-guide',els=>els.length);
 assert(guides>=2,'paired interval guides appear during equal-spacing snapping');
 if(!mobile){
  const labels=await page.$$eval('.smart-spacing-label',els=>els.map(el=>({
   label:el.textContent,stroke:getComputedStyle(el).stroke
  })));
  assert(labels.length>=2&&labels.every(el=>el.stroke==='none'),'gap values show without outlines');
  await page.screenshot({path:'/tmp/xt-spacing-no-label-outline.png'});
 }
 await page.mouse.up();
 assert(Math.abs(Number.parseFloat((await json()).items[2].x)-50)<.2,
  'equal-gap snapping positions the moving shape 15mm from each neighbor');
 // The official top-level .xtemplate kind can be changed from the visible
 // document tab or from File > Document properties, and survives serialization.
 assert.equal(await page.$eval('#templateKindQuick',el=>el.value),'page');
 await page.$eval('#templateKindQuick',el=>{
  el.value='cover';el.dispatchEvent(new Event('change',{bubbles:true}));
 });
 assert.equal((await json()).kind,'cover','Quick selector writes official cover kind');
 assert.equal(await page.$eval('#metaKind',el=>el.value),'cover','Metadata stays in sync');
 await page.$eval('#metaKind',el=>{
  el.value='page';el.dispatchEvent(new Event('change',{bubbles:true}));
 });
 assert.equal((await json()).kind,'page','Metadata writes an explicit page kind');
 assert.equal(await page.$eval('#templateKindQuick',el=>el.value),'page');

 // Creating a new cover also writes the kind into the exported JSON model.
 await page.evaluate(()=>document.querySelector('#newBtn').click());
 await page.waitForSelector('#confirmModal:not(.hidden)');
 await page.click('#acceptConfirmBtn');
 await page.waitForSelector('#newTemplateModal:not(.hidden)');
 await page.$eval('#newTemplateKind',el=>el.value='cover');
 await page.$eval('#newTemplateName',el=>el.value='Notebook cover');
 await page.$eval('#newTemplateForm',el=>el.requestSubmit());
 const fresh=await json();
 assert.equal(fresh.kind,'cover','New cover uses official kind=cover');
 assert.equal(fresh.name,'Notebook cover');
 assert.deepEqual(fresh.items,[]);
 assert.equal(await page.$eval('#templateKindQuick',el=>el.value),'cover');
 assert.deepEqual(errors,[],'no browser exceptions');
 console.log(`PASS ${width}x${height}: independent handles, shared edge deltas, mixed elements, page/cover kind, undo`);
 await page.close();
 }
}finally{await browser.close();server.close();}
