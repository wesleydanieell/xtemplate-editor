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
 assert.deepEqual(errors,[]);
 await page.close();
}finally{await browser.close();server.close();}
