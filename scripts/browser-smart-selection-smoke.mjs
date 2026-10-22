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
const template={xtemplate:1,kind:'page',name:'Smart selection testing',items:[
 {type:'rect',x:'25mm',y:'25mm',w:'25mm',h:'15mm',fill:'#4b96d2',stroke:'#223344',strokeWidth:'0.4mm'},
 {type:'rect',x:'25mm',y:'50mm',w:'25mm',h:'15mm',fill:'#76b6ac'},
 {type:'rect',x:'25mm',y:'75mm',w:'25mm',h:'15mm',fill:'#c08bb7'}
]};
try{
 for(const [width,height,mobile] of [[1440,900,false],[390,844,true]]){
  const page=await browser.newPage();await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
  await page.$eval('#fileInput',(el,raw)=>{
   const dt=new DataTransfer();dt.items.add(new File([raw],'smart.xtemplate',{type:'application/json'}));
   el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));
  },JSON.stringify(template));
  await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Smart selection testing');
  if(mobile)await page.click('[data-toggle-panel="layers"]');
  const json=()=>page.$eval('#jsonEditor',el=>JSON.parse(el.value));
  await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
  for(const i of [1,2])await page.$eval(`.tree-item[data-path="items.${i}"]`,
   el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
  assert.equal(await page.$$eval('[data-smart-marker]',nodes=>nodes.length),3,'three smart rings visible');
  assert.equal(await page.$eval('#multiModeShortcutText',el=>el.textContent),'Scale · selection + spacing');
  assert.equal(await page.$eval('[data-multi-mode="scale"]',el=>el.getAttribute('aria-current')),'true');
  assert.equal(await page.$$eval('#multi-scale-controls [data-scale-handle]',els=>els.length),8,
   'Scale is the default and has eight shared handles');
  await page.keyboard.press('k');
  assert.equal(await page.$eval('#multiModeShortcutText',el=>el.textContent),'Resize · proportions locked');
  assert.equal(await page.$eval('[data-multi-mode="edit"]',el=>el.getAttribute('aria-current')),'true');
  assert.equal(await page.$$eval('[data-smart-gap]',nodes=>nodes.length),2,'two pink equal gap bars visible');
  assert.equal(await page.$eval('#smartSelectionGap',el=>Number(el.value)),10);
  const scale=await page.$eval('#paper',e=>e.getBoundingClientRect().width/210);
  const ring=await page.$eval('[data-smart-marker="items.1"] .smart-marker-hit',
   e=>e.getBoundingClientRect().toJSON());
  await page.mouse.click(ring.x+ring.width/2,ring.y+ring.height/2);
  assert.deepEqual(await page.$$eval('[data-smart-marker][data-smart-marked="true"]',
   els=>els.map(el=>el.dataset.smartMarker)),['items.1'],'single smart ring marks one layer');
  assert.equal(await page.$$eval('#editor-selection-overlay [data-smart-marked="false"] .transform-handle',els=>
   els.every(el=>getComputedStyle(el).display==='none')),true,
   'unmarked objects retain outlines without intrusive active resize handles');
  await page.$eval('[data-smart-marker="items.2"]',el=>{
   el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,shiftKey:true,button:0,pointerId:7}));
   document.querySelector('#paper').dispatchEvent(new PointerEvent('pointerup',{
    bubbles:true,shiftKey:true,button:0,pointerId:7
   }));
  });
  assert.deepEqual(await page.$$eval('[data-smart-marker][data-smart-marked="true"]',
   els=>els.map(el=>el.dataset.smartMarker)),['items.1','items.2'],
   'Shift-click marks multiple smart-selection objects');
  await page.$eval('[data-smart-marker="items.1"]',el=>{
   el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:8}));
   document.querySelector('#paper').dispatchEvent(new PointerEvent('pointerup',{
    bubbles:true,button:0,pointerId:8
   }));
  });

  const handle=await page.$eval('#editor-selection-overlay [data-path="items.1"] [data-handle="s"]',
   e=>e.getBoundingClientRect().toJSON());
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);
  await page.mouse.down();
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2+5*scale,{steps:6});
  await page.mouse.up();
  const moving=await json();
  assert(Math.abs(parseFloat(moving.items[1].h)-20)<.4,'marked layer increases its height');
  assert(Math.abs(parseFloat(moving.items[2].y)-80)<.4,'following layer reflows to retain 10mm gap');
  assert.equal(moving.items[0].h,'15mm','unmarked previous size unchanged');
  assert.equal(moving.items[2].h,'15mm','unmarked following size unchanged');
  assert(Math.abs(parseFloat((await json()).items[2].y)-80)<.4);
  if(!mobile)await page.screenshot({path:'/tmp/xt-smart-selection-resize.png'});
  await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
  assert.deepEqual((await json()).items,template.items,'reflow and resize undo together');
  // Undo clears selection, so select again for spacing and scale.
  await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
  for(const i of [1,2])await page.$eval(`.tree-item[data-path="items.${i}"]`,
   el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
  await page.keyboard.press('k');
  const gap=await page.$eval('[data-smart-gap="0"] .smart-selection-gap-hit',
   e=>e.getBoundingClientRect().toJSON());
  await page.mouse.move(gap.x+gap.width/2,gap.y+gap.height/2);
  await page.mouse.down();
  await page.mouse.move(gap.x+gap.width/2,gap.y+gap.height/2+6*scale,{steps:6});
  await page.mouse.up();
  const spaced=await json();
  assert(Math.abs(parseFloat(spaced.items[1].y)-56)<.4,'gap drag shifts second layer');
  assert(Math.abs(parseFloat(spaced.items[2].y)-87)<.4,'gap drag adjusts all intervals');
  await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
  assert.deepEqual((await json()).items,template.items,'spacing adjustment undo restores document');
  await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
  for(const i of [1,2])await page.$eval(`.tree-item[data-path="items.${i}"]`,
   el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
  await page.keyboard.press('k');
  await page.$eval('#smartSelectionGap',el=>{
   el.value='13';el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  assert.equal(parseFloat((await json()).items[1].y),53,'numeric gap control matches visual behavior');
  assert.equal(parseFloat((await json()).items[2].y),81);
  await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
  assert.deepEqual((await json()).items,template.items);

  // Explicit Figma Scale tool mode: whole selection scales with positions,
  // while visual handles remain constant-size and untransformed.
  await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
  for(const i of [1,2])await page.$eval(`.tree-item[data-path="items.${i}"]`,
   el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
  assert.equal(await page.$$eval('#multi-scale-controls [data-scale-handle]',els=>els.length),8);
  assert.equal(await page.$eval('#multiModeShortcutText',el=>el.textContent),'Scale · selection + spacing');
  assert.equal(await page.$eval('[data-multi-mode="scale"]',el=>el.getAttribute('aria-current')),'true');
  assert.equal(await page.$$eval('[data-smart-marker]',els=>els.length),3,'reorder dots remain visible in default Scale');
  const scaleHandle=await page.$eval('[data-scale-handle="se"]',el=>el.getBoundingClientRect().toJSON());
  await page.mouse.move(scaleHandle.x+scaleHandle.width/2,scaleHandle.y+scaleHandle.height/2);
  await page.mouse.down();
  await page.mouse.move(scaleHandle.x+scaleHandle.width/2+12*scale,scaleHandle.y+scaleHandle.height/2+15*scale,{steps:5});
  const scaleKnob=await page.$eval('#multi-scale-controls .multi-scale-knob',el=>el.getBoundingClientRect().toJSON());
  assert(scaleKnob.width<14&&scaleKnob.height<14,'scale handles do not get stretched');
  await page.mouse.up();
  const scaled=(await json()).items;
  assert(parseFloat(scaled[0].w)>25&&parseFloat(scaled[2].y)>75,'Scale mode changes content and spacing');
  assert(parseFloat(scaled[0].strokeWidth)>.4,'Scale tool scales explicitly authored stroke widths');
  await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
  assert.deepEqual((await json()).items,template.items,'group scale has single Undo step');
  await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
  for(const i of [1,2])await page.$eval(`.tree-item[data-path="items.${i}"]`,
   el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
  assert.equal(await page.$('#multi-scale-controls')!==null,true,'New selections start in Scale');
  assert.equal(await page.$$eval('[data-smart-marker]',els=>els.length),3,'Reorder dots remain visible');
  await page.keyboard.press('k');
  assert.equal(await page.$('#multi-scale-controls'),null,'K switches from Scale to Resize');
  assert.equal(await page.$eval('#multiModeShortcutText',el=>el.textContent),'Resize · proportions locked');
  await page.keyboard.press('k');
  assert.equal(await page.$('#multi-scale-controls')!==null,true,'K switches back to default Scale');

  assert.deepEqual(errors,[],'No browser exceptions');
  console.log(`PASS ${width}x${height}: Smart Selection mark, resize/reflow, pink gap drag, Scale tool, undo`);
  await page.close();
 }
}finally{await browser.close();server.close();}
