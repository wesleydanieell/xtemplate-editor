/** Browser regressions for canvas selection/movement, using a locally served editor. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

const root=resolve(fileURLToPath(new URL('..', import.meta.url)));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.xtemplate':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const relative=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/, '')||'index.html';
  const path=resolve(root,relative);
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const body=await readFile(path);
  res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const port=server.address().port;
let browser;
try{
 const executablePath=process.env.XTEMPLATE_BROWSER_PATH||'/usr/bin/google-chrome';
 browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage();await page.setViewport({width:1440,height:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
 const clickMenuAction=async action=>{
  await page.click('[data-menu="insertMenu"]');
  await page.click(`#insertMenu [data-menu-action="${action}"]`);
 };
 await clickMenuAction('insert-rect');
 const sample=()=>page.evaluate(()=>{
  const element=document.querySelector('g[data-path="items.1"]');
  return{selected:document.querySelector('#selectedType').textContent,
   handles:element?.querySelectorAll('.transform-handle').length||0,
   active:[...document.querySelectorAll('.tree-item.active')].map(item=>item.dataset.path),
   transform:element?.getAttribute('transform')||null,
   box:element?.querySelector('.svg-hitbox')?.getBoundingClientRect().toJSON()};
 });
 assert.equal((await sample()).selected,'RECT');
 const box=(await sample()).box;
 const target={x:box.x+box.width/2,y:box.y+box.height/2};
 await page.mouse.click(target.x,target.y);
 let state=await sample();
 assert.equal(state.selected,'RECT','clicking an SVG node must keep it selected');
 assert(state.handles>=4,'transform controls must remain visible after selection');
 await page.mouse.move(target.x,target.y);await page.mouse.down();
 await page.mouse.move(target.x+45,target.y+27,{steps:7});
 state=await sample();
 assert(state.transform?.startsWith('translate('),'the SVG must move while the mouse is still down');
 await page.mouse.up();
 state=await sample();
 assert.equal(state.selected,'RECT','releasing a dragged node must keep selection');
 assert(state.handles>=4,'transform handles must remain after dragging');
 assert(!state.transform?.startsWith('translate('),'preview transform must be committed to node geometry');
 // Drag blank page space to begin a marquee selection (the V tool).
 const paper=await page.$eval('#paper',e=>e.getBoundingClientRect().toJSON());
 const empty={x:paper.x+18,y:paper.y+18};
 await page.mouse.move(empty.x,empty.y);await page.mouse.down();
 await page.mouse.move(empty.x+75,empty.y+75,{steps:6});
 const marquee=await page.$eval('#marquee-selection',el=>({
  fill:el.getAttribute('fill'),computedFill:getComputedStyle(el).fill,
  stroke:getComputedStyle(el).stroke,pointerEvents:getComputedStyle(el).pointerEvents}));
 assert.notEqual(marquee.fill,'black','marquee fill must be explicitly defined');
 assert.notEqual(marquee.computedFill,'rgb(0, 0, 0)','marquee must not be opaque black');
 assert.equal(marquee.pointerEvents,'none');
 await page.mouse.up();
 assert.equal(await page.$('#marquee-selection'),null,'marquee must disappear on pointerup');
 assert.deepEqual(errors,[],'the editor must not log page errors');
 console.log('PASS: SVG selection, transform handles, live drag, marquee appearance and cleanup');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
