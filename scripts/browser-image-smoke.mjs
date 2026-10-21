import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {readTemplate,writeTemplate} from '../src/core/xtemplate-package.js';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {existsSync,readdirSync} from 'node:fs';
import {homedir,tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/, '')||'index.html';
 const filename=path.resolve(repo,relative);if(filename!==repo&&!filename.startsWith(repo+path.sep))throw Error('Forbidden');
 const body=await fs.readFile(filename);res.writeHead(200,{'content-type':mime[path.extname(filename)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const port=server.address().port;
const originals={xtemplate:1,name:'Official-style cover',kind:'cover',items:[
 {type:'rect',fill:'#244658',stroke:'none'},
 {type:'image',src:'images/studio.webp',x:'20mm',y:'30mm',w:'150mm',h:'140mm',fit:'cover',position:'center'}]};
const artwork=await fs.readFile(path.join(repo,'docs/images/studio-overview.webp'));
const asset=new Map([['images/studio.webp',new Uint8Array(artwork)]]);
const sample=new Uint8Array(await writeTemplate(originals,asset).arrayBuffer());
const candidates=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium','/usr/bin/google-chrome','/usr/bin/brave',...['chromium','chromium_headless_shell'].flatMap(kind=>{
 const base=path.resolve(homedir(),'.cache/ms-playwright');
 try{return readdirSync(base).filter(name=>name.startsWith(kind+'-')).map(name=>path.resolve(base,name,kind==='chromium'?'chrome-linux64/chrome':'chrome-linux/headless_shell'));}catch{return []}
})];
const executablePath=candidates.find(x=>x&&existsSync(x));if(!executablePath)throw Error('No Chromium executable');
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});
const page=await browser.newPage();await page.setViewport({width:1440,height:900});
const dir=await fs.mkdtemp(path.join(tmpdir(),'xtemplate-image-smoke-'));
const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
page.on('dialog',dialog=>dialog.accept());
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
 await page.$eval('#fileInput',(input,byteList)=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(byteList)],'sample.xtemplate',{type:'application/zip'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},[...sample]);
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Official-style cover');
 const images=await page.$$eval('#page-artwork image',nodes=>nodes.map(x=>({href:x.getAttribute('href'),fit:x.getAttribute('preserveAspectRatio'),w:x.getAttribute('width')})));
 console.log('IMAGES',images);assert.equal(images.length,1);assert(images[0].href.startsWith('blob:'));assert.match(images[0].fit,/slice/);
 const imgNode=await page.$eval('#jsonEditor',x=>JSON.parse(x.value).items.find(x=>x.type==='image'));
 assert.equal(imgNode.src,'images/studio.webp');
 await page.$eval('.tree-item[data-path="items.1"]',el=>el.click());
 const handles=await page.$$('#editor-selection-overlay g[data-path="items.1"] [data-handle]');
 assert.equal(handles.length,8,'image exposes resize controls');
 const fit=await page.$eval('#advancedInspector [data-field-keys="fit"] select',x=>x.value);
 assert.equal(fit,'cover');
 await page.select('#advancedInspector [data-field-keys="fit"] select','contain');
 assert.equal(await page.$eval('#jsonEditor',x=>JSON.parse(x.value).items[1].fit),'contain');
 // A contained image can have a much taller authored viewport than its
 // actual pixels. Eight handles must follow the *visible pixels*, not blanks.
 const measure=()=>page.evaluate(()=>{
  const sel=document.querySelector('#editor-selection-overlay g[data-path="items.1"] .svg-selection');
  const image=document.querySelector('#page-artwork g[data-path="items.1"] image');
  if(!sel||!image)return null;
  const bounds=sel.getBBox();return {
   x:bounds.x,y:bounds.y,w:bounds.width,h:bounds.height,
   viewport:{x:Number(image.getAttribute('x')),y:Number(image.getAttribute('y')),
    w:Number(image.getAttribute('width')),h:Number(image.getAttribute('height'))}
  };
 });
 const originalSelection=await measure();
 const aspect=1440/880; // native dimensions of docs/images/studio-overview.webp
 assert(Math.abs(originalSelection.w-150)<.05);
 assert(Math.abs(originalSelection.h-150/aspect)<.05,'contain handles match the painted image height');
 assert(originalSelection.y>30,'handles must not surround the invisible letterbox');
 const handlePoint=async name=>page.evaluate(name=>{
  const handle=document.querySelector(`#editor-selection-overlay g[data-path="items.1"] [data-handle="${name}"]`);
  const svg=document.querySelector('#paper'),box=handle.getBBox(),pt=svg.createSVGPoint();
  pt.x=box.x+box.width/2;pt.y=box.y+box.height/2;
  const coords=pt.matrixTransform(svg.getScreenCTM());return{x:coords.x,y:coords.y};
 },name);
 const shiftedScreen=async(x,y)=>page.evaluate(([x,y])=>{
  const svg=document.querySelector('#paper'),pt=svg.createSVGPoint();pt.x=x;pt.y=y;
  const screen=pt.matrixTransform(svg.getScreenCTM());return{x:screen.x,y:screen.y};
 },[x,y]);
 await page.$eval('#magneticGuidesToggle',el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}));});
 const east=await handlePoint('e'),eastNext=await shiftedScreen(originalSelection.x+originalSelection.w+20,originalSelection.y+originalSelection.h/2);
 await page.mouse.move(east.x,east.y);await page.mouse.down();await page.mouse.move(eastNext.x,eastNext.y,{steps:8});await page.mouse.up();
 const freeSize=await page.$eval('#jsonEditor',x=>JSON.parse(x.value).items[1]);
 assert.equal(freeSize.fit,'stretch','side resize becomes native independent-axis image scaling');
 assert(Math.abs(parseFloat(freeSize.w)-(originalSelection.w+20))<.2);
 assert(Math.abs(parseFloat(freeSize.h)-originalSelection.h)<.2,'east drag must not change image height');
 const freeSelection=await measure();
 assert(Math.abs(freeSelection.y-parseFloat(freeSize.y))<.1);
 assert(Math.abs(freeSelection.h-parseFloat(freeSize.h))<.1);
 assert(Math.abs(freeSelection.w-parseFloat(freeSize.w))<.1,'handles track the resized image exactly');
 const handlePositions=await page.$$eval('#editor-selection-overlay g[data-path="items.1"] [data-handle]',els=>Object.fromEntries(els.map(el=>{
  const r=el.getBBox();return[el.dataset.handle,{x:r.x+r.width/2,y:r.y+r.height/2}];
 })));
 for(const [key,expected] of Object.entries({
  nw:[freeSelection.x,freeSelection.y],n:[freeSelection.x+freeSelection.w/2,freeSelection.y],
  ne:[freeSelection.x+freeSelection.w,freeSelection.y],e:[freeSelection.x+freeSelection.w,freeSelection.y+freeSelection.h/2],
  se:[freeSelection.x+freeSelection.w,freeSelection.y+freeSelection.h],s:[freeSelection.x+freeSelection.w/2,freeSelection.y+freeSelection.h],
  sw:[freeSelection.x,freeSelection.y+freeSelection.h],w:[freeSelection.x,freeSelection.y+freeSelection.h/2]
 })){
  assert(Math.abs(handlePositions[key].x-expected[0])<.1,`image ${key} handle X matches bitmap`);
  assert(Math.abs(handlePositions[key].y-expected[1])<.1,`image ${key} handle Y matches bitmap`);
 }
 // Undo the resize and verify a Shift corner drag preserves proportions.
 await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
 await page.$eval('.tree-item[data-path="items.1"]',el=>el.click());
 const beforeCorner=await measure(),corner=await handlePoint('se');
 const endCorner=await shiftedScreen(beforeCorner.x+beforeCorner.w+15,beforeCorner.y+beforeCorner.h+4);
 await page.mouse.move(corner.x,corner.y);await page.keyboard.down('Shift');await page.mouse.down();
 await page.mouse.move(endCorner.x,endCorner.y,{steps:7});await page.mouse.up();await page.keyboard.up('Shift');
 const constrained=await page.$eval('#jsonEditor',x=>JSON.parse(x.value).items[1]);
 assert.equal(constrained.fit,'contain','Shift + corner preserves chosen fit mode');
 const constrainBounds=await measure();
 assert(Math.abs(constrainBounds.w/constrainBounds.h-originalSelection.w/originalSelection.h)<.015,
   'Shift must preserve the visible image aspect ratio');
 console.log('PASS: visible image bounds, free side resize, aligned eight handles, Shift aspect lock');
 await page.click('[data-menu-action="export"]');
 await page.waitForFunction(()=>document.querySelector('#exportSummary')?.textContent.includes('Embedded images'));
 await page.click('#confirmExportBtn');
 let files=[];for(let i=0;i<45;i++){files=(await fs.readdir(dir)).filter(x=>x.endsWith('.xtemplate'));if(files.length)break;await new Promise(r=>setTimeout(r,180));}
 assert.equal(files.length,1,'export should download one package');
 const saved=await readTemplate(await fs.readFile(path.join(dir,files[0])));
 assert.equal(saved.packaged,true);assert.equal(saved.document.items[1].fit,'contain');
 assert.equal(Buffer.compare(Buffer.from(saved.assets.get('images/studio.webp')),Buffer.from(asset.get('images/studio.webp'))),0);
 console.log('PASS: official image ZIP import, editing, export and byte-preserving roundtrip');
 // Add a new image by using the Insert menu and the local file picker.
 const png=await fs.readFile('docs/images/studio-overview.webp');
 await page.$eval('#imageFileInput',(input,data)=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(data)],'studio.webp',{type:'image/webp'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},[...png]);
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#jsonEditor').value).items.filter(n=>n.type==='image').length===2);
 const next=await page.$eval('#jsonEditor',x=>JSON.parse(x.value));
 assert.equal(next.items.filter(n=>n.type==='image').length,2);
 assert.equal(next.items.at(-1).src,'images/studio-2.webp');
 await page.$eval('.tree-item[data-path="items.2"]',el=>el.click());
 const oldSrc=next.items[2].src;
 await page.$eval('#advancedInspector button',el=>{if(el.textContent.includes('Replace image'))el.click();});
 await page.$eval('#imageFileInput',(input,data)=>{
  const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(data)],'studio.webp',{type:'image/webp'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },[...png]);
 await page.waitForFunction(old=>JSON.parse(document.querySelector('#jsonEditor').value).items[2].src!==old,{},oldSrc);
 const replaced=await page.$eval('#jsonEditor',x=>JSON.parse(x.value).items[2]);
 assert.equal(replaced.src,'images/studio-3.webp');
 await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
 const reverted=await page.$eval('#jsonEditor',x=>JSON.parse(x.value).items[2]);
 assert.equal(reverted.src,oldSrc,'replacing an image is a single undoable edit');
 console.log('PASS: add/replace images with name collision avoidance and undo');
 // Numeric scrubber regression: Width used to clamp to 300mm even when the
 // field accepted larger typed values. Test the real pointer interaction.
 await page.$eval('.tree-item[data-path="items.2"]',el=>el.click());
 await page.select('#advancedInspector [data-field-keys="fit"] select','stretch');
 await page.$eval('#transformW',el=>{
  el.value='330';el.dispatchEvent(new Event('change',{bubbles:true}));
 });
 assert.equal(parseFloat((await page.$eval('#jsonEditor',el=>JSON.parse(el.value).items[2].w))),330);
 const scrubStart=await page.$eval('#transformW',el=>{
  const label=el.closest('label').getBoundingClientRect();
  const input=el.getBoundingClientRect();
  return {x:label.left+10,y:(label.top+input.top)/2};
 });
 await page.mouse.move(scrubStart.x,scrubStart.y);
 await page.keyboard.down('Control');
 await page.mouse.down();
 await page.mouse.move(scrubStart.x+54,scrubStart.y,{steps:8});
 await page.mouse.up();await page.keyboard.up('Control');
 const scrubbedWidth=parseFloat(await page.$eval('#jsonEditor',el=>JSON.parse(el.value).items[2].w));
 assert(scrubbedWidth>350,`Ctrl + scrub must allow width above 300mm; got ${scrubbedWidth}`);
 console.log('PASS: Width scrub extends beyond 300mm with direct numeric input and drag');
 assert.deepEqual(errors,[]);console.log('PASS: add local image to Studio with editable native node');
}finally{await browser.close();server.close();await fs.rm(dir,{recursive:true,force:true});}
