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
const template={xtemplate:1,kind:'page',name:'Controls follow movement',items:[
 {type:'rect',x:'20mm',y:'20mm',w:'30mm',h:'16mm',fill:'#6688bb'},
 {type:'rect',x:'20mm',y:'46mm',w:'30mm',h:'16mm',fill:'#bb9955'},
 {type:'rect',x:'20mm',y:'72mm',w:'30mm',h:'16mm',fill:'#66bb99'}
]};
try{
 for(const [width,height,mobile] of [[1440,900,false],[390,844,true]]){
  const page=await browser.newPage();await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle0'});
  await page.$eval('#fileInput',(input,data)=>{const dt=new DataTransfer();
   dt.items.add(new File([JSON.stringify(data)],'controls.xtemplate',{type:'application/json'}));
   input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  },template);
  await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Controls follow movement');
  if(mobile)await page.click('[data-toggle-panel="layers"]');
  for(const [j,i] of [0,1,2].entries())await page.$eval('.tree-item[data-path="items.'+i+'"]',(el,ctrl)=>
   el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:ctrl})),j>0);
  assert(await page.$('#multi-scale-controls'),'Scale frame should be visible by default');
  assert.equal(await page.$$eval('[data-smart-marker]',els=>els.length),3);
  const start=await page.$eval('#page-artwork g[data-path="items.0"] .svg-hitbox',el=>{
   const r=el.getBoundingClientRect();return {x:r.x+r.width*.23,y:r.y+r.height*.23};
  });
  const mm=await page.$eval('#paper',el=>el.getBoundingClientRect().width/210);
  const baselines=await page.evaluate(()=>{
   const selector={
    artwork:'#page-artwork g[data-path="items.0"]',
    handle:'#editor-selection-overlay .selection-control-layer[data-path="items.0"]',
    shared:'#multi-scale-controls',
    smart:'#smart-selection-overlay'
   };
   return Object.fromEntries(Object.entries(selector).map(([name,query])=>{
    const el=document.querySelector(query);if(!el)throw new Error(name+' missing');
    return [name,el.getBoundingClientRect().toJSON()];
   }));
  });
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x+7*mm,start.y+4*mm,{steps:5});
  const preview=await page.evaluate(()=>{
   const selectors={
    artwork:'#page-artwork g[data-path="items.0"]',
    handle:'#editor-selection-overlay .selection-control-layer[data-path="items.0"]',
    shared:'#multi-scale-controls',
    smart:'#smart-selection-overlay'
   };
   return Object.fromEntries(Object.entries(selectors).map(([name,query])=>{
    const el=document.querySelector(query);return [name,{rect:el.getBoundingClientRect().toJSON(),
      transform:el.getAttribute('transform')||''}];
   }));
  });
  for(const key of ['artwork','handle','shared','smart']){
   const expected=preview.artwork.rect.x-baselines.artwork.x;
   const actual=preview[key].rect.x-baselines[key].x;
   assert(Math.abs(actual-expected)<2.0,key+' follows artwork horizontally: '+actual+' vs '+expected);
   const expectedY=preview.artwork.rect.y-baselines.artwork.y;
   const actualY=preview[key].rect.y-baselines[key].y;
   assert(Math.abs(actualY-expectedY)<2.0,key+' follows artwork vertically: '+actualY+' vs '+expectedY);
  }
  assert(preview.shared.transform.includes('translate('),'group scale handles moved during drag');
  assert(preview.smart.transform.includes('translate('),'pink selection markers moved during drag');
  await page.mouse.up();
  const model=await page.$eval('#jsonEditor',el=>JSON.parse(el.value).items);
  assert(model.every(item=>parseFloat(item.x)>20),'all three shapes moved');
  assert.deepEqual(errors,[]);
  console.log('PASS '+width+'x'+height+': artwork, individual handles, scale frame and pink markers move together');
  await page.close();
 }
}finally{await browser.close();server.close();}
