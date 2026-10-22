import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';
import {once} from 'node:events';import {resolve,extname,sep} from 'node:path';import {fileURLToPath} from 'node:url';
import {existsSync,readdirSync} from 'node:fs';import {homedir} from 'node:os';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{try{const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html');if(!file.startsWith(root+sep))throw Error('invalid path');const body=await readFile(file);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp'};res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const cached=resolve(homedir(),'.cache/ms-playwright');const candidates=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium','/usr/bin/google-chrome',...readdirSync(cached).filter(x=>x.startsWith('chromium-')).map(x=>resolve(cached,x,'chrome-linux64/chrome'))];const executablePath=candidates.find(x=>x&&existsSync(x));assert(executablePath);
const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox']});
try{
 for(const [width,height] of [[390,844],[360,740]]){
  const page=await browser.newPage();await page.setViewport({width,height,isMobile:true,deviceScaleFactor:2,hasTouch:true});
  const errors=[];page.on('pageerror',x=>errors.push(x.message));page.on('dialog',x=>x.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
  assert.equal(await page.$eval('.app',x=>x.classList.contains('app--hide-layers')&&x.classList.contains('app--hide-properties')),true);
  const initial=await page.evaluate(()=>({vw:innerWidth,doc:document.documentElement.scrollWidth,canvas:document.querySelector('.workspace').getBoundingClientRect().width,paper:document.querySelector('#paper').getBoundingClientRect().width,tools:document.querySelector('.canvas-tools').getBoundingClientRect().width,body:document.body.getBoundingClientRect().height}));
  assert(initial.doc<=width+2,`${width}: document horizontal overflow ${JSON.stringify(initial)}`);
  assert(initial.canvas>=width-2&&initial.paper>125&&initial.tools<width,`${width}: stage or tools do not fit ${JSON.stringify(initial)}`);
  await page.click('[data-toggle-panel="layers"]');
  assert.equal(await page.$eval('.app',x=>x.classList.contains('app--hide-layers')),false);
  await page.click('[data-left-tab="templates"]');
  await page.select('#topExample','cover-aurora-atlas.xtemplate');
  await page.waitForFunction(()=>document.querySelector('#docName')?.textContent.includes('Aurora Atlas'));
  assert.equal(await page.$eval('.app',x=>x.classList.contains('app--hide-layers')),true,'template selection closes drawer');
  await page.click('[data-toggle-panel="layers"]');
  await page.click('[data-left-tab="layers"]');
  await page.$eval('.tree-item[data-path="items.0"]',x=>x.click());
  assert.equal(await page.$eval('.app',x=>x.classList.contains('app--hide-layers')),true,'layer selection returns to canvas');
  await page.click('[data-toggle-panel="properties"]');
  assert.equal(await page.$eval('.app',x=>x.classList.contains('app--hide-properties')),false);
  assert.equal(await page.$eval('[data-block="specific"] .property-block-title',x=>x.textContent),'Image');
  await page.click('[data-image-crop="toggle"]');
  assert.equal(await page.$eval('[data-image-crop="toggle"]',x=>x.textContent.trim()),'Apply crop');
  await page.click('[data-image-crop-cancel]');
  assert.equal(await page.$eval('[data-image-crop="toggle"]',x=>x.textContent.trim()),'Crop image');
  await page.click('[data-toggle-panel="properties"]');
  assert.equal(await page.$eval('.app',x=>x.classList.contains('app--hide-properties')),true);
  await page.screenshot({path:`/tmp/xt-mobile-${width}.png`});
  const end=await page.evaluate(()=>({vw:innerWidth,doc:document.documentElement.scrollWidth,stage:document.querySelector('.workspace').getBoundingClientRect().width}));
  assert(end.doc<=width+2&&end.stage>=width-2);
  assert.deepEqual(errors,[]);
  console.log(`PASS phone ${width}x${height}: canvas-first, template drawer, layers, crop controls, no overflow`);
  await page.close();
 }
}finally{await browser.close();server.close();}
