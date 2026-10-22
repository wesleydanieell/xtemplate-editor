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
const template={xtemplate:1,kind:'page',name:'Modifier interactions',items:[
 {type:'rect',x:'25mm',y:'25mm',w:'25mm',h:'15mm',fill:'#536d99'},
 {type:'rect',x:'25mm',y:'50mm',w:'25mm',h:'15mm',fill:'#7b9b69'},
 {type:'rect',x:'25mm',y:'75mm',w:'25mm',h:'15mm',fill:'#bb8198'}
]};
try{
 for(const [width,height,mobile] of [[1440,900,false],[390,844,true]]){
  const page=await browser.newPage();
  await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle0'});
  const load=async(name)=>{
   await page.$eval('#fileInput',(input,value)=>{
    const dt=new DataTransfer();
    dt.items.add(new File([JSON.stringify(value)],'modifier.xtemplate',{type:'application/json'}));
    input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
   },{...template,name});
   await page.waitForFunction(name=>document.querySelector('#docName')?.textContent===name,{},name);
   if(mobile)await page.click('[data-toggle-panel="layers"]');
   for(const [j,i] of [0,1,2].entries())
    await page.$eval('.tree-item[data-path="items.'+i+'"]',(el,ctrl)=>
     el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:ctrl})),j>0);
  };
  const rect=sel=>page.$eval(sel,el=>el.getBoundingClientRect().toJSON());
  const mid=b=>({x:b.x+b.width/2,y:b.y+b.height/2});
  const mm=await page.$eval('#paper',el=>el.getBoundingClientRect().width/210);
  const data=()=>page.$eval('#jsonEditor',el=>JSON.parse(el.value).items);
  await load('Shift-scale '+width);
  assert.equal(await page.$$eval('[data-smart-marker]',els=>els.length),3);
  const original=mid(await rect('[data-scale-handle="s"]'));
  await page.mouse.move(original.x,original.y);await page.keyboard.down('Shift');await page.mouse.down();
  await page.mouse.move(original.x,original.y+5*mm,{steps:6});
  await page.mouse.up();await page.keyboard.up('Shift');
  const during=await data();
  assert(Math.abs(parseFloat(during[0].w)-25)<.06,'Shift vertical scale leaves width unchanged');
  assert(parseFloat(during[0].h)>15.5,'Shift vertical scale modifies height');
  const movedFrame=await rect('#multi-scale-controls .multi-scale-outline');
  assert(movedFrame.height>0,'scale controls remain rendered throughout gesture');
  console.log('PASS '+width+'x'+height+' Shift changes height but not width');

  await load('CtrlShift-one '+width);
  const ring=mid(await rect('[data-smart-marker="items.1"] .smart-marker-hit'));
  await page.mouse.click(ring.x,ring.y);
  assert.equal(await page.$eval('#multiModeShortcutText',e=>e.textContent),'Resize · proportions locked');
  const handle=mid(await rect('#editor-selection-overlay [data-path="items.1"] [data-handle="s"]'));
  await page.mouse.move(handle.x,handle.y);
  await page.keyboard.down('Control');await page.keyboard.down('Shift');await page.mouse.down();
  await page.mouse.move(handle.x,handle.y+5*mm,{steps:6});
  await page.mouse.up();
  await page.keyboard.up('Shift');await page.keyboard.up('Control');
  const changed=await data();
  assert(Math.abs(parseFloat(changed[1].w)-25)<.06,'Ctrl Shift does not change selected width');
  assert(Math.abs(parseFloat(changed[1].h)-20)<.35,'Ctrl Shift changes selected height by pointer delta');
  assert.equal(changed[0].w,'25mm');
  assert.equal(changed[0].h,'15mm');
  assert.equal(changed[2].w,'25mm');
  assert.equal(changed[2].h,'15mm');
  assert(Math.abs(parseFloat(changed[2].y)-80)<.35,'neighbors reflow and preserve gap');
  assert.deepEqual(errors,[]);
  console.log('PASS '+width+'x'+height+' Ctrl+Shift modifies one dimension on one object, preserving 10mm gaps');
  await page.close();
 }
}finally{await browser.close();server.close();}
