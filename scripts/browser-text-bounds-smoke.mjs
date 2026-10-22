import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {once} from 'node:events';
import {resolve,extname,sep} from 'node:path';import {fileURLToPath} from 'node:url';import {existsSync,readdirSync} from 'node:fs';import {homedir} from 'node:os';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{try{const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html');if(!file.startsWith(root+sep))throw Error('path');const body=await readFile(file);res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp'}[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');
const base=resolve(homedir(),'.cache/ms-playwright');const executablePath=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium',...readdirSync(base).filter(x=>x.startsWith('chromium-')).map(x=>resolve(base,x,'chrome-linux64/chrome'))].find(x=>x&&existsSync(x));assert(executablePath);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});
const samples=[
 {name:'baseline alphabetic',text:'Photoshop-like AaGg',size:'4mm',font:'sans',baseline:'alphabetic',align:'start'},
 {name:'large headline',text:'CHARACTER',size:'18mm',font:'serif',weight:'bold',baseline:'alphabetic'},
 {name:'center text',text:'WIDE center',size:'9mm',align:'middle',baseline:'middle'},
 {name:'right aligned',text:'Right Edge',size:'7mm',align:'end',baseline:'top'},
 {name:'ninety degrees',text:'VERTICAL type',size:'8mm',rotate:90},
 {name:'opposite rotation',text:'ROTATED',size:'5mm',rotate:270},
 {name:'empty string',text:'',size:'5mm'},
];
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900});page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
 for(const {name,...node} of samples){
  const doc={xtemplate:1,name:'Text bounds',kind:'cover',items:[{type:'text',x:'80mm',y:'80mm',...node}]};
  await page.$eval('#fileInput',(input,raw)=>{const dt=new DataTransfer();dt.items.add(new File([raw],'text.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},JSON.stringify(doc));
  await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Text bounds');
  await page.$eval('.tree-item[data-path="items.0"]',node=>node.click());
  const measurement=await page.evaluate(()=>{
   const paper=document.querySelector('#paper'),glyph=paper.querySelector('#page-artwork g[data-path="items.0"] > text'),
    selection=paper.querySelector('#editor-selection-overlay g[data-path="items.0"] > .svg-selection'),
    hit=paper.querySelector('#page-artwork g[data-path="items.0"] > .svg-hitbox'),
    rotation=paper.querySelector('#editor-selection-overlay g[data-path="items.0"] > circle.rotate-handle');
   if(!glyph||!selection||!hit||!rotation)return {error:'missing nodes'};
   const b=glyph.getBBox(),m=paper.getScreenCTM().inverse().multiply(glyph.getScreenCTM());
   const corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
   const minX=Math.min(...corners.map(p=>p.x)),minY=Math.min(...corners.map(p=>p.y)),maxX=Math.max(...corners.map(p=>p.x)),maxY=Math.max(...corners.map(p=>p.y));
   const rect=r=>({x:+r.getAttribute('x'),y:+r.getAttribute('y'),w:+r.getAttribute('width'),h:+r.getAttribute('height')});
   return {actual:{x:minX,y:minY,w:Math.max(.5,maxX-minX),h:Math.max(.5,maxY-minY)},
    outline:rect(selection),hit:rect(hit),rotate:{x:+rotation.getAttribute('cx'),y:+rotation.getAttribute('cy')},
    controls:{x:Number(document.querySelector('#transformX').value),y:Number(document.querySelector('#transformY').value),w:Number(document.querySelector('#transformW').value),h:Number(document.querySelector('#transformH').value)}};
  });
  assert(!measurement.error,name+': '+measurement.error);
  if(name==='empty string'){
   assert(measurement.outline.x>70&&measurement.outline.y>70,'empty text must keep a visible anchor near original coordinates');
   assert(measurement.outline.w>=1&&measurement.outline.h>=1);
   console.log('PASS empty text exposes usable selection anchor');continue;
  }
  for(const key of ['x','y','w','h']){
   assert(Math.abs(measurement.actual[key]-measurement.outline[key])<.04,`${name}: ${key} selection mismatches glyph ${JSON.stringify(measurement)}`);
   assert(Math.abs(measurement.actual[key]-measurement.controls[key])<.07,`${name}: ${key} properties mismatch glyph ${JSON.stringify(measurement)}`);
  }
  assert(Math.abs(measurement.rotate.x-(measurement.outline.x+measurement.outline.w/2))<.05,`${name}: rotation handle not aligned`);
  assert(Math.abs(measurement.rotate.y-(measurement.outline.y-5))<.05,`${name}: rotation handle not above text`);
  console.log('PASS',name,'actual text geometry and inspector aligned');
 }

 const example={xtemplate:1,name:'Text UX test',kind:'cover',items:[{type:'text',x:'90mm',y:'94mm',size:'7mm',text:'Edit me',align:'start',baseline:'alphabetic'}]};
 await page.$eval('#fileInput',(input,raw)=>{const dt=new DataTransfer();dt.items.add(new File([raw],'edit.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},JSON.stringify(example));
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Text UX test');
 await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
 const visual=()=>page.evaluate(()=>{
  const node=JSON.parse(document.querySelector('#jsonEditor').value).items[0];
  const glyph=document.querySelector('#page-artwork g[data-path="items.0"] > text');
  const box=glyph.getBoundingClientRect();
  const handles=[...document.querySelectorAll('#editor-selection-overlay [data-path="items.0"] .transform-handle')];
  return {node,x:box.left,y:box.top,w:box.width,h:box.height,handles:handles.length};
 });
 const initial=await visual();
 assert(initial.handles>=4,'text must have corner resize handles and rotation handle');
 await page.click('.character-alignment-row [aria-label="Align center"]');
 const centered=await visual();
 assert(centered.x<initial.x-initial.w*.35,'center alignment visually moves glyph left');
 assert.equal(centered.node.align,'middle');assert.equal(centered.node.x,initial.node.x);
 await page.click('.character-alignment-row [aria-label="Align right"]');
 const right=await visual();
 assert(right.x<centered.x-centered.w*.35,'right alignment visually moves glyph left further');
 assert.equal(right.node.align,'end');
 console.log('PASS text alignment affects visible glyph geometry');
 const before=await visual();
 await page.$eval('#transformW',el=>{el.value=String(Number(el.value)*1.5);el.dispatchEvent(new Event('change',{bubbles:true}));});
 const resized=await visual();
 assert(resized.w>before.w*1.4,`text width control must resize painted glyph: ${JSON.stringify([before,resized])}`);
 assert(Number.parseFloat(resized.node.size)>Number.parseFloat(before.node.size),'text resize updates native font size');
 assert(!Object.hasOwn(resized.node,'w')&&!Object.hasOwn(resized.node,'h'),'text must not export unsupported width/height');
 console.log('PASS text resize updates glyph and remains native .xtemplate');
 await page.$eval('.tree-item[data-path="items.0"]',x=>x.click());
 await page.$eval('#page-artwork g[data-path="items.0"] > text',el=>el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:el.getBoundingClientRect().left+12})));
 assert.equal(await page.$eval('[data-canvas-text-editor]',el=>!el.hidden),true,'double-click opens inline text editor');
 await page.$eval('.canvas-inline-text-editor',el=>{el.value='Updated directly';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal((await visual()).node.text,initial.node.text,'live editing must not push an undo snapshot until accepted');
 // JSON is deliberately synced when editing is committed, but SVG previews live.
 assert.equal(await page.$eval('#page-artwork g[data-path="items.0"] > text',el=>el.textContent),'Updated directly');
 await page.click('[data-text-cancel]');
 assert.equal((await visual()).node.text,'Edit me','Cancel restores original text');
 await page.$eval('#page-artwork g[data-path="items.0"] > text',el=>el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:el.getBoundingClientRect().left+15})));
 await page.$eval('.canvas-inline-text-editor',el=>{el.value='Final typography';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.click('[data-text-apply]');
 assert.equal((await visual()).node.text,'Final typography','Done persists edited text');
 await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
 assert.equal((await visual()).node.text,'Edit me','Undo restores text after single commit');
 console.log('PASS inline text edits: double-click, preview, Cancel, Done and Undo');
 await page.$eval('#page-artwork g[data-path="items.0"] > text',el=>el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:el.getBoundingClientRect().left+10})));
 await page.keyboard.type('Keyboard typing');
 await page.keyboard.press('Escape');
 assert.equal((await visual()).node.text,'Edit me','Esc discards actual keyboard edits');
 await page.$eval('#page-artwork g[data-path="items.0"] > text',el=>el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:el.getBoundingClientRect().left+10})));
 await page.keyboard.type('Direct');
 await page.keyboard.press('Enter');
 assert.match((await visual()).node.text,/^EdiDirectt me$/,'Enter commits text at the clicked caret position');
 await page.click('#undoBtn');
 assert.equal((await visual()).node.text,'Edit me','Undo of actual keyboard edit restores original text');
 console.log('PASS inline editor Escape, Enter, caret and real keyboard input');
 await page.click('#splitToggle');
 assert.equal(await page.$eval('#splitToggle',el=>el.getAttribute('aria-pressed')),'true');
 assert.equal(await page.$eval('#splitToggle svg.ui-icon',el=>el.getAttribute('viewBox')),'0 0 24 24');
 assert.equal(await page.$eval('#jsonPane',el=>!el.classList.contains('hidden')),true);
 await page.click('#splitToggle');
 assert.equal(await page.$eval('#splitToggle',el=>el.getAttribute('aria-pressed')),'false');
 console.log('PASS Split Editor icon and active panel state');
 // Actual mouse gestures, not synthetic state changes: dragging a corner
 // handle must scale native text and leave handles attached to painted glyphs.
 await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
 const dragBefore=await visual();
 const handle=await page.$eval('#editor-selection-overlay [data-path="items.0"] [data-handle="se"]',el=>{
  const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await page.mouse.move(handle.x,handle.y);await page.mouse.down();
 await page.mouse.move(handle.x+52,handle.y+18,{steps:8});await page.mouse.up();
 const dragAfter=await visual();
 assert(dragAfter.w>dragBefore.w*1.15,`Corner drag should resize actual text: ${JSON.stringify([dragBefore,dragAfter])}`);
 assert(!('w' in dragAfter.node||'h' in dragAfter.node),'pointer transform does not author invalid width/height');
 console.log('PASS text corner handle scales native font size');
 // Real two-press mouse gesture: re-rendering selected SVG previously
 // swallowed native dblclick and silently prevented edit on canvas.
 await page.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'doubleclick.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(example));
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Text UX test');
 const source=await page.$eval('#page-artwork g[data-path="items.0"] > text',el=>{
  const r=el.getBoundingClientRect();return{x:r.left+r.width*.43,y:r.top+r.height/2};
 });
 await page.mouse.click(source.x,source.y);await new Promise(r=>setTimeout(r,85));
 await page.mouse.click(source.x,source.y);
 assert.equal(await page.$eval('[data-canvas-text-editor]',el=>!el.hidden),true,
  'TWO genuine mouse clicks should open direct canvas text editing');
 await page.keyboard.press('Escape');
 // Selecting the text and pressing Enter is another reliable accessible path.
 await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
 await page.evaluate(()=>document.activeElement?.blur());
 await page.keyboard.press('Enter');
 assert.equal(await page.$eval('[data-canvas-text-editor]',el=>!el.hidden),true,
  'Enter on selected canvas text should open editing');
 await page.keyboard.press('Escape');
 console.log('PASS physical double click and Enter open text editing');
 // Alignment-to-page must use actual glyph frame, not raw x/y text anchor.
 const pageRect=()=>page.evaluate(()=>{
  const glyph=document.querySelector('#page-artwork g[data-path="items.0"] > text').getBoundingClientRect();
  const paper=document.querySelector('#paper').getBoundingClientRect();
  return {left:glyph.left,right:glyph.right,top:glyph.top,bottom:glyph.bottom,
    center:(glyph.left+glyph.right)/2,middle:(glyph.top+glyph.bottom)/2,
    paperLeft:paper.left,paperRight:paper.right,paperCenter:(paper.left+paper.right)/2,
    paperTop:paper.top,paperBottom:paper.bottom,paperMiddle:(paper.top+paper.bottom)/2};
 });
 // End-aligned text uses the anchor at its RIGHT edge, so copying the visual
 // bounding-box left into authored x is provably incorrect.
 await page.click('.character-alignment-row [aria-label="Align right"]');
 for(const [action,attribute,edge] of [
  ['left','left','paperLeft'],['center-x','center','paperCenter'],['right','right','paperRight'],
  ['top','top','paperTop'],['center-y','middle','paperMiddle'],['bottom','bottom','paperBottom']]){
  await page.$eval(`[data-align="${action}"]`,el=>el.click());
  const data=await pageRect();
  assert(Math.abs(data[attribute]-data[edge])<2.5,
   `Align to page ${action} misplaced glyph ${JSON.stringify(data)}`);
 }
 console.log('PASS actual left/center/right/top/middle/bottom page alignment');
 // Final pointer position and the handle's visual release point stay together.
 await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
 const handleTarget=await page.$eval('#editor-selection-overlay [data-handle="se"].transform-hit-area',el=>{
  const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};
 });
 assert(handleTarget.w>=12&&handleTarget.h>=12,`Precision hit targets must remain >=12 screen px: ${JSON.stringify(handleTarget)}`);
 await page.mouse.move(handleTarget.x,handleTarget.y);await page.mouse.down();
 await page.mouse.move(handleTarget.x+39,handleTarget.y+11,{steps:6});
 // Last pointer release at different coordinates tests coalesced move handling.
 await page.mouse.move(handleTarget.x+55,handleTarget.y+17,{steps:1});
 await page.mouse.up();
 const finalGlyph=await pageRect();
 assert(finalGlyph.right>handleTarget.x+35,`Text resize did not follow released pointer ${JSON.stringify(finalGlyph)}`);
 console.log('PASS text transform hit targets and final pointer precision');
 // At increased zoom, document-size handles must still have consistent
 // screen-pixel hit targets and not jump on pointer release.
 const rotated={...example,items:[{...example.items[0],text:'Zoomed rotation',rotate:90,align:'end',baseline:'middle'}]};
 await page.$eval('#fileInput',(input,raw)=>{const dt=new DataTransfer();dt.items.add(new File([raw],'rotated.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},JSON.stringify(rotated));
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Text UX test');
 await page.select('#zoom','150');
 await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
 await page.$eval('[data-align="center-x"]',el=>el.click());
 let position=await pageRect();
 assert(Math.abs(position.center-position.paperCenter)<3,'rotated end-aligned text centers on page at 150% zoom');
 const zoomHandle=await page.$eval('#editor-selection-overlay [data-handle="se"].transform-hit-area',el=>{
  const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};
 });
 assert(zoomHandle.w>12&&zoomHandle.w<18,'handle hit target should remain constant in screen pixels after zoom');
 const zoomBefore=await visual();
 await page.mouse.move(zoomHandle.x,zoomHandle.y);await page.mouse.down();
 await page.mouse.move(zoomHandle.x+42,zoomHandle.y+34,{steps:7});await page.mouse.up();
 const zoomAfter=await visual();
 assert(zoomAfter.w>zoomBefore.w*1.05||zoomAfter.h>zoomBefore.h*1.05,'rotated text should resize at zoom');
 assert(!('w' in zoomAfter.node||'h' in zoomAfter.node),'zoomed rotation still exports native text only');
 console.log('PASS rotated text alignment/resize precision across zoom');
 // The Text tool on an existing element must enter edit mode instead of
 // drawing an unwanted new text layer.
 await page.$eval('#fileInput',(input,raw)=>{const dt=new DataTransfer();
  dt.items.add(new File([raw],'text-tool.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(example));
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Text UX test');
 await page.select('#zoom','fit');
 await page.click('[data-tool="text"]');
 const glyphPoint=await page.$eval('#page-artwork g[data-path="items.0"] > text',el=>{
  const r=el.getBoundingClientRect();return{x:r.left+r.width*.5,y:r.top+r.height*.5};
 });
 await page.mouse.click(glyphPoint.x,glyphPoint.y);
 assert.equal(await page.$eval('[data-canvas-text-editor]',el=>!el.hidden),true,'Text tool edits existing text');
 await page.keyboard.type('typed');await page.keyboard.press('Escape');
 assert.equal(await page.$eval('#jsonEditor',el=>JSON.parse(el.value).items.length),1,
  'Text tool on existing glyph must not insert an additional layer');
 console.log('PASS Text tool enters direct edit on existing text without adding a node');
 // Responsive editor: direct edit remains visible and its actions are on-screen.
 const phone=await browser.newPage();await phone.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 phone.on('pageerror',e=>errors.push(e.message));phone.on('dialog',d=>d.accept());
 await phone.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
 await phone.$eval('#fileInput',(input,raw)=>{const dt=new DataTransfer();dt.items.add(new File([raw],'phone.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},JSON.stringify(example));
 await phone.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Text UX test');
 await phone.click('[data-toggle-panel="layers"]');
 await phone.$eval('.tree-item[data-path="items.0"]',el=>el.click());
 await phone.click('[data-toggle-panel="properties"]');
 await phone.click('[data-edit-text]');
 assert.equal(await phone.$eval('[data-canvas-text-editor]',el=>!el.hidden),true,'phone text editing opens');
 assert.equal(await phone.$eval('.app',el=>el.classList.contains('app--hide-properties')),true,'mobile drawer closed for canvas editor');
 const editing=await phone.$eval('[data-canvas-text-editor]',el=>({visible:!el.hidden,rect:el.getBoundingClientRect().toJSON(),input:el.querySelector('textarea').getBoundingClientRect().toJSON(),actions:el.querySelector('.canvas-inline-text-actions').getBoundingClientRect().toJSON()}));
 assert(editing.visible && editing.rect.left>=0&&editing.input.right<=392,`phone editor must fit viewport ${JSON.stringify(editing)}`);
 await phone.screenshot({path:'/tmp/xt-inline-mobile-390.png'});
 await phone.$eval('.canvas-inline-text-editor',el=>{el.value='Phone text';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await phone.click('[data-text-apply]');
 assert.equal(await phone.$eval('#jsonEditor',el=>JSON.parse(el.value).items[0].text),'Phone text');
 console.log('PASS phone inline edit reclaims canvas from Properties drawer');
 // Mobile taps must be able to begin a new text edit without requiring
 // a keyboard or opening Properties.
 const phoneTarget=await phone.$eval('#page-artwork g[data-path="items.0"] > text',el=>{
  const r=el.getBoundingClientRect();return{x:r.left+r.width*.45,y:r.top+r.height/2};
 });
 await phone.touchscreen.tap(phoneTarget.x,phoneTarget.y);
 await new Promise(r=>setTimeout(r,90));
 await phone.touchscreen.tap(phoneTarget.x,phoneTarget.y);
 assert.equal(await phone.$eval('[data-canvas-text-editor]',el=>!el.hidden),true,
  'double tap on phone should reopen direct text editor');
 await phone.$eval('[data-text-cancel]',el=>el.click());
 console.log('PASS mobile double-tap opens direct canvas editor');
 await phone.close();
 assert.deepEqual(errors,[]);
 await page.close();
}finally{await browser.close();server.close();}
