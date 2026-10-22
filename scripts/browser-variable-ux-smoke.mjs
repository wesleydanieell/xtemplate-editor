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
const server=createServer(async(req,res)=>{
 try{
  const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html');
  if(!file.startsWith(root+sep))throw Error('path');
  const body=await readFile(file);
  res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp'}[extname(file)]||'application/octet-stream'});
  res.end(body);
 }catch{res.writeHead(404);res.end();}
});server.listen(0,'127.0.0.1');await once(server,'listening');
const base=resolve(homedir(),'.cache/ms-playwright');
const executablePath=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium',...(existsSync(base)?readdirSync(base):[]).filter(x=>x.startsWith('chromium-')).map(x=>resolve(base,x,'chrome-linux64/chrome'))].find(x=>x&&existsSync(x));
assert(executablePath);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox']});
const fixture={xtemplate:1,name:'Variable UX',kind:'cover',params:{
 gap:{type:'length',default:'6mm',label:'Grid spacing'},
 cols:{type:'integer',default:4,label:'Column count'},
 tint:{type:'color',default:'#2a649b',label:'Cover tint'},
},items:[
 {type:'rect',x:'10mm',y:'10mm',w:'80mm',h:'20mm',fill:'tint'},
 {type:'text',x:'12mm',y:'34mm',size:'5mm',text:'Heading '},
 {type:'repeat',axis:'x',period:'8mm',children:[{type:'hline',y:'1mm'}]},
 {type:'hatch',period:'5mm',angle:45,offset:'2mm'},
]};
const getChoices=p=>p.$$eval('#variableCompletion [role="option"] strong',els=>els.map(el=>el.textContent));
const visible=p=>p.$eval('#variableCompletion',el=>!el.classList.contains('hidden')&&el.getBoundingClientRect().height>0);
try{
 for(const [width,height,mobile] of [[1440,900,false],[390,844,true]]){
  const page=await browser.newPage();await page.setViewport({width,height,isMobile:mobile,hasTouch:mobile});
  page.on('dialog',dlg=>dlg.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
  if(mobile)await page.click('[data-toggle-panel="properties"]');
  const tabs=await page.$$eval('.right-tabs>.right-tab',buttons=>buttons.map(btn=>{
   const rect=btn.getBoundingClientRect();
   const nodes=[...btn.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
   const range=document.createRange();range.selectNodeContents(nodes[0]);
   const label=range.getBoundingClientRect();
   const icon=btn.querySelector(':scope > svg.ui-icon')?.getBoundingClientRect();
   const left=Math.min(label.left,icon?.left??label.left),right=Math.max(label.right,icon?.right??label.right);
   return {buttonCenter:rect.left+rect.width/2,labelCenter:label.left+label.width/2,visualCenter:(left+right)/2,
    centeredY:Math.abs(label.top+label.height/2-(rect.top+rect.height/2)),width:rect.width};
  }));
  assert.equal(tabs.length,2);
  for(const t of tabs)assert(Math.abs(t.visualCenter-t.buttonCenter)<2.5&&t.centeredY<4,
   `Element/Variables title must be centered at ${width}px: ${JSON.stringify(t)}`);
  await page.$eval('#fileInput',(input,raw)=>{const dt=new DataTransfer();dt.items.add(new File([raw],'variables.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},JSON.stringify(fixture));
  await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Variable UX');
  if(mobile)await page.click('[data-toggle-panel="layers"]');
  await page.$eval('.tree-item[data-path="items.0"]',x=>x.click());
  if(mobile)await page.click('[data-toggle-panel="properties"]');
  assert.equal(await page.$$eval('.value-field-hint,.color-choices select',xs=>xs.length),0,
   'redundant suggestion rows and color dropdowns have been removed');
  const inspectorHeight=await page.$eval('.appearance-section',el=>el.getBoundingClientRect().height);
  assert(inspectorHeight>0);
  // Color token + custom colors on focus, without a second control below.
  await page.$eval('#elementFill',el=>el.focus());
  assert(await visible(page));
  assert.deepEqual((await getChoices(page)).slice(0,4),['ink','accent','none','tint']);
  await page.keyboard.press('Escape');
  await page.click('#elementFill');
  assert(await visible(page),'clicking an already focused field should reopen suggestions');
  await page.$eval('#variableCompletion [role="option"]',el=>el.click());
  assert.equal(await page.$eval('#elementFill',el=>el.value),'ink');
  // Other native property values remain editable and numeric suggestions
  // work even without custom variables because W/H/i/j/pi are official.
  await page.$eval('#elementStrokeWidth',el=>el.focus());
  assert((await getChoices(page)).includes('gap'));
  assert((await getChoices(page)).includes('W'));
  // The expression settings are collapsed in the UI but must support the
  // exact same popup when expanded, not just Stroke width.
  await page.$eval('.expression-settings',el=>el.open=true);
  await page.$eval('#elementX',el=>el.focus());
  assert((await getChoices(page)).includes('cols'));
  await page.keyboard.press('Escape');
  await page.$eval('#elementType',el=>el.focus());
  assert(!(await visible(page)),'noneditable Element type never suggests variables');
  // Text content accepts {expr}, not a bare name, and shares the popup.
  if(mobile){await page.click('[data-toggle-panel="properties"]');await page.click('[data-toggle-panel="layers"]');}
  await page.$eval('.tree-item[data-path="items.1"]',x=>x.click());
  if(mobile)await page.click('[data-toggle-panel="properties"]');
  await page.$eval('#elementText',el=>{el.focus();el.setSelectionRange(el.value.length,el.value.length);});
  assert((await getChoices(page)).includes('gap'));
  await page.$eval('#variableCompletion [role="option"]',el=>[...el.parentElement.querySelectorAll('[role="option"]')].find(b=>b.querySelector('strong').textContent==='gap').click());
  assert.equal(await page.$eval('#jsonEditor',el=>JSON.parse(el.value).items[1].text),'Heading {gap}');
  // Dynamic inspector fields also support variables, while enum fields do not.
  if(mobile){await page.click('[data-toggle-panel="properties"]');await page.click('[data-toggle-panel="layers"]');}
  await page.$eval('.tree-item[data-path="items.2"]',x=>x.click());
  if(mobile)await page.click('[data-toggle-panel="properties"]');
  await page.$eval('#advancedInspector details',el=>{el.open=true;});
  await page.$eval('#advancedInspector input[data-property="period"]',el=>el.focus());
  assert((await getChoices(page)).includes('gap'),'Repeat period is a compatible numeric expression');
  await page.keyboard.press('Escape');
  await page.$eval('#advancedInspector select[data-property="axis"]',el=>el.focus());
  assert(!(await visible(page)),'Repeat axis is an enum, not an expression');
  if(mobile){await page.click('[data-toggle-panel="properties"]');await page.click('[data-toggle-panel="layers"]');}
  await page.$eval('.tree-item[data-path="items.3"]',x=>x.click());
  if(mobile)await page.click('[data-toggle-panel="properties"]');
  await page.$eval('#advancedInspector input[data-property="offset"]',el=>el.focus());
  assert((await getChoices(page)).includes('gap'),'Hatch offset is an expression field');
  await page.$eval('#advancedInspector input[data-property="angle"]',el=>el.focus());
  assert((await getChoices(page)).includes('cols'),'Hatch angle accepts numeric expressions');
  if(!mobile){
   await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
   await page.$eval('.tree-item[data-path="items.1"]',el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
   assert.equal(await page.$eval('#multiPropertyInspector',el=>!el.classList.contains('hidden')),true);
   await page.$eval('#multiPropertyInspector input[data-property="x"]',el=>el.focus());
   assert((await getChoices(page)).includes('gap'),'Batch geometry gets the same variable picker');
   await page.$eval('#multiPropertyInspector input[data-property="fill"]',el=>el.focus());
   assert((await getChoices(page)).includes('tint'),'Batch appearance gets color suggestions');
  }
  await page.click('[data-inspector="params"]');
  await page.click('[data-inspector="properties"]');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,
   'tab centering and popup do not introduce horizontal overflow');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}x${height}: centered Element/Variables, compact fields, color/numeric/text/multi inspector suggestions`);
  await page.close();
 }
}finally{await browser.close();server.close();}
