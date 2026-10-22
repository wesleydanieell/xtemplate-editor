import puppeteer from 'puppeteer-core';import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {once} from 'node:events';
import {readFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';
import {readdirSync,existsSync} from 'node:fs';import {homedir} from 'node:os';import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{try{const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html');if(!file.startsWith(root+sep))throw Error('path');const body=await readFile(file);res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp'}[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base=resolve(homedir(),'.cache/ms-playwright');const candidate=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium',...(existsSync(base)?readdirSync(base):[]).filter(x=>x.startsWith('chromium-')).map(x=>resolve(base,x,'chrome-linux64/chrome'))].find(x=>x&&existsSync(x));assert(candidate);
const browser=await puppeteer.launch({headless:true,executablePath:candidate,args:['--no-sandbox']});
try{
for(const [width,height,mobile] of [[1440,900,false],[390,844,true]]){
const page=await browser.newPage();await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
const basics=await page.evaluate(()=>({undo:!!document.querySelector('#undoBtn>.ui-icon'),redo:!!document.querySelector('#redoBtn>.ui-icon'),export:!!document.querySelector('.top-export>.ui-icon'),toggles:[...document.querySelectorAll('[data-toggle-panel]')].every(x=>x.querySelector('.ui-icon')),css:!![...document.styleSheets].find(x=>x.href?.includes('icon-system.css'))}));
assert(Object.values(basics).every(Boolean),`missing primary icons: ${JSON.stringify(basics)}`);
if(mobile)await page.click('[data-toggle-panel="layers"]');
await page.select('#topExample','cover-aurora-atlas.xtemplate');await page.waitForFunction(()=>document.querySelector('#docName')?.textContent.includes('Aurora Atlas'));
if(mobile)await page.click('[data-toggle-panel="layers"]');
const row=await page.$eval('.tree-item[data-path="items.0"] .tree-symbol',x=>({icon:!!x.querySelector('svg.ui-icon'),text:x.textContent}));assert(row.icon&&!row.text,'image layer displays vector icon only');
await page.$eval('.tree-item[data-path="items.3"]',e=>e.click());
if(mobile)await page.click('[data-toggle-panel="properties"]');
const groups=await page.$$eval('.property-block:not([hidden]) .property-block-title',xs=>xs.map(x=>({name:x.textContent.trim(),icon:!!x.querySelector(':scope > svg.ui-icon')})));
assert(groups.length>=4&&groups.every(x=>x.icon),JSON.stringify(groups));
const tool=await page.$eval('[data-tool="text"]',x=>({name:x.getAttribute('aria-label'),svg:!!x.querySelector('svg.ui-icon')}));assert(tool.svg&&tool.name.includes('text'));
 const imageTool=await page.$eval('#canvasAddImage',x=>({total:x.querySelectorAll('svg').length,lucide:x.querySelectorAll(':scope > svg.ui-icon').length,aria:x.getAttribute('aria-label')}));
 assert.deepEqual([imageTool.total,imageTool.lucide],[1,1],'image insertion tool must contain exactly one icon');
 assert.match(imageTool.aria,/image/i);
 const measured=await page.evaluate(()=>{
  const box=sel=>{const element=document.querySelector(sel);const r=element?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null;};
  return {x:box('#transformX'),y:box('#transformY'),w:box('#transformW'),h:box('#transformH'),font:box('[data-character-field="font"] select'),size:box('[data-character-field="size"] input'),baseline:box('[data-character-field="baseline"] select'),style:[...document.querySelectorAll('.character-style-row button')].map(x=>({label:x.getAttribute('aria-label'),y:x.getBoundingClientRect().y,h:x.getBoundingClientRect().height})),align:[...document.querySelectorAll('.character-alignment-row button')].map(x=>({label:x.getAttribute('aria-label'),y:x.getBoundingClientRect().y,h:x.getBoundingClientRect().height}))};
 });
 assert(Math.abs(measured.x.y-measured.y.y)<2 && Math.abs(measured.w.y-measured.h.y)<2, 'transform X/Y and W/H inputs share rows');
 assert(Math.abs(measured.x.x-measured.w.x)<2 && Math.abs(measured.y.x-measured.h.x)<2, 'transform columns align vertically');
 assert(measured.font.w>measured.size.w,'font family spans the available width');
 assert(Math.abs(measured.size.y-measured.baseline.y)<2,'size and baseline have matching top edges');
 assert.deepEqual(measured.style.map(x=>x.label),['Bold','Italic']);
 assert.deepEqual(measured.align.map(x=>x.label),['Align left','Align center','Align right']);
 for(const row of [measured.style,measured.align])assert(row.every(x=>Math.abs(x.y-row[0].y)<1 && Math.abs(x.h-row[0].h)<1),'icon buttons share exactly the same baseline and height');
 const characterLayout=await page.evaluate(()=>{
  const group=document.querySelector('#elementInspector .character-compact-actions');
  const style=group.querySelector('.character-style-row'),anchor=group.querySelector('.character-alignment-row');
  const rect=el=>{const {left,top,right,bottom,width,height}=el.getBoundingClientRect();return {left,top,right,bottom,width,height};};
  const row=el=>({rect:rect(el),heading:rect(el.querySelector('.character-action-caption')),
   buttons:[...el.querySelectorAll('.character-segment')].map(rect),control:rect(el.querySelector('.character-segmented'))});
  return {container:rect(group),columns:getComputedStyle(group).gridTemplateColumns,
   style:row(style),anchor:row(anchor),page:rect(document.querySelector('.character-page-align-row'))};
 });
 const {container,style:styleColumn,anchor:anchorColumn,page:pageRow}=characterLayout;
 assert(Math.abs(styleColumn.rect.top-anchorColumn.rect.top)<1,'Style and Text anchor should occupy a single row');
 assert(Math.abs(styleColumn.heading.top-anchorColumn.heading.top)<1,'Style and Text anchor headings should share a baseline');
 assert(Math.abs(styleColumn.control.top-anchorColumn.control.top)<1,'Style and Text anchor button bars should share a baseline');
 assert(Math.abs(styleColumn.rect.width-anchorColumn.rect.width)<2,'Style and Text anchor should divide the same width equally');
 assert(styleColumn.rect.right+5<=anchorColumn.rect.left,'Two groups must have a visible gutter');
 assert(styleColumn.rect.left>=container.left-1&&anchorColumn.rect.right<=container.right+1,'Both groups must fit inside the inspector');
 for(const col of [styleColumn,anchorColumn]){
  assert(col.buttons.every(r=>r.left>=col.control.left-.5&&r.right<=col.control.right+.5),'No style/anchor button may overflow its column');
  assert(col.buttons.every(r=>Math.abs(r.top-col.control.top)<2&&Math.abs(r.bottom-col.control.bottom)<2),'Segmented buttons align vertically');
 }
 assert(pageRow.top>=styleColumn.control.bottom,'Place on page stays in its own following row');
 const currentWeight=await page.$eval('#jsonEditor',el=>JSON.parse(el.value).items[3].weight);
 await page.click('.character-style-row [aria-label="Bold"]');
 const nextWeight=await page.$eval('#jsonEditor',el=>JSON.parse(el.value).items[3].weight);
 assert.notEqual(nextWeight,currentWeight,'Bold remains interactive in the compact two-column layout');
 await page.click('.character-alignment-row [aria-label="Align right"]');
 assert.equal(await page.$eval('#jsonEditor',el=>JSON.parse(el.value).items[3].align),'end',
  'Right text anchor remains interactive in the compact two-column layout');
if(mobile){await page.click('[data-toggle-panel="properties"]');await page.click('[data-toggle-panel="layers"]');}
await page.click('#addElement');
const insert=await page.$$eval('.context-submenu [data-add]',xs=>xs.map(x=>({type:x.dataset.add,icon:!!x.querySelector('.context-icon svg.ui-icon'),label:x.textContent.trim()})));
assert(insert.length>=14&&insert.every(x=>x.icon),`insert tools have missing icons ${JSON.stringify(insert)}`);
if(mobile)await page.click('[data-toggle-panel="layers"]');
await page.screenshot({path:`/tmp/xt-icons-${width}.png`});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
assert.deepEqual(errors,[]);console.log(`PASS icon design system ${width}x${height}: all regions, layers, contextual properties, insert menu`);
await page.close();}
}finally{await browser.close();server.close();}
