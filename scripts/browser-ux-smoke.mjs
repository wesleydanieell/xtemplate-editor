/** Purpose-built browser regression for task-first inspector and adaptive docks. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {readdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json','.xtemplate':'application/octet-stream','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html');
 if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 const content=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(content);
}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const bases=['/usr/bin/chromium','/usr/bin/google-chrome',...readdirSync(resolve(homedir(),'.cache/ms-playwright')).filter(x=>x.startsWith('chromium-')).map(x=>resolve(homedir(),'.cache/ms-playwright',x,'chrome-linux64/chrome'))];
const executablePath=process.env.XTEMPLATE_BROWSER_PATH||bases.find(x=>existsSync(x));assert(executablePath,'Chromium executable required');
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});
const errors=[];
const doc={xtemplate:1,name:'Inspector test',kind:'cover',items:[
 {type:'text',text:'Example copy',x:'20mm',y:'20mm',size:'5mm',font:'serif',fill:'#123456'},
 {type:'repeat',axis:'y',period:'8mm',count:4,children:[{type:'hline',stroke:'#64748b'}]},
 {type:'rect',x:'20mm',y:'55mm',w:'100mm',h:'40mm',rx:'3mm',fill:'#aabbcc'}
]};
try{
 for(const [width,height] of [[1536,960],[1024,768]]){
 const page=await browser.newPage();await page.setViewport({width,height});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
 await page.click('#addElement');
 const insertCategories=await page.$$eval('.context-submenu .insert-category-label',xs=>xs.map(x=>x.textContent));
 assert.deepEqual(insertCategories,['Everyday','Lines & paper','Vector drawing','Layout']);
 const available=await page.$$eval('.context-submenu button[data-add]',xs=>xs.map(x=>x.dataset.add));
 assert(available.includes('image')&&available.includes('repeat')&&available.includes('path'));
 await page.type('.insert-search','polygon');
 const inserts=await page.$$eval('.context-submenu button[data-add]',xs=>xs.filter(x=>!x.hidden).map(x=>x.dataset.add));
 assert.deepEqual(inserts,['polygon']);
 await page.$eval('.insert-search',x=>{x.value='';x.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.click('[data-left-tab="layers"]');
 const withoutOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
 assert(withoutOverflow,`${width}px: initial workspace overflows viewport`);
 const shell=await page.$eval('#elementInspector',x=>({blocks:x.querySelectorAll('.property-block').length,oneWidth:x.querySelectorAll('#transformW').length,oneText:x.querySelectorAll('#elementText').length}));
 assert.equal(shell.blocks,5);assert.equal(shell.oneWidth,1);assert.equal(shell.oneText,1);
 const toggle=async(name)=>page.click(`[data-toggle-panel="${name}"]`);
 await toggle('layers');
 assert.equal(await page.$eval('.app',x=>x.classList.contains('app--hide-layers')),true);
 assert.equal(await page.$eval('[data-toggle-panel="layers"]',x=>x.getAttribute('aria-pressed')),'false');
 await toggle('properties');
 const stage=await page.$eval('.workspace',x=>x.getBoundingClientRect().width);
 assert(stage>width*.6,`${width}px: canvas focus should reclaim dock space`);
 await toggle('layers');await toggle('properties');
 assert.equal(await page.$eval('[data-toggle-panel="layers"]',x=>x.getAttribute('aria-pressed')),'true');
 assert.equal(await page.$eval('[data-toggle-panel="properties"]',x=>x.getAttribute('aria-pressed')),'true');
 await page.keyboard.down('Alt');await page.keyboard.press('Digit1');await page.keyboard.up('Alt');
 assert.equal(await page.$eval('.app',x=>x.classList.contains('app--hide-layers')),true);
 await page.keyboard.down('Alt');await page.keyboard.press('Digit1');await page.keyboard.up('Alt');
 await page.click('[data-left-tab="templates"]');
 const count=await page.$$eval('#topExample option',opts=>opts.filter(x=>x.value).length);
 assert(count>=25,'all examples retained');
 await page.click('[data-template-category="Covers"]');
 const covers=await page.$$eval('#topExample option',opts=>opts.filter(x=>x.value).map(x=>x.value));
 assert(covers.length>=2&&covers.every(x=>x.startsWith('cover-')),'cover category restricts results');
 await page.click('[data-template-category="All"]');
 await page.type('.template-search','cornell');
 const matches=await page.$$eval('#topExample option',opts=>opts.filter(x=>x.value).map(x=>x.value));
 assert(matches.length===1&&matches[0]==='cornell.xtemplate','case insensitive search filters presets');
 await page.$eval('.template-search',x=>{x.value='';x.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.select('#topExample','study-watermark.xtemplate');
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent.includes('Study Notes'));
 await page.click('[data-left-tab="layers"]');
 await page.$eval('#fileInput',(el,raw)=>{const dt=new DataTransfer();dt.items.add(new File([raw],'ux-test.xtemplate',{type:'application/json'}));el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));},JSON.stringify(doc));
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Inspector test');
 const select=path=>page.$eval(`.tree-item[data-path="${path}"]`,el=>el.click());
 await select('items.0');
 const textState=await page.evaluate(()=>({kind:document.querySelector('.inspector-blocks')?.dataset.propertyType,content:!document.querySelector('[data-block="content"]').hidden,typography:document.querySelector('[data-block="specific"] .property-block-title')?.textContent.trim(),fields:[...document.querySelectorAll('[data-block="content"] input')].map(x=>x.id),styles:!document.querySelector('[data-block="appearance"]').hidden}));
 assert.equal(textState.kind,'text');assert(textState.content);assert.equal(textState.typography,'Typography');assert(textState.fields.includes('elementText'));assert(textState.styles);
 const chars=await page.$$eval('#advancedInspector .character-controls [data-character-field]',items=>items.map(item=>({key:item.dataset.characterField,rect:item.getBoundingClientRect().toJSON()})));
 assert.deepEqual(chars.map(x=>x.key),['font','size','weight','italic','align','baseline']);
 assert(Math.abs(chars[1].rect.y-chars[2].rect.y)<3,'size and weight should use the same compact row');
 assert(Math.abs(chars[2].rect.bottom-chars[3].rect.bottom)<6,'italic toggle should share the size/weight row');
 await page.$eval('#advancedInspector [data-character-field="size"] input',el=>{el.value='15mm';el.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(await page.$eval('#jsonEditor',x=>JSON.parse(x.value).items[0].size),'15mm');
 await page.$eval('#advancedInspector [data-character-field="italic"] input',el=>el.click());
 assert.equal(await page.$eval('#jsonEditor',x=>JSON.parse(x.value).items[0].italic),true);
 await page.$eval('#elementText',x=>{x.value='Edited without losing features';x.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(await page.$eval('#jsonEditor',x=>JSON.parse(x.value).items[0].text),'Edited without losing features');
 await select('items.1');
 assert.equal(await page.$eval('[data-block="specific"] .property-block-title',x=>x.textContent),'Repeat pattern');
 assert.equal(await page.$eval('[data-block="content"]',x=>x.hidden),true);
 assert.equal(await page.$eval('#advancedInspector [data-field-keys="axis"] select',x=>x.value),'y');
 await select('items.2');
 assert.equal(await page.$eval('[data-block="specific"] .property-block-title',x=>x.textContent),'Shape settings');
 assert.equal(await page.$eval('#advancedInspector [data-field-keys="rx"] input',x=>x.value),'3mm');
 assert.equal(await page.$eval('[data-block="technical"] details',x=>x.open),false);
 const ids=await page.$$eval('#elementInspector input[id]',xs=>xs.map(x=>x.id));
 assert.equal(ids.length,new Set(ids).size,'inspector must have one authoritative input per property');
 await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());
 await page.$eval('.tree-item[data-path="items.2"]',el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
 const multiGroups=await page.$$eval('#multiPropertyInspector .multi-property-block h3',xs=>xs.map(x=>x.textContent));
 assert(multiGroups.includes('Appearance'),'multiple selection should group shared color properties');
 assert(multiGroups.includes('Transform'),'multiple selection should group shared positions');

 const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert(overflow.doc<=overflow.viewport+1,`${width}px: workspace overflows after inspector changes`);
 console.log(`PASS ${width}x${height}: adaptive docks, categorized templates, contextual property groups, editable controls`);
 if(process.env.UX_SCREENSHOT){await page.select('#topExample','cover-aurora-atlas.xtemplate');await page.waitForFunction(()=>document.querySelector('#docName')?.textContent.includes('Aurora Atlas'));await page.$eval('.tree-item[data-path="items.0"]',el=>el.click());await page.screenshot({path:`/tmp/xt-studio-ui-v3-${width}.png`});}
 await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();}
