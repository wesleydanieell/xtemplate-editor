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
 if(!path.startsWith(root+sep))throw Error('path');
 const body=await readFile(path);
 res.writeHead(200,{'content-type':{'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'}[extname(path)]||'application/octet-stream'});res.end(body);
}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base=resolve(homedir(),'.cache/ms-playwright');
const executablePath=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium',...(existsSync(base)?readdirSync(base):[]).filter(x=>x.startsWith('chromium-')).map(x=>resolve(base,x,'chrome-linux64/chrome'))].find(x=>x&&existsSync(x));assert(executablePath);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox']});
const doc={xtemplate:1,name:'Compact inspector',kind:'page',items:[
 {type:'text',text:'Editorial typography',x:'16mm',y:'28mm',size:'8mm',fill:'#385f91',stroke:'none'},
 {type:'rect',x:'20mm',y:'45mm',w:'90mm',h:'55mm',rx:'4mm',fill:'#45aabb',stroke:'#224466',strokeWidth:'0.6mm',opacity:0.85},
 {type:'line',x1:'20mm',y1:'130mm',x2:'160mm',y2:'130mm',stroke:'#b67788',strokeWidth:'0.3mm'}
]};
try{
 for(const [width,height,mobile] of [[1440,900,false],[390,844,true]]){
  const page=await browser.newPage();await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dlg=>dlg.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
  await page.$eval('#fileInput',(el,raw)=>{
   const transfer=new DataTransfer();transfer.items.add(new File([raw],'compact.xtemplate',{type:'application/json'}));
   el.files=transfer.files;el.dispatchEvent(new Event('change',{bubbles:true}));
  },JSON.stringify(doc));
  await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Compact inspector');
  if(mobile)await page.click('[data-toggle-panel="layers"]');
  const json=()=>page.$eval('#jsonEditor',el=>JSON.parse(el.value));
  const select=path=>page.$eval(`.tree-item[data-path="${path}"]`,el=>el.click());
  await select('items.1');
  const controls=await page.evaluate(()=>{
   const rect=e=>{const b=e.getBoundingClientRect();return {width:b.width,height:b.height}};
   const keys=['fill','stroke'];
   return {
    row:keys.map(k=>rect(document.querySelector(`[data-paint-key="${k}"]`))),
    paintInput:rect(document.querySelector('.compact-paint-text')),
    swatch:rect(document.querySelector('.compact-paint-picker')),
    corner:rect(document.querySelector('.radius-field-slot input')),
    opacity:rect(document.querySelector('.compact-opacity')),
    labels:keys.map(k=>document.querySelector(`[data-paint-key="${k}"] .compact-paint-label`)?.textContent),
    editable:!!document.querySelector('#elementStrokeWidth')&&!document.querySelector('#elementStrokeWidth').disabled,
   };
  });
  assert.deepEqual(controls.labels,['Fill','Stroke']);
  assert(controls.row.every(x=>x.height<=45),'paint rows should be compact');
  assert(controls.swatch.width<=38,'color swatch should be compact');
  assert(controls.paintInput.height<=38,'color field should not be oversized');
  assert(controls.corner.height<=38,'corner-radius input should be compact');
  assert(controls.editable,'stroke width remains editable');
  assert.equal(await page.$eval('#elementFill',e=>e.value),'#45aabb');
  assert.equal(await page.$eval('#elementStroke',e=>e.value),'#224466');
  assert.equal(await page.$eval('.radius-field-slot input',e=>e.value),'4mm');
  if(!mobile)await page.screenshot({path:'/tmp/xt-inspector-compact-rectangle.png'});
  await page.$eval('#elementFill',el=>{el.value='#ff6677';el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal((await json()).items[1].fill,'#ff6677');
  await page.$eval('[data-paint-key="stroke"] .compact-paint-picker',el=>{
   el.value='#112233';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  assert.equal((await json()).items[1].stroke,'#112233');
  await page.$eval('.radius-field-slot input',el=>{el.value='8mm';el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal((await json()).items[1].rx,'8mm');
  await page.$eval('#compactOpacityValue',el=>{el.value='65';el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal((await json()).items[1].opacity,.65);
  await select('items.0');
  assert.equal(await page.$eval('[data-block="content"]',el=>el.hidden),false);
  assert.equal(await page.$eval('[data-block="appearance"]',el=>el.hidden),true);
  assert.equal(await page.$eval('[data-block="content"] #elementFill',el=>el.value),'#385f91');
  assert.equal(await page.$('[data-edit-text]'),null,'redundant edit-on-canvas button removed');
  if(!mobile)await page.screenshot({path:'/tmp/xt-inspector-compact-text.png'});
  await select('items.2');
  assert.equal(await page.$eval('[data-paint-key="fill"]',el=>el.hidden),true,'line omits irrelevant fill');
  assert.equal(await page.$eval('[data-paint-key="stroke"]',el=>el.hidden),false);
  if(mobile)await page.click('[data-toggle-panel="layers"]');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}x${height}: compact paint/radius/opacity, editing, type-specific groups`);
  await page.close();
 }
}finally{await browser.close();server.close();}
