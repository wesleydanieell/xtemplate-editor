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
 {type:'image',src:'images/studio.webp',fit:'cover',position:'center'}]};
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
 assert.deepEqual(errors,[]);console.log('PASS: add local image to Studio with editable native node');
}finally{await browser.close();server.close();await fs.rm(dir,{recursive:true,force:true});}
