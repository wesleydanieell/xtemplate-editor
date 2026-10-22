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
const executablePath=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium',...readdirSync(base).filter(x=>x.startsWith('chromium-')).map(x=>resolve(base,x,'chrome-linux64/chrome'))].find(x=>x&&existsSync(x));
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox']});
const template={xtemplate:1,kind:'page',name:'Smart reorder',items:[
 {type:'rect',x:'25mm',y:'25mm',w:'25mm',h:'15mm',fill:'#4288df'},
 {type:'rect',x:'25mm',y:'50mm',w:'25mm',h:'15mm',fill:'#73ba96'},
 {type:'rect',x:'25mm',y:'75mm',w:'25mm',h:'15mm',fill:'#ac75c0'}
]};
try{
 for(const [width,height,mobile] of [[1440,900,false],[390,844,true]]){
  const page=await browser.newPage();await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
  await page.$eval('#fileInput',(el,raw)=>{const dt=new DataTransfer();
   dt.items.add(new File([raw],'reorder.xtemplate',{type:'application/json'}));
   el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));
  },JSON.stringify(template));
  await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Smart reorder');
  if(mobile)await page.click('[data-toggle-panel="layers"]');
  const json=()=>page.$eval('#jsonEditor',el=>JSON.parse(el.value));
  const selectThree=async()=>{
   await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
   for(const i of [1,2])await page.$eval(`.tree-item[data-path="items.${i}"]`,
    el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
  };
  const rect=selector=>page.$eval(selector,el=>el.getBoundingClientRect().toJSON());
  const middle=box=>({x:box.x+box.width/2,y:box.y+box.height/2});
  const mm=await page.$eval('#paper',el=>el.getBoundingClientRect().width/210);
  await selectThree();
  assert.equal(await page.$eval('#smartMarkedCount',el=>el.textContent),'All 3 active');
  let ring=await rect('[data-smart-marker="items.1"] .smart-marker-hit');
  let m=middle(ring);
  await page.mouse.click(m.x,m.y);
  assert.deepEqual(await page.$$eval('[data-smart-marker][data-smart-marked="true"]',
   els=>els.map(el=>el.dataset.smartMarker)),['items.1']);
  assert.equal(await page.$eval('#smartMarkedCount',el=>el.textContent),'1 of 3 active');
  assert.equal(await page.$eval('#smartMarkAll',el=>el.disabled),false);
  // The explicit button restores every object without clearing selection.
  await page.$eval('#smartMarkAll',el=>el.click());
  assert.equal(await page.$eval('#smartMarkedCount',el=>el.textContent),'All 3 active');
  assert.equal(await page.$$eval('[data-smart-marker][data-smart-marked="true"]',els=>els.length),3);
  assert.equal(await page.$$eval('.tree-item.active',els=>els.length),3,
   'Restoring all keeps tree selection intact');
  // Clicking an already singly marked ring also returns to all.
  ring=await rect('[data-smart-marker="items.1"] .smart-marker-hit');
  m=middle(ring);await page.mouse.click(m.x,m.y);
  ring=await rect('[data-smart-marker="items.1"] .smart-marker-hit');
  m=middle(ring);await page.mouse.click(m.x,m.y);
  assert.equal(await page.$$eval('[data-smart-marker][data-smart-marked="true"]',els=>els.length),3);

  // Drag pink dot beyond the last item's center. Original JSON layer order
  // must remain untouched: only the visual ordering and coordinates change.
  ring=await rect('[data-smart-marker="items.1"] .smart-marker-hit');
  m=middle(ring);
  await page.mouse.move(m.x,m.y);await page.mouse.down();
  await page.mouse.move(m.x,m.y+35*mm,{steps:7});
  assert(await page.$('.smart-reorder-guide'),'reorder insertion guide follows pointer');
  if(!mobile)await page.screenshot({path:'/tmp/xt-smart-reorder-preview.png'});
  await page.mouse.up();
  let actual=(await json()).items;
  assert.equal(actual.length,3);
  assert.equal(actual[0].y,'25mm');
  assert(Math.abs(parseFloat(actual[2].y)-50)<.25,'last layer fills vacated middle slot');
  assert(Math.abs(parseFloat(actual[1].y)-75)<.25,'dragged middle layer occupies last slot');
  for(let i=0;i<3;i++){
   assert.equal(actual[i].h,template.items[i].h,'Reorder never resizes content');
   assert.equal(actual[i].fill,template.items[i].fill,'Reorder never changes layer identity or styling');
  }
  await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
  assert.deepEqual((await json()).items,template.items,'Reorder undoes in one history entry');

  // Drag the top edge of the center shape. The pointer-tracked top must
  // follow exactly, while the preceding object reflows backwards.
  await selectThree();
  ring=await rect('[data-smart-marker="items.1"] .smart-marker-hit');m=middle(ring);
  await page.mouse.click(m.x,m.y);
  const north=await rect('#editor-selection-overlay [data-path="items.1"] [data-handle="n"]');
  let p=middle(north);
  await page.mouse.move(p.x,p.y);await page.mouse.down();
  await page.mouse.move(p.x,p.y-5*mm,{steps:7});
  const floating=await page.$eval('.smart-resize-readout-text',el=>el.textContent);
  assert.match(floating,/\d+.*×.*mm/,'live W × H readout gives precise feedback');
  await page.mouse.up();
  actual=(await json()).items;
  assert(Math.abs(parseFloat(actual[1].y)-45)<.3,'north handle tracks mouse without jumping');
  assert(Math.abs(parseFloat(actual[1].h)-20)<.3,'north drag grows height by five millimeters');
  assert(Math.abs(parseFloat(actual[0].y)-20)<.3,'previous object shifts backward to preserve gap');
  assert.equal(actual[2].y,'75mm','following object stays if dragged bottom remains unchanged');
  await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
  assert.deepEqual((await json()).items,template.items,'north resize and reflow undo together');

  // Ctrl/Cmd reduces movement sensitivity to 20% *without* changing the
  // physical cursor origin; changing the modifier mid-drag must not jump.
  await selectThree();
  ring=await rect('[data-smart-marker="items.1"] .smart-marker-hit');m=middle(ring);
  await page.mouse.click(m.x,m.y);
  const south=await rect('#editor-selection-overlay [data-path="items.1"] [data-handle="s"]');
  p=middle(south);
  await page.mouse.move(p.x,p.y);
  await page.keyboard.down('Control');await page.mouse.down();
  await page.mouse.move(p.x,p.y+10*mm,{steps:8});
  const live=await page.$eval('.smart-resize-readout-text',el=>el.textContent);
  assert.match(live,/fine/,'micro-adjustment mode is visible while Ctrl/Cmd is held');
  await page.mouse.up();await page.keyboard.up('Control');
  actual=(await json()).items;
  assert(Math.abs(parseFloat(actual[1].h)-17)<.35,'fine mode yields two millimeters from ten millimeters of pointer travel');
  assert(Math.abs(parseFloat(actual[2].y)-77)<.35,'fine mode keeps intervals intact');
  await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
  assert.deepEqual((await json()).items,template.items,'fine resizing undo restores all nodes');
  // The same pink-dot reorder must work horizontally; layer stacking and
  // widths stay unchanged while the visual order changes.
  const horizontal={xtemplate:1,kind:'page',name:'Smart horizontal',items:[
   {type:'rect',x:'25mm',y:'65mm',w:'20mm',h:'15mm',fill:'#446688'},
   {type:'rect',x:'55mm',y:'65mm',w:'20mm',h:'15mm',fill:'#55aa88'},
   {type:'rect',x:'85mm',y:'65mm',w:'20mm',h:'15mm',fill:'#bb6688'}
  ]};
  await page.$eval('#fileInput',(el,raw)=>{const dt=new DataTransfer();
   dt.items.add(new File([raw],'horizontal.xtemplate',{type:'application/json'}));
   el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));
  },JSON.stringify(horizontal));
  await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Smart horizontal');
  await selectThree();
  assert.equal(await page.$eval('#smartSelectionAxis',el=>el.textContent),'↔');
  const firstDot=await rect('[data-smart-marker="items.0"] .smart-marker-hit');
  const firstCenter=middle(firstDot);
  await page.mouse.move(firstCenter.x,firstCenter.y);await page.mouse.down();
  await page.mouse.move(firstCenter.x+72*mm,firstCenter.y,{steps:8});await page.mouse.up();
  const horizontalResult=(await json()).items;
  assert(Math.abs(parseFloat(horizontalResult[1].x)-25)<.2,'second item becomes first in horizontal row');
  assert(Math.abs(parseFloat(horizontalResult[2].x)-55)<.2,'last becomes second without resizing');
  assert(Math.abs(parseFloat(horizontalResult[0].x)-85)<.2,'first item moves to the last visual slot');
  assert.equal(horizontalResult[0].fill,horizontal.items[0].fill);
  await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
  assert.deepEqual((await json()).items,horizontal.items,'horizontal reorder undo preserves stacking identities');

  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}x${height}: pink-marker drag reorder, Edit all, anchor-accurate resizing, Ctrl fine mode, undo`);
  await page.close();
 }
}finally{await browser.close();server.close();}
