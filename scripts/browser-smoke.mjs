/** Browser regressions for canvas selection/movement, using a locally served editor. */
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { editablePathNodes,closedSvgAnchorAlias } from '../src/features/vector/svg-path.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';

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
// Legacy interaction tests use a known demo fixture, while the real Studio
// startup is now intentionally empty (no elements or preset variables).
const legacyFixture={
 xtemplate:1,id:'xtemplate.studio.ruled',name:'Ruled paper',description:'Horizontal lines for writing.',license:'MIT',tags:['lines','writing'],
 params:{spacing:{type:'length',default:'8mm',min:'4mm',max:'14mm',label:'Line spacing',role:'spacing'}},
 items:[{type:'group',inset:'12mm',children:[{type:'repeat',axis:'y',period:'spacing',fit:'space',children:[{type:'hline',y:'100%',stroke:'#9eb8df',strokeWidth:'0.2mm'}]}]}]
};
async function loadLegacyFixture(page){
 await page.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'smoke-ruled.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(legacyFixture));
 await page.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Ruled paper');
}
let browser;
try{
 const candidates=[process.env.XTEMPLATE_BROWSER_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/brave', '/usr/bin/brave-browser', '/opt/google/chrome/chrome', ...['chromium','chromium_headless_shell'].flatMap(kind=>{const base=resolve(homedir(),'.cache/ms-playwright'); try{return (readdirSync(base)).filter(name=>name.startsWith(kind+'-')).map(name=>resolve(base,name,kind==='chromium'?'chrome-linux64/chrome':'chrome-linux/headless_shell'));}catch{return [];} })];
 const executablePath=candidates.find(path=>path&&existsSync(path));
 if(!executablePath) throw new Error('No Chromium-based browser found; set XTEMPLATE_BROWSER_PATH to the browser executable');
 browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});
 const page=await browser.newPage();await page.setViewport({width:1440,height:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
 const initial=JSON.parse(await page.$eval('#jsonEditor',el=>el.value));
 assert.equal(initial.xtemplate,1);
 assert.deepEqual(initial.items,[],'initial startup should have no example elements');
 assert.deepEqual(initial.params,{},'initial startup should have no example variables');
 assert.equal(await page.$eval('#nodeStatus',el=>el.textContent),'0 nodes');
 assert.equal(await page.$$('#paramsEditor .param-card').then(a=>a.length),0);
 // New template must not silently insert variables, sample shapes, or a license.
 const blankPage=await browser.newPage();
 await blankPage.setViewport({width:1440,height:900});
 blankPage.on('pageerror',e=>errors.push(e.message));
 await blankPage.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
 await blankPage.click('[data-menu="fileMenu"]');
 await blankPage.click('#newBtn');
 assert.match(await blankPage.$eval('#newTemplateModal .modal-description',el=>el.textContent),/no elements or predefined variables/);
 assert.equal(await blankPage.$eval('#newTemplateLicense',el=>el.value),'');
 await blankPage.$eval('#newTemplateName',el=>{el.value='Empty cover';});
 await blankPage.click('#newTemplateForm button[type="submit"]');
 const fresh=JSON.parse(await blankPage.$eval('#jsonEditor',el=>el.value));
 assert.deepEqual(fresh.items,[],'new template should have no sample layers');
 assert.deepEqual(fresh.params,{},'new template should have no preset variables');
 assert.equal(fresh.name,'Empty cover');
 assert.equal(Object.hasOwn(fresh,'license'),false,'optional blank license must not be exported');
 assert.equal(await blankPage.$eval('#nodeStatus',el=>el.textContent),'0 nodes');
 assert.equal(await blankPage.$$('#paramsEditor .param-card').then(a=>a.length),0);
 await blankPage.click('[data-menu-action="export"]');
 assert.match(await blankPage.$eval('#exportSummary',el=>el.textContent),/0 elements/);
 assert.match(await blankPage.$eval('#exportSummary',el=>el.textContent),/Variables0/);
 await blankPage.click('#exportTemplateModal [data-close-modal="exportTemplateModal"]');
 // Native Rectangle/Ellipse drawing may start outside either page edge.
 const screenPoint=async(x,y)=>blankPage.evaluate(([x,y])=>{
  const svg=document.querySelector('#paper'),pt=svg.createSVGPoint();pt.x=x;pt.y=y;
  const result=pt.matrixTransform(svg.getScreenCTM());return {x:result.x,y:result.y};
 },[x,y]);
 const dragShape=async(tool,from,to,shift=false)=>{
  await blankPage.click(`.canvas-tool[data-tool="${tool}"]`);
  const a=await screenPoint(...from),b=await screenPoint(...to);
  const pageBounds=await blankPage.$eval('#paper',el=>el.getBoundingClientRect().toJSON());
  assert(a.x<pageBounds.left||a.x>pageBounds.right,'shape drag must begin in pasteboard outside actual sheet');
  await blankPage.mouse.move(a.x,a.y);
  if(shift)await blankPage.keyboard.down('Shift');
  await blankPage.mouse.down();await blankPage.mouse.move(b.x,b.y,{steps:9});await blankPage.mouse.up();
  if(shift)await blankPage.keyboard.up('Shift');
 };
 await dragShape('rect',[234,35],[92,157]);
 let drawn=JSON.parse(await blankPage.$eval('#jsonEditor',el=>el.value));
 assert.equal(drawn.items.length,1);
 assert.equal(drawn.items[0].type,'rect');
 assert.equal(drawn.items[0].x,'92mm');
 assert.equal(drawn.items[0].w,'142mm','rectangle extends beyond right page edge without changing sheet');
 assert.deepEqual(drawn.params,{},'drawing shapes does not add variables');
 await dragShape('ellipse',[-16,175],[65,115],true);
 drawn=JSON.parse(await blankPage.$eval('#jsonEditor',el=>el.value));
 assert.equal(drawn.items[1].type,'ellipse');
 assert(Number.parseFloat(drawn.items[1].cx)-Number.parseFloat(drawn.items[1].rx)<0,
  'ellipse should extend into negative X outside sheet');
 assert(Math.abs(Number.parseFloat(drawn.items[1].rx)-Number.parseFloat(drawn.items[1].ry))<0.01,
  'Shift constrains off-page ellipse to a circle');
 assert.deepEqual(drawn.params,{});
 assert.equal(await blankPage.$eval('#paper',el=>el.getAttribute('viewBox')),'0 0 210 297',
  'dragging off page must not alter paper dimensions');
 await blankPage.click('#togglePasteboard');
 assert.equal(await blankPage.$eval('#paper',el=>getComputedStyle(el).overflow),'hidden',
  'page preview clips outside portions but keeps authored geometry');
 assert.equal(JSON.parse(await blankPage.$eval('#jsonEditor',el=>el.value)).items.length,2);
 await blankPage.click('#togglePasteboard');
 // Examples remain available through the separate picker on demand.
 blankPage.once('dialog',d=>d.accept());
 await blankPage.select('#topExample','ruled.xtemplate');
 await blankPage.waitForFunction(()=>JSON.parse(document.querySelector('#jsonEditor').value).items.length>0);
 await blankPage.close();
 await loadLegacyFixture(page);
 const clickMenuAction=async action=>{
  await page.click('[data-menu="insertMenu"]');
  await page.click(`#insertMenu [data-menu-action="${action}"]`);
 };
 await clickMenuAction('insert-rect');
 const sample=()=>page.evaluate(()=>{
  const element=document.querySelector('g[data-path="items.1"]');
  return{selected:document.querySelector('#selectedType').textContent,
   handles:document.querySelectorAll('#editor-selection-overlay g[data-path="items.1"] .transform-handle').length,
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
 // Smart alignment: compare one shape to another, not just page centers.
 const guidesPage=await browser.newPage();
 await guidesPage.setViewport({width:1440,height:900});
 guidesPage.on('pageerror',error=>errors.push(error.message));
 await guidesPage.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
 await loadLegacyFixture(guidesPage);
 const insert=async type=>{
  await guidesPage.click('[data-menu="insertMenu"]');
  await guidesPage.click(`#insertMenu [data-menu-action="insert-${type}"]`);
 };
 const center=path=>guidesPage.$eval(`g[data-path="${path}"] .svg-hitbox`,el=>{
  const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await insert('rect');await insert('rect');
 const upper=await center('items.2');
 await guidesPage.mouse.move(upper.x,upper.y);await guidesPage.mouse.down();
 await guidesPage.mouse.move(upper.x+100,upper.y,{steps:8});await guidesPage.mouse.up();
 const lower=await center('items.1');
 await guidesPage.mouse.move(lower.x,lower.y);await guidesPage.mouse.down();
 await guidesPage.mouse.move(lower.x+100,lower.y,{steps:9});
 const objectGuides=await guidesPage.$$eval('#paper .smart-guide',els=>els.map(el=>({
  kind:el.getAttribute('class'),x:Number(el.getAttribute('x1')),
 })));
 assert(objectGuides.some(guide=>guide.kind?.includes('object-guide')&&guide.x>50),
  'dragging onto another object must display a visible object-reference guide');
 await guidesPage.mouse.up();
 assert.equal(await guidesPage.$('#paper .smart-guide'),null,'guide overlays must clear after release');
 await insert('text');
 assert.equal(await guidesPage.$eval('#editor-selection-overlay g[data-path="items.3"]',el=>el.querySelectorAll('.transform-handle.rotate-handle').length),1,
  'selected text should provide a rotation handle');
 await guidesPage.close();
 assert.deepEqual(errors,[],'no browser errors after object snapping and text selection');
 // Editor UI regression: document modal, nested Page hierarchy, color sync,
 // theme persistence and quick rotation while preserving precise numeric input.
 const workspacePage=await browser.newPage();
 await workspacePage.setViewport({width:1440,height:900});
 workspacePage.on('pageerror',error=>errors.push(error.message));
 await workspacePage.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
 await loadLegacyFixture(workspacePage);
 const themeColors={};
 for(const theme of ['dusk','graphite','midnight']){
  await workspacePage.$eval('#themeSelect',(el,value)=>{
   el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));
  },theme);
  await new Promise(resolve=>setTimeout(resolve,200));
  themeColors[theme]=await workspacePage.evaluate(()=>{
   const bg=selector=>getComputedStyle(document.querySelector(selector)).backgroundColor;
   const css=selector=>getComputedStyle(document.querySelector(selector));
   return {modal:bg('.modal-card'),menu:bg('#fileMenu'),variable:bg('.param-card'),
    code:bg('#jsonEditor'),status:bg('.statusbar'),settings:bg('#themeSelect'),
    export:bg('.top-export'),toolRail:bg('.canvas-tools'),
    toolActive:bg('.canvas-tools .canvas-tool.active'),
    toolActiveBorder:css('.canvas-tools .canvas-tool.active').borderTopColor,
    toolHoverColor:css('.canvas-tools .canvas-tool[data-tool="rect"]').color,
    toolShortcut:css('.canvas-tools .canvas-tool[data-tool="rect"] kbd').color,
    toolDivider:bg('.canvas-tools .tool-separator')};
  });
 }
 for(const selector of Object.keys(themeColors.dusk)){
  assert.equal(new Set(['dusk','graphite','midnight'].map(t=>themeColors[t][selector])).size,3,
   `${selector} should adapt to all three themes, got ${JSON.stringify(themeColors)}`);
 }
 await workspacePage.click('[data-menu="settingsMenu"]');
 await workspacePage.select('#themeSelect','midnight');
 assert.equal(await workspacePage.$eval('html',el=>el.dataset.theme),'midnight');
 await workspacePage.reload({waitUntil:'networkidle0'});
 assert.equal(await workspacePage.$eval('html',el=>el.dataset.theme),'midnight','theme must persist');
 await loadLegacyFixture(workspacePage);
 // Clicking Page must inspect its metadata in Element without a modal.
 await workspacePage.click('.tree-page');
 assert.equal(await workspacePage.$eval('#filePropertiesModal',el=>el.classList.contains('hidden')),true);
 assert.equal(await workspacePage.$eval('#documentPanel',el=>el.parentElement.id),'propertiesPanel');
 assert.equal(await workspacePage.$eval('.right-tab.active',el=>el.dataset.inspector),'properties');
 assert.equal(await workspacePage.$eval('#selectedType',el=>el.textContent),'PAGE');
 await workspacePage.click('[data-menu="fileMenu"]');
 await workspacePage.click('#fileInfoBtn');
 assert.equal(await workspacePage.$eval('#documentPanel',el=>el.parentElement.classList.contains('file-properties-card')),true);
 assert.equal(await workspacePage.$eval('#filePropertiesModal',el=>el.classList.contains('hidden')),false);
 assert(await workspacePage.$('#documentPanel #metaName'),'metadata must be in the modal');
 await workspacePage.$eval('#inkColor',input=>{
  input.value='#123456';input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 assert.equal(await workspacePage.$eval('#quickInkColor',input=>input.value),'#123456');
 await workspacePage.select('#filePageSize','a5');
 assert.equal(await workspacePage.$eval('#paperSize',input=>input.value),'a5');
 await workspacePage.click('#filePropertiesModal [data-close-modal="filePropertiesModal"]');
 assert.equal(await workspacePage.$eval('#documentPanel',el=>el.parentElement.id),'propertiesPanel');
 await workspacePage.$eval('#quickAccentColor',input=>{
  input.value='#abcdef';input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 assert.equal(await workspacePage.$eval('#accentColor',input=>input.value),'#abcdef');
 await workspacePage.click('[data-menu="insertMenu"]');
 await workspacePage.click('#insertMenu [data-menu-action="insert-rect"]');
 assert.equal(await workspacePage.$eval('#documentPanel',el=>el.parentElement.classList.contains('file-properties-card')),true);
 const nesting=await workspacePage.evaluate(()=>({
  page:parseFloat(getComputedStyle(document.querySelector('.tree-page')).paddingLeft),
  child:parseFloat(getComputedStyle(document.querySelector('[data-path="items.1"]')).paddingLeft),
 }));
 assert(nesting.child>=nesting.page+15,'root layers must be visually nested under Page');
 assert.equal(await workspacePage.$eval('#transformRotate',el=>el.disabled),true,'non-text elements cannot be rotated in XNotes');
 await workspacePage.click('[data-menu="insertMenu"]');
 await workspacePage.click('#insertMenu [data-menu-action="insert-text"]');
 assert.equal(await workspacePage.$eval('#transformRotate',el=>el.disabled),false,'text can rotate by quarter turns');
 await workspacePage.click('[data-rotation-preset="90"]');
 assert.equal(Number(await workspacePage.$eval('#transformRotate',el=>el.value)),90);
 const wheel=await workspacePage.$eval('#rotationWheel',el=>el.getBoundingClientRect().toJSON());
 const cx=wheel.x+wheel.width/2,cy=wheel.y+wheel.height/2;
 await workspacePage.mouse.move(cx,cy);await workspacePage.mouse.down();
 await workspacePage.mouse.move(cx+wheel.width*.35,cy,{steps:4});await workspacePage.mouse.up();
 assert.equal(Number(await workspacePage.$eval('#transformRotate',el=>el.value)),90);
 // Non-quarter-turn input is normalized to the nearest XNotes-supported angle.
 await workspacePage.$eval('#transformRotate',input=>{
  input.value='-35.5';input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 assert.equal(Number(await workspacePage.$eval('#transformRotate',el=>el.value)),0);
 // Containers should have deliberate interior spacing, even in compact widths.
 const insets=await workspacePage.evaluate(()=>{
  const px=selector=>{
   const el=document.querySelector(selector),style=getComputedStyle(el);
   return {left:parseFloat(style.paddingLeft),right:parseFloat(style.paddingRight),
    top:parseFloat(style.paddingTop),bottom:parseFloat(style.paddingBottom)};
  };
  return {transform:px('#elementInspector .transform-panel'),
    alignment:px('#elementInspector .alignment-tools'),
    variable:px('#paramsPanel .param-card')};
 });
 for(const [name,value] of Object.entries(insets)){
  assert(value.left>=8&&value.right>=8&&value.top>=8&&value.bottom>=8,
   `${name} is missing internal padding: ${JSON.stringify(value)}`);
 }
 // Variable headings must separate their code name, description and delete action.
 await workspacePage.click('[data-inspector="params"]');
 const variableLayout=await workspacePage.evaluate(()=>{
  const card=document.querySelector('#paramsPanel .param-card');
  const heading=card.querySelector('.param-title-wrap');
  const children=[...heading.children].map(el=>el.getBoundingClientRect().toJSON());
  const name=heading.getBoundingClientRect();
  const button=card.querySelector('.param-card-head>button').getBoundingClientRect();
  return {spacing:children[1].top-children[0].bottom,
   overlap:button.left<name.right-1,padding:getComputedStyle(card).paddingTop};
 });
 assert(variableLayout.spacing>=4&&!variableLayout.overlap,
  `Variable headings must not collide: ${JSON.stringify(variableLayout)}`);
 await workspacePage.click('[data-inspector="properties"]');
 // Nested property cards must not place inputs against their edges.
 const nestedSpace=await workspacePage.evaluate(()=>{
  const body=document.querySelector('#elementInspector .inspector-details .details-body');
  const style=getComputedStyle(body);
  return {top:parseFloat(style.paddingTop),left:parseFloat(style.paddingLeft),right:parseFloat(style.paddingRight)};
 });
 assert(nestedSpace.top>=10&&nestedSpace.left>=10&&nestedSpace.right>=10,
  `Element type and stroke width need proper insets: ${JSON.stringify(nestedSpace)}`);
 // Zoom from Fit must increase/decrease the actual page width, not assume Fit=100%.
 await workspacePage.$eval('#zoom',el=>{el.value='fit';el.dispatchEvent(new Event('change',{bubbles:true}));});
 const pageWidth=()=>workspacePage.$eval('#paperWrap',el=>el.getBoundingClientRect().width);
 const fitWidth=await pageWidth();
 const paperCenter=()=>workspacePage.$eval('#paperWrap',el=>{
  const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};
 });
 const assertCentered=async(before,label)=>{
  const after=await paperCenter();
  assert(Math.abs(after.x-before.x)<2&&Math.abs(after.y-before.y)<2,
   `${label} shifted the page center: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
 };
 const initialCenter=await paperCenter();
 await workspacePage.click('[data-menu="viewMenu"]');
 await workspacePage.click('#viewMenu [data-menu-action="zoom-in"]');
 const larger=await pageWidth();
 await assertCentered(initialCenter,'View → Zoom in');
 assert(larger>fitWidth+0.5,`View Zoom in should grow page: ${fitWidth} → ${larger}`);
 await workspacePage.click('[data-menu="viewMenu"]');
 await workspacePage.click('#viewMenu [data-menu-action="zoom-out"]');
 const smaller=await pageWidth();
 await assertCentered(initialCenter,'View → Zoom out');
 assert(smaller<larger-0.5,`View Zoom out should shrink page: ${larger} → ${smaller}`);
 // Cross the Fit→zoomed-in CSS alignment threshold in both directions.
 // This is the regression: formerly one step jumped to the left, the next
 // returned right because .canvas-area switches flex justification.
 for(let i=0;i<5;i++){
  await workspacePage.click('[data-menu="viewMenu"]');
  await workspacePage.click('#viewMenu [data-menu-action="zoom-in"]');
  await assertCentered(initialCenter,`repeated zoom in #${i+1}`);
 }
 for(let i=0;i<5;i++){
  await workspacePage.click('[data-menu="viewMenu"]');
  await workspacePage.click('#viewMenu [data-menu-action="zoom-out"]');
  await assertCentered(initialCenter,`repeated zoom out #${i+1}`);
 }
 // Mouse click should not leave Zoom+ focused and accidentally activated
 // again by Space; keyboard navigation should still support Space on buttons.
 await workspacePage.click('#zoomIn');
 assert.notEqual(await workspacePage.evaluate(()=>document.activeElement?.id),'zoomIn',
  'mouse-activated Zoom in must release focus');
 const afterMouseZoom=await pageWidth();
 await workspacePage.keyboard.press('Space');
 const afterSpace=await pageWidth();
 assert(Math.abs(afterSpace-afterMouseZoom)<0.1,
  `Space after clicking Zoom in should not trigger zoom: ${afterMouseZoom} → ${afterSpace}`);
 await workspacePage.$eval('#zoomIn',el=>el.focus());
 await workspacePage.keyboard.press('Space');
 const afterKeyboard=await pageWidth();
 assert(afterKeyboard>afterSpace+0.5,
  `Space on intentionally keyboard-focused Zoom in should still work: ${afterSpace} → ${afterKeyboard}`);
 // Inspector layout: rotation presets and the opacity slider must not
 // overlap or escape narrow sidebars, and actions must not hide fields.
 for(const width of [1440,1024,900]){
  await workspacePage.setViewport({width,height:850});
  const inspectorLayout=await workspacePage.evaluate(()=>{
   const panel=document.querySelector('#propertiesPanel');
   const elements=[...panel.querySelectorAll('.transform-panel .field-row,.rotation-controls,.rotation-presets,.opacity-slider-field,.inspector-actions')].filter(el=>el.getClientRects().length);
   const pane=panel.getBoundingClientRect();
   return {pane:{left:pane.left,right:pane.right},rows:elements.map(el=>{
    const r=el.getBoundingClientRect();return{cls:el.className,left:r.left,right:r.right,overflow:el.scrollWidth>el.clientWidth+2};
   }),actionsPosition:getComputedStyle(panel.querySelector('.inspector-actions')).position};
  });
  assert(inspectorLayout.rows.every(row=>!row.overflow&&row.left>=inspectorLayout.pane.left-1&&row.right<=inspectorLayout.pane.right+1),
   `Element controls must fit at ${width}px: ${JSON.stringify(inspectorLayout)}`);
  assert.equal(inspectorLayout.actionsPosition,'static','inspector actions must not cover inputs');
 }
 await workspacePage.setViewport({width:1440,height:900});
 // Variable autocomplete is browser-independent and respects field types.
 await workspacePage.click('#elementStroke');
 const suggestedColors=await workspacePage.$$eval('#variableCompletion [role="option"] strong',els=>els.map(el=>el.textContent));
 assert.deepEqual(suggestedColors.slice(0,3),['ink','accent','none']);
 await workspacePage.keyboard.press('ArrowDown');
 await workspacePage.keyboard.press('Enter');
 assert.equal(await workspacePage.$eval('#elementStroke',el=>el.value),'accent');
 const strokeFormat=await workspacePage.$eval('#elementStrokeWidth',el=>({title:el.title,hint:el.closest('label').querySelector('.value-field-hint')?.textContent}));
 assert.match(strokeFormat.title,/mm/);
 assert.match(strokeFormat.hint,/Line thickness/);
 await workspacePage.click('[data-inspector="params"]');
 await workspacePage.click('#addParam');
 await workspacePage.select('#newParamType','color');
 assert.match(await workspacePage.$eval('#newParamTypeHint',el=>el.textContent),/HEX/);
 await workspacePage.select('#newParamType','integer');
 assert.match(await workspacePage.$eval('#newParamTypeHint',el=>el.textContent),/Whole/);
 await workspacePage.click('#cancelAddParam');
 await workspacePage.click('[data-inspector="properties"]');
 // Editor colors and themes should not introduce new fields in exported template JSON.
 const docJson=JSON.parse(await workspacePage.$eval('#jsonEditor',el=>el.value));
 assert(!Object.hasOwn(docJson,'theme')&&!Object.hasOwn(docJson,'previewColors'));
 assert.deepEqual(errors,[]);
 // Layer naming is part of the template, organization color is NOT.
 const layerPath='items.1';
 await workspacePage.$eval(`.tree-item[data-path="${layerPath}"] .tree-label`,el=>el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})));
 await workspacePage.$eval('.tree-rename',el=>{
  el.value='Colored border';el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 });
 assert.equal(await workspacePage.$eval(`.tree-item[data-path="${layerPath}"] .tree-label`,el=>el.textContent),'Colored border');
 await workspacePage.click(`.tree-item[data-path="${layerPath}"] .tree-color-control`);
 assert.equal(await workspacePage.$eval('.layer-color-picker',el=>el.classList.contains('hidden')),false);
 await workspacePage.click('.layer-color-swatch');
 const markerColor=await workspacePage.$eval(`.tree-item[data-path="${layerPath}"] .tree-color-control`,el=>getComputedStyle(el).color);
 assert.equal(markerColor,'rgb(232, 121, 121)');
 // The same organization controls are available from right-click on a layer.
 // Right-click on a DIFFERENT unselected layer must show these actions too.
 await workspacePage.click('.tree-page');
 await workspacePage.click(`.tree-item[data-path="${layerPath}"]`,{button:'right'});
 assert.equal(await workspacePage.$eval('#contextMenu [data-action="rename"]',el=>el.classList.contains('hidden')),false);
 assert.equal(await workspacePage.$eval('#contextMenu [data-action="layer-color"]',el=>el.classList.contains('hidden')),false);
 await workspacePage.keyboard.press('Escape');
 await workspacePage.click(`.tree-item[data-path="${layerPath}"]`,{button:'right'});
 assert.equal(await workspacePage.$eval('#contextMenu [data-action="rename"]',el=>el.classList.contains('hidden')),false);
 await workspacePage.click('#contextMenu [data-action="rename"]');
 await workspacePage.$eval('.tree-rename',el=>{
  el.value='Right-click renamed';el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 });
 assert.equal(await workspacePage.$eval(`.tree-item[data-path="${layerPath}"] .tree-label`,el=>el.textContent),'Right-click renamed');
 await workspacePage.click(`.tree-item[data-path="${layerPath}"]`,{button:'right'});
 await workspacePage.click('#contextMenu [data-action="layer-color"]');
 assert.equal(await workspacePage.$eval('.layer-color-picker',el=>el.classList.contains('hidden')),false);
 await workspacePage.click('.layer-color-footer button');
 assert.equal(await workspacePage.$eval(`.tree-item[data-path="${layerPath}"]`,el=>el.classList.contains('tree-is-colored')),false);
 const exportedDoc=JSON.parse(await workspacePage.$eval('#jsonEditor',el=>el.value));
 assert.equal(exportedDoc.items[1].name,'Right-click renamed');
 assert.equal(Object.hasOwn(exportedDoc.items[1],'layerColor'),false);
 assert.equal(Object.hasOwn(exportedDoc.items[1],'colorTag'),false);
 await workspacePage.close();
 // Mixed hierarchy selection: group + child + an unrelated root element.
 // Only intersecting explicit attributes may be batch-edited; parent + child
 // may be inspected together but destructive commands must not process twice.
 const nestingPage=await browser.newPage();
 await nestingPage.setViewport({width:1440,height:900});
 nestingPage.on('pageerror',e=>errors.push(e.message));
 await nestingPage.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
 const nestedDocument={xtemplate:1,id:'test.mixed.hierarchy',name:'Hierarchy regression',params:{},items:[
  {type:'group',name:'Parent',stroke:'ink',opacity:0.5,children:[
   {type:'rect',name:'Child',x:'10mm',y:'10mm',w:'35mm',h:'30mm',stroke:'accent',opacity:0.8},
   {type:'group',name:'Subgroup',children:[
    {type:'rect',name:'Grandchild',x:'3mm',y:'3mm',w:'14mm',h:'12mm',stroke:'ink',opacity:0.9},
   ]},
  ]},
  {type:'rect',name:'Other root',x:'60mm',y:'60mm',w:'24mm',h:'20mm',stroke:'ink',opacity:0.7},
 ]};
 await nestingPage.$eval('#fileInput',(input,raw)=>{
  const transfer=new DataTransfer();transfer.items.add(new File([raw],'hierarchy.xtemplate',{type:'application/json'}));
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(nestedDocument));
 await nestingPage.waitForSelector('.tree-item[data-path="items.0.children.1.children.0"]');
 await nestingPage.click('.tree-item[data-path="items.0"]');
 await nestingPage.keyboard.down('Control');
 await nestingPage.click('.tree-item[data-path="items.0.children.0"]');
 await nestingPage.click('.tree-item[data-path="items.0.children.1.children.0"]');
 await nestingPage.click('.tree-item[data-path="items.1"]');
 await nestingPage.keyboard.up('Control');
 const hierarchySelection=await nestingPage.evaluate(()=>({
  selected:[...document.querySelectorAll('#tree .tree-item.active[data-path]')].map(x=>x.dataset.path),
  count:document.querySelector('#selectedType').textContent,
  properties:[...document.querySelectorAll('#multiPropertyInspector input[data-property]')].map(x=>x.dataset.property),
 }));
 assert.deepEqual(hierarchySelection.selected,['items.0','items.0.children.0','items.0.children.1.children.0','items.1']);
 assert.match(hierarchySelection.count,/4 ELEMENTS/);
 assert(hierarchySelection.properties.includes('stroke')&&hierarchySelection.properties.includes('opacity'));
 assert(hierarchySelection.properties.includes('x'),'optional X must be available on all selected groups/rectangles');
 assert(!hierarchySelection.properties.includes('period'),'repeat-only fields must stay hidden');
 await nestingPage.$eval('#multiPropertyInspector input[data-property="stroke"]',input=>{
  input.value='accent';input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 const updated=JSON.parse(await nestingPage.$eval('#jsonEditor',input=>input.value));
 assert([updated.items[0],updated.items[0].children[0],updated.items[0].children[1].children[0],updated.items[1]].every(n=>n.stroke==='accent'),
  'batch edit must reach each selected element across nested levels');
 assert.equal(updated.items[0].children.length,2,'batch edit must preserve hierarchy');
 const taggedPaths=['items.0','items.0.children.0','items.0.children.1.children.0','items.1'];
 const tagState=async()=>nestingPage.$$eval('#tree .tree-item.active[data-path]',rows=>rows.map(el=>({
  path:el.dataset.path,marked:el.classList.contains('tree-is-colored'),
  color:getComputedStyle(el.querySelector('.tree-color-control')).color,
 })));
 // The dot on an already selected layer must apply the tag to all levels.
 await nestingPage.click('.tree-item[data-path="items.0.children.0"] .tree-color-control');
 assert.match(await nestingPage.$eval('.layer-color-heading',el=>el.textContent),/4 SELECTED/);
 await nestingPage.click('.layer-color-swatch');
 const colored=await tagState();
 assert.deepEqual(colored.map(x=>x.path),taggedPaths);
 assert(colored.every(x=>x.marked&&x.color==='rgb(232, 121, 121)'),
  'batch color must apply to every selected layer regardless of nesting');
 // Right-click a selected item should retain the group selection and clear all.
 await nestingPage.click('.tree-item[data-path="items.1"]',{button:'right'});
 await nestingPage.click('#contextMenu [data-action="layer-color"]');
 assert.match(await nestingPage.$eval('.layer-color-heading',el=>el.textContent),/4 SELECTED/);
 await nestingPage.click('.layer-color-footer button');
 assert((await tagState()).every(x=>!x.marked),'clear color must affect every selected layer');
 // Clicking the dot on an unselected layer must NOT recolor the selected group.
 await nestingPage.keyboard.down('Control');
 await nestingPage.click('.tree-item[data-path="items.1"]');
 await nestingPage.keyboard.up('Control');
 await nestingPage.click('.tree-item[data-path="items.1"] .tree-color-control');
 assert.match(await nestingPage.$eval('.layer-color-heading',el=>el.textContent),/LAYER COLOR/);
 await nestingPage.click('.layer-color-swatch');
 assert.equal(await nestingPage.$eval('.tree-item[data-path="items.1"]',el=>el.classList.contains('tree-is-colored')),true);
 assert.equal(await nestingPage.$eval('.tree-item[data-path="items.0.children.0"]',el=>el.classList.contains('tree-is-colored')),false);
 const exportWithColors=JSON.parse(await nestingPage.$eval('#jsonEditor',el=>el.value));
 assert(!JSON.stringify(exportWithColors).includes('layerColor'),'editor-only color must not leak into export');
 await nestingPage.close();
 assert.deepEqual(errors,[],'nested UI selection must not throw');
 // Sparse same-type nodes must expose optional capabilities; user edits must
 // not reset unrelated attributes or introduce unsupported properties.
 const compatibilityPage=await browser.newPage();
 compatibilityPage.on('dialog',dialog=>dialog.accept());
 await compatibilityPage.setViewport({width:1440,height:900});
 compatibilityPage.on('pageerror',e=>errors.push(e.message));
 await compatibilityPage.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
 const compatibleDoc={xtemplate:1,id:'test.batch.capabilities',name:'Compatible sparse nodes',params:{},items:[
  {type:'repeat',axis:'y',period:'20mm',count:3,children:[{type:'vline',x:'90mm',y1:'0mm',y2:'15mm'}]},
  {type:'hline',y:'110mm',stroke:'accent'},
  {type:'hline',y:'120mm',x1:'12mm',strokeWidth:'0.4mm'},
  {type:'rect',x:'110mm',y:'55mm',w:'18mm',h:'14mm',stroke:'ink',fill:'none'},
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const transfer=new DataTransfer();transfer.items.add(new File([raw],'sparse.xtemplate',{type:'application/json'}));
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(compatibleDoc));
 await compatibilityPage.waitForSelector('.tree-item[data-path="items.2"]');
 await compatibilityPage.click('.tree-item[data-path="items.1"]');
 await compatibilityPage.keyboard.down('Control');
 await compatibilityPage.click('.tree-item[data-path="items.2"]');
 await compatibilityPage.keyboard.up('Control');
 const compatibleFields=await compatibilityPage.$$eval('#multiPropertyInspector [data-property]',nodes=>nodes.map(el=>el.dataset.property));
 for(const key of ['x1','x2','y','stroke','strokeWidth'])assert(compatibleFields.includes(key),`optional shared hline property ${key} must be visible`);
 assert(!compatibleFields.includes('period'),'repeat-only key must remain incompatible');
 await compatibilityPage.$eval('#multiPropertyInspector input[data-property="x2"]',el=>{
  el.value='70mm';el.dispatchEvent(new Event('change',{bubbles:true}));
 });
 const afterBatch=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value));
 assert.equal(afterBatch.items[1].x2,'70mm');assert.equal(afterBatch.items[2].x2,'70mm');
 assert.equal(afterBatch.items[1].stroke,'accent');assert.equal(afterBatch.items[2].strokeWidth,'0.4mm');
 assert.equal(afterBatch.items[0].children[0].x,'90mm');
 // Rendered SVG repeat instances must be snap targets, even though repeat
 // itself has no model-space rectangle. Toggle persists and disables *snap*.
 const repeatCopies=await compatibilityPage.$$('g[data-path="items.0.children.0"]');
 assert.equal(repeatCopies.length,3,'three repeated vlines must render as separate targets');
 const movingRect=await compatibilityPage.$eval('g[data-path="items.3"] .svg-hitbox',el=>{
  const b=el.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};
 });
 const paperPixels=await compatibilityPage.$eval('#paper',el=>el.getBoundingClientRect().width);
 const moveX=-19.4*paperPixels/210; // proposed x≈90.6, must magnetically snap to x=90
 async function checkGuides(shouldShow){
  await compatibilityPage.mouse.move(movingRect.x,movingRect.y);
  await compatibilityPage.mouse.down();
  await compatibilityPage.mouse.move(movingRect.x+moveX,movingRect.y,{steps:12});
  const found=await compatibilityPage.$$eval('#paper .smart-guide.object-guide',nodes=>nodes.map(el=>({x1:Number(el.getAttribute('x1')),x2:Number(el.getAttribute('x2')),y1:Number(el.getAttribute('y1')),y2:Number(el.getAttribute('y2'))})));
  if(shouldShow)assert(found.some(g=>Math.abs(g.x1-g.x2)<1e-6&&Math.abs(g.x1-90)<0.2),
   `repeated vline must yield a true vertical x=90 magnetic guide: ${JSON.stringify(found)}`);
  else assert.deepEqual(found,[],'disabled magnetic guides must not render');
  await compatibilityPage.mouse.up();
  const updated=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value));
  const position=parseFloat(updated.items[3].x);
  assert(Math.abs(position-(shouldShow?90:90.6))<0.16,
   `magnetic ${shouldShow?'on':'off'}: expected committed x≈${shouldShow?90:90.6}mm, got ${position}mm`);
 }
 assert.equal(await compatibilityPage.$eval('#magneticGuidesToggle',el=>el.checked),true);
 await checkGuides(true);
 // Restore original geometry without resetting editor-only Settings.
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const transfer=new DataTransfer();transfer.items.add(new File([raw],'sparse.xtemplate',{type:'application/json'}));
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(compatibleDoc));
 await compatibilityPage.click('[data-menu="settingsMenu"]');
 await compatibilityPage.click('#magneticGuidesToggle');
 assert.equal(await compatibilityPage.$eval('#magneticGuidesToggle',el=>el.checked),false);
 await checkGuides(false);
 await compatibilityPage.reload({waitUntil:'networkidle0'});
 assert.equal(await compatibilityPage.$eval('#magneticGuidesToggle',el=>el.checked),false,'guide setting persists locally');
 await compatibilityPage.$eval('#magneticGuidesToggle',el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
 // Drag the *second* visible copy of a repeated line, not its first instance.
 // Repeated instances share the node's template geometry; none should be
 // excluded from guide calculations or trigger a detached-SVG exception.
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const transfer=new DataTransfer();transfer.items.add(new File([raw],'sparse.xtemplate',{type:'application/json'}));
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(compatibleDoc));
 await compatibilityPage.waitForSelector('g[data-path="items.0.children.0"] .svg-hitbox');
 const secondInstance=await compatibilityPage.$$eval('g[data-path="items.0.children.0"] .svg-hitbox',items=>{
  const rect=items[1].getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2};
 });
 await compatibilityPage.mouse.move(secondInstance.x,secondInstance.y);
 await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(secondInstance.x+16,secondInstance.y,{steps:9});
 await compatibilityPage.mouse.up();
 const repeatedEdited=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value));
 assert.notEqual(repeatedEdited.items[0].children[0].x,'90mm','dragging a repeated copy edits the shared template node');
 // Horizontal snapping to individual hlines generated by repeat.
 const horizontalDoc={xtemplate:1,id:'test.repeat.horizontal',name:'Horizontal guides',params:{},items:[
  {type:'repeat',axis:'y',period:'20mm',count:4,children:[{type:'hline',y:'0mm',x1:'10mm',x2:'90mm',stroke:'ink'}]},
  {type:'rect',x:'110mm',y:'85mm',w:'18mm',h:'8mm',stroke:'accent',fill:'none'},
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'horizontal.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(horizontalDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Horizontal guides');
 const repeatedHline='#page-artwork g[data-path="items.0.children.0"]';
 const hlineHandles='#editor-selection-overlay g[data-path="items.0.children.0"]';
 assert.equal((await compatibilityPage.$$(repeatedHline)).length,4,'all four horizontal lines must render');
 await compatibilityPage.$eval('.tree-item[data-path="items.0.children.0"]',el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 // A repeated child keeps only its two endpoint resize handles, focused on
 // one copy; XNotes-compatible repeat geometry has no rotation control.
 const childHandles=await compatibilityPage.$$eval(hlineHandles,nodes=>nodes.map(n=>n.querySelectorAll('[data-handle]').length));
 assert.equal(childHandles.filter(x=>x>0).length,1,'one repeat copy may have resize handles');
 assert.equal(childHandles.reduce((a,b)=>a+b,0),2,'hline keeps only two endpoint resize handles');
 assert.equal(await compatibilityPage.$$eval(hlineHandles,nodes=>nodes.reduce((count,n)=>count+n.querySelectorAll('[data-handle="rotate"]').length,0)),0,
  'repeat copies do not each rotate individually');
 assert.equal(await compatibilityPage.$eval('g[data-path="items.0"]',n=>n.querySelectorAll(':scope > [data-handle="rotate"]').length),0,
  'repeat must not offer rotation unsupported by XNotes');
 const thirdCopy=await compatibilityPage.$$eval(repeatedHline+' .svg-hitbox',nodes=>{
  const r=nodes[2].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await compatibilityPage.mouse.click(thirdCopy.x,thirdCopy.y);
 const focusHandles=await compatibilityPage.$$eval(hlineHandles,nodes=>nodes.map(n=>({instance:n.dataset.instance,count:n.querySelectorAll('[data-handle]').length})));
 assert(focusHandles.some(h=>h.instance==='2'&&h.count===2),'third copy gains the two endpoint resize handles');
 const resizeHandle=await compatibilityPage.$eval(hlineHandles+'[data-instance="2"] [data-handle="e"]',el=>{
  const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await compatibilityPage.mouse.move(resizeHandle.x,resizeHandle.y);
 await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(resizeHandle.x+12,resizeHandle.y,{steps:8});
 await compatibilityPage.mouse.up();
 const resized=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value));
 assert(parseFloat(resized.items[0].children[0].x2)>90,'resizing third copy must change shared x2');
 assert(Math.abs(parseFloat(resized.items[0].children[0].y))<0.01,'resizing must not bake repeat Y offset');
 const mover=await compatibilityPage.$eval('g[data-path="items.1"] .svg-hitbox',node=>{
  const r=node.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 const pxMm=(await compatibilityPage.$eval('#paper',node=>node.getBoundingClientRect().width))/210;
 await compatibilityPage.mouse.move(mover.x,mover.y);
 await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(mover.x,mover.y-(85-40.5)*pxMm,{steps:12});
 const horizontalGuides=await compatibilityPage.$$eval('#paper .smart-guide.object-guide',nodes=>nodes.map(el=>({x1:Number(el.getAttribute('x1')),x2:Number(el.getAttribute('x2')),y1:Number(el.getAttribute('y1')),y2:Number(el.getAttribute('y2'))})));
 assert(horizontalGuides.some(g=>Math.abs(g.y1-g.y2)<0.01&&Math.abs(g.y1-40)<0.25),
  `repeat hline y=40 should draw a horizontal guide: ${JSON.stringify(horizontalGuides)}`);
 await compatibilityPage.mouse.up();
 const afterHorizontal=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value));
 assert(Math.abs(parseFloat(afterHorizontal.items[1].y)-40)<0.25,
  `repeat hline should snap y=40: ${afterHorizontal.items[1].y}`);
 // Android renders repeat geometry without rotation; inherited rotation affects text only.
 const nativeDoc={xtemplate:1,id:'test.xnotes.native',name:'Native rotation',items:[
   {type:'repeat',axis:'y',period:'20mm',count:4,rotate:90,children:[
    {type:'hline',x1:'40mm',x2:'120mm',y:'0mm',stroke:'ink'},
    {type:'text',text:'Text',x:'42mm',y:'10mm',fill:'ink'},
   ]},
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const transfer=new DataTransfer();transfer.items.add(new File([raw],'native.xtemplate',{type:'application/json'}));
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(nativeDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Native rotation');
 assert.equal(await compatibilityPage.$eval('g[data-path="items.0"]',n=>n.getAttribute('transform')),null,
  'XNotes repeat geometry must not rotate merely from a rotate style field');
 assert.equal(await compatibilityPage.$$eval('g[data-path="items.0.children.0"]',nodes=>nodes.length),4);
 assert(await compatibilityPage.$$eval('g[data-path="items.0.children.1"] text',nodes=>nodes.every(n=>n.getAttribute('transform')?.startsWith('matrix('))),
  'inherited quarter-turn rotation must be applied to text glyphs');
 const roundTrip=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value));
 assert.equal(roundTrip.items[0].rotate,90,'existing imported keys must be preserved');
 // Resizing a group must recalculate repeated cells rather than stretch the SVG.
 const resizeDoc={xtemplate:1,id:'test.resize.repeat',name:'Repeat resize anchoring',items:[
  {type:'group',x:'20mm',y:'20mm',w:'100mm',h:'100mm',children:[
   {type:'repeat',axis:'y',period:'10mm',children:[{type:'hline',y:'0mm'}]},
   {type:'repeat',axis:'x',period:'10mm',children:[{type:'vline',x:'0mm'}]},
  ]},
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'resize.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(resizeDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Repeat resize anchoring');
 await compatibilityPage.$eval('.tree-item[data-path="items.0"]',e=>e.click());
 const sampleRepeat=()=>compatibilityPage.evaluate(()=>({
  horizontal:[...document.querySelectorAll('g[data-path="items.0.children.0.children.0"] > line')].map(x=>+x.getAttribute('y1')),
  vertical:[...document.querySelectorAll('g[data-path="items.0.children.1.children.0"] > line')].map(x=>+x.getAttribute('x1')),
  group:JSON.parse(document.querySelector('#jsonEditor').value).items[0],
 }));
 const initialRepeat=await sampleRepeat();
 assert(initialRepeat.horizontal.length>=8 && initialRepeat.vertical.length>=8);
 const dragGroupEdge=async(side,dx,dy)=>{
  const handle=await compatibilityPage.$eval(`g[data-path="items.0"] > [data-handle="${side}"]`,el=>{
   const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
  });
  await compatibilityPage.mouse.move(handle.x,handle.y);
  await compatibilityPage.mouse.down();
  await compatibilityPage.mouse.move(handle.x+dx,handle.y+dy,{steps:10});
  const during=await sampleRepeat();
  await compatibilityPage.mouse.up();
  return {during,after:await sampleRepeat()};
 };
 const down=await dragGroupEdge('s',0,40);
 assert(down.during.horizontal.length>initialRepeat.horizontal.length,'height expansion must add repeat lines during drag');
 assert(Math.abs(down.during.horizontal[1]-down.during.horizontal[0]-10)<.01,'height drag must preserve repeat period');
 assert.equal(down.during.group.y,initialRepeat.group.y,'south edge must anchor top during preview');
 assert(Math.abs(parseFloat(down.after.group.y)-20)<.01,'south edge must anchor top on commit');
 const across=await dragGroupEdge('e',40,0);
 assert(across.during.vertical.length>initialRepeat.vertical.length,'width expansion must add repeat columns during drag');
 assert(Math.abs(across.during.vertical[1]-across.during.vertical[0]-10)<.01,'width drag must preserve repeat period');
 assert(Math.abs(parseFloat(across.after.group.x)-20)<.01,'east edge must anchor left on commit');
 const beforeTop=await sampleRepeat();
 const top=await dragGroupEdge('n',0,20);
 assert(Math.abs((parseFloat(top.after.group.y)+parseFloat(top.after.group.h))-
  (parseFloat(beforeTop.group.y)+parseFloat(beforeTop.group.h)))<.01,'north edge must anchor bottom');
 assert(Math.abs(top.during.horizontal[1]-top.during.horizontal[0]-10)<.01,'north resize must not stretch y repeat spacing');
 const beforeLeft=await sampleRepeat();
 const left=await dragGroupEdge('w',20,0);
 assert(Math.abs((parseFloat(left.after.group.x)+parseFloat(left.after.group.w))-
  (parseFloat(beforeLeft.group.x)+parseFloat(beforeLeft.group.w)))<.01,'west edge must anchor right');
 assert(Math.abs(left.during.vertical[1]-left.during.vertical[0]-10)<.01,'west resize must not stretch x repeat spacing');
 // Element inspector orders native properties by type without removing fields.
 const priorityDoc={xtemplate:1,id:'test.inspector.priority',name:'Priority inspector',items:[
  {type:'repeat',axis:'y',period:'8mm',count:4,fit:'repeat',index:'row',stagger:'1mm',children:[{type:'hline'}]},
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'priority.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(priorityDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Priority inspector');
 await compatibilityPage.$eval('.tree-item[data-path="items.0"]',e=>e.click());
 const inspectorOrder=await compatibilityPage.$$eval('#advancedInspector > *',els=>els.map(el=>el.dataset.fieldKeys||el.textContent.trim()));
 assert(inspectorOrder.indexOf('axis')<inspectorOrder.indexOf('index'),'repeat axis precedes alias');
 assert(inspectorOrder.indexOf('period')<inspectorOrder.indexOf('stagger'),'repeat period precedes stagger');
 assert(inspectorOrder.some(x=>x.startsWith('ESSENTIAL'))&&inspectorOrder.some(x=>x.startsWith('ADVANCED')));
 // Native visual vertex editor preserves untouched expressions and commits a single history change.
 const vertexDoc={xtemplate:1,id:'test.vector.vertices',name:'Vector vertex test',items:[
  {type:'polygon',points:[['W/4','30mm'],['90mm','30mm'],['80mm','90mm']],stroke:'ink',fill:'none'},
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'vertices.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(vertexDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Vector vertex test');
 await compatibilityPage.$eval('.tree-item[data-path="items.0"]',e=>e.click());
 await compatibilityPage.$$eval('#contextualElementTools button',nodes=>nodes.find(x=>x.textContent==='Edit points')?.click());
 assert.equal(await compatibilityPage.$$('#vector-overlay [data-vector-vertex]').then(a=>a.length),3);
 const second=await compatibilityPage.$eval('#vector-overlay [data-vector-vertex="1"]',el=>{
  const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await compatibilityPage.mouse.move(second.x,second.y);await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(second.x+22,second.y+15,{steps:8});await compatibilityPage.mouse.up();
 const modifiedPolygon=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value)).items[0];
 assert.equal(modifiedPolygon.points[0][0],'W/4','unmodified expression must survive vertex drag');
 assert.notEqual(modifiedPolygon.points[1][0],'90mm','drag should persist vertex coordinate');
 assert.equal(modifiedPolygon.points.length,3);
 await compatibilityPage.keyboard.down('Control');await compatibilityPage.keyboard.press('z');await compatibilityPage.keyboard.up('Control');
 const restoredPolygon=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value)).items[0];
 assert.deepEqual(restoredPolygon.points,vertexDoc.items[0].points,'one Undo must undo vertex dragging');
 // Hatch controls modify only XNotes-native fields, and SVG path editing keeps d grammar.
 const nativeVectorDoc={xtemplate:1,id:'test.vector.hatch.path',name:'Hatch and path controls',items:[
  {type:'hatch',angle:0,period:'4mm',offset:'0mm',stroke:'ink'},
  {type:'path',x:'10mm',y:'10mm',w:'70mm',h:'70mm',viewBox:[0,0,100,100],d:'M 0 0 L 50 50 C 65 60 85 70 100 100'},
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'hatch-path.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(nativeVectorDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Hatch and path controls');
 await compatibilityPage.$eval('.tree-item[data-path="items.0"]',e=>e.click());
 await compatibilityPage.$$eval('#contextualElementTools button',nodes=>nodes.find(x=>x.textContent==='Adjust on canvas')?.click());
 assert.equal(await compatibilityPage.$$('#hatch-editor-overlay [data-hatch-control]').then(a=>a.length),3);
 await compatibilityPage.$eval('.tree-item[data-path="items.1"]',e=>e.click());
 await compatibilityPage.$$eval('#contextualElementTools button',nodes=>nodes.find(x=>x.textContent==='Edit SVG nodes')?.click());
 assert.equal(await compatibilityPage.$$('#svg-path-overlay [data-svg-path-point]').then(a=>a.length),5);
 const control=await compatibilityPage.$eval('#svg-path-overlay [data-svg-path-point="2"]',el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
 await compatibilityPage.mouse.move(control.x,control.y);await compatibilityPage.mouse.down();await compatibilityPage.mouse.move(control.x+19,control.y+15,{steps:6});await compatibilityPage.mouse.up();
 const changedPath=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value)).items[1].d;
 assert(changedPath.startsWith('M 0 0 L 50 50 C '),'visual path edit must preserve unrelated commands');
 assert.notEqual(changedPath,nativeVectorDoc.items[1].d,'visual path control must update d');
 await compatibilityPage.$eval('.tree-item[data-path="items.0"]',e=>e.click());
 await compatibilityPage.$$eval('#contextualElementTools button',els=>els.find(e=>e.textContent==='Adjust on canvas')?.click());
 const periodKnob=await compatibilityPage.$eval('#hatch-editor-overlay [data-hatch-control="period"]',el=>{
  const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await compatibilityPage.mouse.move(periodKnob.x,periodKnob.y);await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(periodKnob.x,periodKnob.y+27,{steps:6});await compatibilityPage.mouse.up();
 const changedPeriod=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value)).items[0].period;
 assert.notEqual(changedPeriod,'4mm','hatch period drag must modify native period');
 const repeatVectorDoc={xtemplate:1,id:'test.vector.repeat.group',name:'Vector nested repeat',items:[
  {type:'group',x:'15mm',y:'20mm',w:'160mm',h:'160mm',children:[
   {type:'repeat',axis:'y',period:'30mm',count:3,children:[
    {type:'polyline',points:[['10mm','0mm'],['35mm','10mm']],stroke:'ink'},
   ]},
  ]},
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'nested.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(repeatVectorDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Vector nested repeat');
 const repeatedPath='items.0.children.0.children.0';
 await compatibilityPage.$eval('.tree-item[data-path="'+repeatedPath+'"]',e=>e.click());
 await compatibilityPage.$$eval('#contextualElementTools button',els=>els.find(x=>x.textContent==='Edit points')?.click());
 const repetitions=await compatibilityPage.$$('g[data-path="'+repeatedPath+'"] > polyline');
 assert.equal(repetitions.length,3,'all instances of repeated polyline must be visible');
 const repeatedHandle=await compatibilityPage.$eval('#vector-overlay [data-vector-vertex="1"]',el=>{
  const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await compatibilityPage.mouse.move(repeatedHandle.x,repeatedHandle.y);await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(repeatedHandle.x+27,repeatedHandle.y+15,{steps:7});await compatibilityPage.mouse.up();
 const nestedDoc=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value));
 const movedNested=nestedDoc.items[0].children[0].children[0].points;
 assert.equal(movedNested[0][0],'10mm');
 assert.notEqual(movedNested[1][0],'35mm','repeat child point must be editable');
 assert.equal(await compatibilityPage.$$('g[data-path="'+repeatedPath+'"] > polyline').then(x=>x.length),3,'editing shared model keeps all repeat instances');
 // Pen tool: one toolbar button, four native creation modes, fine-editing and object deletion.
 const penDoc={xtemplate:1,id:'test.pen.unified',name:'Pen unified test',items:[]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'pen.xtemplate',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(penDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Pen unified test');
 const screenPos=async (x,y)=>compatibilityPage.evaluate(([x,y])=>{
  const svg=document.querySelector('#paper'),p=svg.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};
 },[x,y]);
 const clickDocument=async(x,y)=>{const p=await screenPos(x,y);await compatibilityPage.mouse.click(p.x,p.y);};
 const usePen=async mode=>{await compatibilityPage.click('.canvas-tool[data-tool="pen"]');await compatibilityPage.select('#penMode',mode);};
 const getPenItems=()=>compatibilityPage.$eval('#jsonEditor',el=>JSON.parse(el.value).items);
 await usePen('line');
 assert.equal(await compatibilityPage.$eval('#penModePicker',el=>el.classList.contains('hidden')),false);
 await clickDocument(25,36);await clickDocument(80,61);
 assert.equal((await getPenItems()).at(-1).type,'line','Pen Line must produce XNotes native line');
 await usePen('polyline');
 await clickDocument(30,120);await clickDocument(65,130);await clickDocument(78,166);
 await compatibilityPage.keyboard.press('Enter');
 assert.equal((await getPenItems()).at(-1).type,'polyline');
 assert.equal((await getPenItems()).at(-1).points.length,3);
 await usePen('polygon');
 await clickDocument(25,190);await clickDocument(72,191);await clickDocument(76,230);await clickDocument(30,234);
 await compatibilityPage.keyboard.press('Enter');
 assert.equal((await getPenItems()).at(-1).type,'polygon');
 assert.equal((await getPenItems()).at(-1).points.length,4);
 await compatibilityPage.keyboard.press('Backspace');
 assert.equal((await getPenItems()).at(-1).points.length,3,'Backspace removes selected vertex, not whole polygon');
 await compatibilityPage.keyboard.press('Delete');
 assert.equal(await compatibilityPage.$eval('#confirmModal',el=>el.classList.contains('hidden')),false,'Delete requests deleting whole element');
 await compatibilityPage.click('#acceptConfirmBtn');
 assert.equal((await getPenItems()).length,2,'Delete removes whole polygon');
 await usePen('path');
 await clickDocument(110,80);await clickDocument(145,106);await clickDocument(155,145);
 await compatibilityPage.keyboard.press('Enter');
 assert.equal((await getPenItems()).at(-1).type,'path');
 assert((await getPenItems()).at(-1).d.includes('C '));
 const svgNodeAlignment=await compatibilityPage.evaluate(()=>{
  const path=document.querySelector('g[data-path="items.2"] > path');
  const handle=document.querySelector('#svg-path-overlay [data-svg-path-point="3"] circle.svg-path-hit');
  const d=JSON.parse(document.querySelector('#jsonEditor').value).items.at(-1).d;
  const tokens=d.match(/[-+]?(?:\d*\.)?\d+/g).map(Number);
  const x=tokens[6],y=tokens[7]; // M x,y + C x1,y1,x2,y2,endX,endY
  const pt=path.ownerSVGElement.createSVGPoint();pt.x=x;pt.y=y;
  const shapeScreen=pt.matrixTransform(path.getScreenCTM());
  const r=handle.getBoundingClientRect();
  return {distance:Math.hypot(shapeScreen.x-(r.x+r.width/2),shapeScreen.y-(r.y+r.height/2)),x,y};
 });
 assert(svgNodeAlignment.distance<3,`SVG path nodes must match the rendered Bézier after Enter (${svgNodeAlignment.distance}px)`);
 const pathBeforeNudge=(await getPenItems()).at(-1).d;
 const penNode=await compatibilityPage.$eval('#svg-path-overlay [data-svg-path-point="2"]',el=>{
  const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await compatibilityPage.mouse.click(penNode.x,penNode.y);
 await compatibilityPage.keyboard.press('ArrowRight');
 const pathAfterNudge=(await getPenItems()).at(-1).d;
 assert.notEqual(pathAfterNudge,pathBeforeNudge,'arrow nudge should update only selected SVG path node');
 await compatibilityPage.keyboard.down('Control');await compatibilityPage.keyboard.press('z');await compatibilityPage.keyboard.up('Control');
 assert.equal((await getPenItems()).at(-1).d,pathBeforeNudge,'path nudge must be undoable');
 assert.equal(await compatibilityPage.$eval('#penModePicker',el=>el.classList.contains('hidden')),true,'Pen selector hidden while using V');
 // While authoring Bézier curves, clicking the most recent anchor retracts
 // its tangent instead of ending the path or inserting an overlapping point.
 await usePen('path');
 const a=await screenPos(55,215),b=await screenPos(94,222);
 await compatibilityPage.mouse.click(a.x,a.y);
 await compatibilityPage.mouse.move(b.x,b.y);await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(b.x+17,b.y-12,{steps:7});await compatibilityPage.mouse.up();
 await compatibilityPage.mouse.click(b.x,b.y); // retract outgoing tangent at last anchor
 await clickDocument(132,236);
 await compatibilityPage.keyboard.press('Enter');
 const cornerPath=(await getPenItems()).at(-1);
 assert.equal(cornerPath.type,'path');
 const coords=cornerPath.d.match(/[-+]?(?:\d*\.)?\d+/g).map(Number);
 assert(Math.hypot(coords[4]-coords[6],coords[5]-coords[7])>1,
  'clicking last anchor must preserve the incoming Bézier tangent of the preceding curve');
 assert(Math.abs(coords[8]-coords[6])<.001&&Math.abs(coords[9]-coords[7])<.001,
  'clicking last anchor must reset only the next segment outgoing tangent');
 const tangentPairs=await compatibilityPage.$$eval('#svg-path-overlay [data-path-tangent]',els=>els.map(e=>({side:e.dataset.pathTangent,collapsed:e.dataset.collapsedTangent==='true'})));
 assert(tangentPairs.some(x=>x.side==='incoming'&&!x.collapsed),'incoming tangent remains a visible independent handle');
 assert(tangentPairs.some(x=>x.side==='outgoing'&&x.collapsed),'reset outgoing tangent remains an accessible collapsed handle');
 // An intermediate anchor must expose *two* separately clickable handles.
 // The incoming tangent is the second C control of the preceding segment;
 // the outgoing tangent is the first C control of the next segment.
 const middleHandles=await compatibilityPage.evaluate(()=>{
  const read=index=>{
   const group=document.querySelector('#svg-path-overlay [data-svg-path-point="'+index+'"]');
   const r=group.querySelector('circle.svg-path-hit').getBoundingClientRect();
   return {x:r.x+r.width/2,y:r.y+r.height/2,side:group.dataset.pathTangent,collapsed:group.dataset.collapsedTangent==='true'};
  };
  const incoming=read(2),outgoing=read(4),anchor=read(3);
  const pick=p=>document.elementFromPoint(p.x,p.y)?.closest('[data-svg-path-point]')?.dataset.svgPathPoint;
  return {incoming,outgoing,anchor,incomingPick:pick(incoming),outgoingPick:pick(outgoing)};
 });
 assert.equal(middleHandles.incoming.side,'incoming');
 assert.equal(middleHandles.outgoing.side,'outgoing');
 assert(Math.hypot(middleHandles.incoming.x-middleHandles.outgoing.x,middleHandles.incoming.y-middleHandles.outgoing.y)>18,
  'both Bézier tangents must appear independently, separated in screen pixels');
 assert.equal(middleHandles.incomingPick,'2','incoming tangent must be independently mouse targetable');
 assert.equal(middleHandles.outgoingPick,'4','outgoing tangent must be independently mouse targetable');
 const beforeTangentEdit=editablePathNodes((await getPenItems()).at(-1).d).nodes;
 const dragTangent=async(h,dx,dy)=>{
  await compatibilityPage.mouse.move(h.x,h.y);await compatibilityPage.mouse.down();
  await compatibilityPage.mouse.move(h.x+dx,h.y+dy,{steps:6});await compatibilityPage.mouse.up();
 };
 await dragTangent(middleHandles.outgoing,17,9);
 let afterTangentEdit=editablePathNodes((await getPenItems()).at(-1).d).nodes;
 assert(Math.hypot(afterTangentEdit[4].x-beforeTangentEdit[4].x,afterTangentEdit[4].y-beforeTangentEdit[4].y)>0.5,
  'collapsed outgoing tangent must be extendable after Enter');
 assert.equal(afterTangentEdit[2].x,beforeTangentEdit[2].x,'outgoing drag preserves incoming X');
 assert.equal(afterTangentEdit[2].y,beforeTangentEdit[2].y,'outgoing drag preserves incoming Y');
 await compatibilityPage.keyboard.down('Control');await compatibilityPage.keyboard.press('z');await compatibilityPage.keyboard.up('Control');
 const afterUndo=editablePathNodes((await getPenItems()).at(-1).d).nodes;
 assert.equal(afterUndo[4].x,beforeTangentEdit[4].x,'one undo restores original outgoing handle');
 // Undo currently clears the document selection; reselect the restored node
 // before testing the second independent handle.
 const lastIndex=(await getPenItems()).length-1;
 await compatibilityPage.$eval('.tree-item[data-path="items.'+lastIndex+'"]',el=>el.click());
 const incomingAgain=await compatibilityPage.$eval('#svg-path-overlay [data-svg-path-point="2"] circle.svg-path-hit',el=>{
  const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await dragTangent(incomingAgain,-16,12);
 afterTangentEdit=editablePathNodes((await getPenItems()).at(-1).d).nodes;
 assert(Math.hypot(afterTangentEdit[2].x-beforeTangentEdit[2].x,afterTangentEdit[2].y-beforeTangentEdit[2].y)>0.5,
  'incoming tangent remains independently adjustable');
 assert.equal(afterTangentEdit[4].x,beforeTangentEdit[4].x,'incoming drag preserves outgoing X');
 assert.equal(afterTangentEdit[4].y,beforeTangentEdit[4].y,'incoming drag preserves outgoing Y');
 // Mirroring must rewrite only XNotes-native coordinates, including curves,
 // preserving styles, other axis expressions, nested group and repeat layout.
 const flipDoc={xtemplate:1,id:'test.flip.native',name:'Native mirror tests',items:[
  {type:'line',x1:'15mm',y1:'10mm',x2:'45mm',y2:'35mm',stroke:'#aa1133'},
  {type:'polygon',points:[['10mm','8mm'],['60mm','12mm'],['25mm','50mm']],stroke:'ink',fill:'#aabbcc'},
  {type:'group',x:'20mm',y:'30mm',w:'120mm',h:'100mm',children:[
   {type:'repeat',axis:'x',period:'35mm',count:2,children:[
    {type:'polyline',points:[['5mm','0mm'],['W/2','20mm'],['30mm','40mm']],stroke:'ink'}
   ]}
  ]},
  {type:'path',x:'30mm',y:'50mm',w:'80mm',h:'60mm',viewBox:[0,0,100,80],d:'M 0 0 C 20 15 60 20 90 70',stroke:'#446688'}
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'mirror.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(flipDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Native mirror tests');
 const getFlipItems=()=>compatibilityPage.$eval('#jsonEditor',el=>JSON.parse(el.value).items);
 const flip=async axis=>compatibilityPage.click(`#contextualElementTools [data-flip-axis="${axis}"]`);
 await compatibilityPage.$eval('.tree-item[data-path="items.0"]',e=>e.click());
 assert.equal(await compatibilityPage.$$('#contextualElementTools [data-flip-axis]').then(x=>x.length),2);
 await flip('horizontal');
 assert.deepEqual((await getFlipItems())[0],{...flipDoc.items[0],x1:'45mm',x2:'15mm'},'line horizontal flip only affects native X coordinates');
 await compatibilityPage.keyboard.down('Control');await compatibilityPage.keyboard.press('z');await compatibilityPage.keyboard.up('Control');
 assert.deepEqual((await getFlipItems())[0],flipDoc.items[0],'flip must be undoable');
 await compatibilityPage.$eval('.tree-item[data-path="items.1"]',e=>e.click());
 await flip('vertical');
 assert.deepEqual((await getFlipItems())[1].points,[['10mm','50mm'],['60mm','46mm'],['25mm','8mm']]);
 assert.equal((await getFlipItems())[1].fill,'#aabbcc','fill preserved during mirror');
 await compatibilityPage.$eval('.tree-item[data-path="items.3"]',e=>e.click());
 await flip('horizontal');
 assert.equal((await getFlipItems())[3].d,'M 90 0 C 70 15 30 20 0 70','SVG cubic anchors and controls flipped natively');
 assert.deepEqual((await getFlipItems())[3].viewBox,[0,0,100,80]);
 const flippedRepeatPath='items.2.children.0.children.0';
 await compatibilityPage.$eval('.tree-item[data-path="'+flippedRepeatPath+'"]',e=>e.click());
 const beforeRepeat=(await getFlipItems())[2].children[0].children[0];
 assert.equal(beforeRepeat.points[1][0],'W/2');
 let accepted=false;
 // An earlier suite handler already accepts native confirm dialogs.
 compatibilityPage.once('dialog',()=>{accepted=true;});
 await flip('horizontal');
 assert.equal(accepted,true,'mirroring expressions requires explicit user confirmation');
 const afterRepeat=(await getFlipItems())[2].children[0].children[0];
 assert.equal(afterRepeat.points[0][0],'30mm');
 assert.equal(afterRepeat.points[2][0],'5mm');
 assert.deepEqual(afterRepeat.points.map(p=>p[1]),['0mm','20mm','40mm'],'unaffected axis is never flattened');
 assert.equal((await compatibilityPage.$$('g[data-path="'+flippedRepeatPath+'"] > polyline')).length,2,'repeated shapes share the new mirrored node');
 assert.equal(afterRepeat.type,'polyline');
 assert.deepEqual(Object.keys(afterRepeat).sort(),Object.keys(beforeRepeat).sort(),'mirroring must not invent unsupported XNotes keys');
 // Closing the Pen by clicking the original first node must never create
 // an overlapping editable vertex, including curved cubic closure.
 const closeDoc={xtemplate:1,id:'test.pen.close.first',name:'Close by original anchor',items:[]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'pen-close.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(closeDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Close by original anchor');
 await usePen('polygon');
 const polygonFirst={x:35,y:145};
 await clickDocument(polygonFirst.x,polygonFirst.y);
 await clickDocument(95,130);await clickDocument(135,178);
 await clickDocument(polygonFirst.x,polygonFirst.y);
 let closedItem=(await getPenItems()).at(-1);
 assert.equal(closedItem.type,'polygon');
 assert.equal(closedItem.points.length,3,'clicking initial Polygon point must reuse it, not append');
 assert.equal(closedItem.points.filter(p=>p[0]==='35mm'&&p[1]==='145mm').length,1);
 const straightCloseDoc={xtemplate:1,id:'test.pen.close.curve',name:'Bezier close by first',items:[]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'path-close.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(straightCloseDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Bezier close by first');
 await usePen('path');
 const firstX=35,firstY=145;
 await clickDocument(firstX,firstY);
 await clickDocument(105,130);await clickDocument(150,190);
 await clickDocument(firstX,firstY);
 closedItem=(await getPenItems()).at(-1);
 assert.equal(closedItem.type,'path');
 assert.equal(closedItem.d.match(/ C /g).length,2,'straight closing edge uses Z without duplicate C');
 assert.equal(closedItem.d.endsWith(' Z'),true);
 assert.equal(closedSvgAnchorAlias(editablePathNodes(closedItem.d)),null);
 assert.equal(await compatibilityPage.$$('#svg-path-overlay .svg-path-handle.anchor').then(x=>x.length),3,
  'only three unique SVG anchors should display after closing');
 const bezierCloseDoc={xtemplate:1,id:'test.pen.close.bezier',name:'Curved close by first',items:[]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'curved-close.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(bezierCloseDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Curved close by first');
 await usePen('path');
 const anchor1=await screenPos(firstX,firstY),anchor2=await screenPos(105,130),anchor3=await screenPos(150,190);
 await compatibilityPage.mouse.click(anchor1.x,anchor1.y);
 await compatibilityPage.mouse.move(anchor2.x,anchor2.y);await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(anchor2.x+17,anchor2.y-11,{steps:6});await compatibilityPage.mouse.up();
 await compatibilityPage.mouse.move(anchor3.x,anchor3.y);await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(anchor3.x+12,anchor3.y+13,{steps:6});await compatibilityPage.mouse.up();
 await compatibilityPage.mouse.click(anchor1.x,anchor1.y);
 closedItem=(await getPenItems()).at(-1);
 assert.equal(closedItem.type,'path');
 const closedParsed=editablePathNodes(closedItem.d),closingAlias=closedSvgAnchorAlias(closedParsed);
 assert(closingAlias,'curved closing segment must alias final C anchor to M');
 assert.equal(closedItem.d.match(/ C /g).length,3,'curved closing segment preserved');
 assert.equal(await compatibilityPage.$$('#svg-path-overlay .svg-path-handle.anchor').then(x=>x.length),3,
  'curved closing edge has three visually distinct anchor markers, not four');
 assert.equal(await compatibilityPage.$$('#svg-path-overlay [data-svg-path-point="'+closingAlias.aliasIndex+'"]')
  .then(x=>x.length),0,'closing alias never creates a second overlapping handle');
 const initialHandle=await compatibilityPage.$eval('#svg-path-overlay [data-svg-path-point="0"] circle.svg-path-hit',el=>{
  const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await compatibilityPage.mouse.move(initialHandle.x,initialHandle.y);await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(initialHandle.x+17,initialHandle.y+9,{steps:6});await compatibilityPage.mouse.up();
 const editedClosed=editablePathNodes((await getPenItems()).at(-1).d);
 assert.equal(editedClosed.nodes[0].x,editedClosed.nodes[closingAlias.aliasIndex].x,
  'moving the first vertex also moves the closing C endpoint');
 assert.equal(editedClosed.nodes[0].y,editedClosed.nodes[closingAlias.aliasIndex].y);
 // Drawing and editing on the pasteboard: negative and beyond-right-edge
 // native coordinates must survive export, without extending the XNotes paper.
 const offPageDoc={xtemplate:1,id:'test.pen.off.page',name:'Outside-page points',items:[]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'offpage.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(offPageDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Outside-page points');
 assert.equal(await compatibilityPage.$eval('#paper',el=>getComputedStyle(el).overflow),'visible',
  'pasteboard geometry should be visible outside the SVG page');
 await compatibilityPage.click('#togglePasteboard');
 assert.equal(await compatibilityPage.$eval('#paper',el=>getComputedStyle(el).overflow),'hidden',
  'page preview should clip nodes to the paper boundaries');
 await compatibilityPage.click('#togglePasteboard');
 assert.equal(await compatibilityPage.$eval('#paper',el=>getComputedStyle(el).overflow),'visible',
  'returning to the pasteboard should reveal outside handles again');
 await usePen('polygon');
 const outsideFirst=await screenPos(230,90);
 const outsideLeft=await screenPos(-12,170);
 const paperRect=await compatibilityPage.$eval('#paper',el=>el.getBoundingClientRect().toJSON());
 assert(outsideFirst.x>paperRect.right,'test must click beyond actual paper edge');
 assert(outsideLeft.x<paperRect.left,'test must click left of actual paper edge');
 await compatibilityPage.mouse.click(outsideFirst.x,outsideFirst.y);
 await clickDocument(175,110);
 await compatibilityPage.mouse.click(outsideLeft.x,outsideLeft.y);
 await compatibilityPage.keyboard.press('Enter');
 const outsidePolygon=(await getPenItems())[0];
 assert.equal(outsidePolygon.type,'polygon');
 assert.deepEqual(outsidePolygon.points,[['230mm','90mm'],['175mm','110mm'],['-12mm','170mm']],
  'outside clicks must become native XNotes coordinates, including negatives');
 assert.equal(await compatibilityPage.$eval('#paper',el=>el.getAttribute('viewBox')),'0 0 210 297',
  'allowing outside points must not expand the exported page dimensions');
 const rightVertex=await compatibilityPage.$eval('#vector-overlay [data-vector-vertex="0"]',el=>{
  const bounds=el.querySelector('circle').getBoundingClientRect();return{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
 });
 const rightTarget=await compatibilityPage.evaluate(([x,y])=>document.elementFromPoint(x,y)?.closest('[data-vector-vertex]')?.dataset.vectorVertex,[rightVertex.x,rightVertex.y]);
 assert.equal(rightTarget,'0','outside-page anchor must be clickable in the pasteboard');
 await compatibilityPage.mouse.move(rightVertex.x,rightVertex.y);
 await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(rightVertex.x+24,rightVertex.y+12,{steps:7});
 await compatibilityPage.mouse.up();
 const movedOutside=(await getPenItems())[0];
 assert.notEqual(movedOutside.points[0][0],'230mm','dragging an outside vertex must persist geometry');
 assert.deepEqual(movedOutside.points[2],['-12mm','170mm'],'editing must preserve other off-page coordinates');
 await compatibilityPage.keyboard.down('Control');await compatibilityPage.keyboard.press('z');await compatibilityPage.keyboard.up('Control');
 assert.deepEqual((await getPenItems())[0].points,outsidePolygon.points,'undo restores off-page point position');
 await usePen('path');
 await compatibilityPage.mouse.click((await screenPos(-14,115)).x,(await screenPos(-14,115)).y);
 await clickDocument(60,85);await compatibilityPage.mouse.click((await screenPos(233,140)).x,(await screenPos(233,140)).y);
 await compatibilityPage.keyboard.press('Enter');
 const outsidePath=(await getPenItems()).at(-1);
 assert.equal(outsidePath.type,'path');
 assert(Number.parseFloat(outsidePath.x)<0,'path geometry extends beyond the left paper edge');
 assert(Number.parseFloat(outsidePath.w)>210,'path geometry can extend beyond both paper edges');
 assert.deepEqual(Object.keys(outsidePath).sort(),['d','fill','h','stroke','strokeWidth','type','viewBox','w','x','y'].sort(),
  'no unsupported pasteboard properties are exported');
 {
 // Keep final artwork clipped to paper while leaving pasteboard handles
 // editable; verify compact suggestions, native color picker and Shift resize.
 const polishPage=await browser.newPage();
 await polishPage.setViewport({width:1440,height:900});
 polishPage.on('pageerror',e=>errors.push(e.message));
 await polishPage.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
 const polishDoc={xtemplate:1,id:'test.canvas.precision',name:'Precision canvas',params:{},items:[
  {type:'rect',x:'20mm',y:'40mm',w:'40mm',h:'40mm',stroke:'ink',fill:'#8899cc'},
  {type:'rect',x:'100mm',y:'115mm',w:'18mm',h:'20mm',stroke:'ink',fill:'#556677'},
  {type:'ellipse',cx:'220mm',cy:'130mm',rx:'40mm',ry:'28mm',fill:'#bb2255'}
 ]};
 await polishPage.$eval('#fileInput',(input,raw)=>{
  const dt=new DataTransfer();dt.items.add(new File([raw],'precision.xtemplate',{type:'application/json'}));
  input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(polishDoc));
 await polishPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Precision canvas');
 const visualClip=await polishPage.evaluate(()=>{
  const artwork=document.querySelector('#page-artwork');
  const clip=document.querySelector('#xstudio-page-artwork-clip rect');
  const external=document.querySelector('g[data-path="items.2"]');
  const paper=document.querySelector('#paper');
  const rect=paper.createSVGPoint();rect.x=235;rect.y=130;
  const location=rect.matrixTransform(paper.getScreenCTM());
  const hit=document.elementFromPoint(location.x,location.y);
  return {clipPath:artwork?.getAttribute('clip-path'),
   children:[...artwork.querySelectorAll('g[data-path]')].length,
   clipBounds:clip&&[clip.getAttribute('x'),clip.getAttribute('y'),clip.getAttribute('width'),clip.getAttribute('height')],
   externalShape:!!external,interceptsOutside:!!hit?.closest('#page-artwork'),
   paperOverflow:getComputedStyle(paper).overflow};
 });
 assert.equal(visualClip.clipPath,'url(#xstudio-page-artwork-clip)');
 assert.deepEqual(visualClip.clipBounds,['0','0','210','297']);
 assert.equal(visualClip.children,3);
 assert.equal(visualClip.externalShape,true,'original outside geometry remains editable and exportable');
 assert.equal(visualClip.interceptsOutside,false,'clipped content must not intercept pasteboard mouse events');
 assert.equal(visualClip.paperOverflow,'visible','control overlays can still extend beyond paper');
 // Selected transforms belong to an unclipped editor layer, even when the
 // entire resize handle lies beyond the canvas page rectangle.
 await polishPage.$eval('.tree-item[data-path="items.2"]',el=>el.click());
 const ellipseOuterHandle=await polishPage.$eval('#editor-selection-overlay g[data-path="items.2"] [data-handle="e"]',el=>{
  const r=el.getBoundingClientRect(),paper=document.querySelector('#paper').getBoundingClientRect();
  const x=r.x+r.width/2,y=r.y+r.height/2;
  return {x,y,pageRight:paper.right,pageLeft:paper.left,overlays:document.querySelectorAll('#editor-selection-overlay [data-handle]').length,
   target:document.elementFromPoint(x,y)?.closest('[data-handle]')?.dataset.handle};
 });
 assert(ellipseOuterHandle.x>ellipseOuterHandle.pageRight+10,'ellipse resize handle must extend beyond page');
 assert.equal(ellipseOuterHandle.target,'e','outside transform handle remains clickable');
 assert(ellipseOuterHandle.overlays>=8,'eight standard transforms are rendered outside the clip');
 await polishPage.mouse.move(ellipseOuterHandle.x,ellipseOuterHandle.y);
 await polishPage.mouse.down();
 await polishPage.mouse.move(ellipseOuterHandle.x+20,ellipseOuterHandle.y,{steps:6});
 await polishPage.mouse.up();
 const resizedOutsideEllipse=JSON.parse(await polishPage.$eval('#jsonEditor',el=>el.value)).items[2];
 assert(parseFloat(resizedOutsideEllipse.rx)>40,'off-page transformation changes native geometry');
 assert.equal(resizedOutsideEllipse.type,'ellipse');
 await polishPage.keyboard.down('Control');await polishPage.keyboard.press('z');await polishPage.keyboard.up('Control');
 assert.equal(JSON.parse(await polishPage.$eval('#jsonEditor',el=>el.value)).items[2].rx,'40mm');
 await polishPage.click('[data-inspector="params"]');
 await polishPage.click('#addParam');
 await polishPage.select('#newParamType','color');
 assert.equal(await polishPage.$eval('#newParamColorPicker',el=>el.classList.contains('hidden')),false);
 assert.equal(await polishPage.$eval('#newParamColorPicker',el=>el.value),'#4f7cff');
 assert.equal(await polishPage.$eval('#newParamDefault',el=>el.value),'#4f7cff');
 await polishPage.$eval('#newParamColorPicker',el=>{el.value='#ab34ef';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await polishPage.$eval('#newParamDefault',el=>el.value),'#ab34ef', 'color picker updates native variable hex');
 await polishPage.$eval('#newParamDefault',el=>{el.value='#fed';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await polishPage.$eval('#newParamColorPicker',el=>el.value),'#ffeedd', 'hex input updates picker, supporting shorthand');
 await polishPage.$eval('#newParamName',el=>{el.value='coverTint';});
 await polishPage.click('#paramCreateForm button[type="submit"]');
 const colorDoc=JSON.parse(await polishPage.$eval('#jsonEditor',el=>el.value));
 assert.equal(colorDoc.params.coverTint.type,'color');
 assert.equal(colorDoc.params.coverTint.default,'#fed');
 await polishPage.click('[data-inspector="properties"]');
 await polishPage.$eval('.tree-item[data-path="items.0"]',el=>el.click());
 await polishPage.click('#elementStroke');
 const popupMetrics=await polishPage.$eval('#variableCompletion',el=>{
  const r=el.getBoundingClientRect(),rows=[...el.querySelectorAll('.variable-completion-item')];
  return {width:r.width,height:r.height,rows:rows.length,rowHeight:rows[0]?.getBoundingClientRect().height};
 });
 assert(popupMetrics.rows>=4,'color tokens and added color variables must be suggested');
 assert(popupMetrics.width<=280&&popupMetrics.height<=210&&popupMetrics.rowHeight<=38,
  'suggestion popup stays compact: '+JSON.stringify(popupMetrics));
 await polishPage.$eval('#elementStroke',el=>el.blur());
 const corner=await polishPage.$eval('g[data-path="items.0"] [data-handle="se"]',el=>{
  const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
 });
 const resizeTarget=await polishPage.evaluate(()=>{
  const p=document.querySelector('#paper').createSVGPoint();p.x=99;p.y=99;
  const q=p.matrixTransform(document.querySelector('#paper').getScreenCTM());
  return {x:q.x,y:q.y};
 });
 await polishPage.mouse.move(corner.x,corner.y);
 await polishPage.keyboard.down('Shift');
 await polishPage.mouse.down();
 await polishPage.mouse.move(resizeTarget.x,resizeTarget.y,{steps:12});
 const activeGuide=await polishPage.$$('.smart-guide').then(els=>els.length);
 await polishPage.mouse.up();
 await polishPage.keyboard.up('Shift');
 const resized=JSON.parse(await polishPage.$eval('#jsonEditor',el=>el.value)).items[0];
 assert(Math.abs(parseFloat(resized.w)-parseFloat(resized.h))<.011,'Shift resize must preserve square geometry');
 assert.equal(resized.x,'20mm');assert.equal(resized.y,'40mm');
 assert(Math.abs(parseFloat(resized.w)-80)<5,'object magnetic snap should bring square near 80mm');
 assert(activeGuide>0,'magnetic guide should appear during square resize');
 await polishPage.keyboard.down('Control');await polishPage.keyboard.press('z');await polishPage.keyboard.up('Control');
 const afterUndoResize=JSON.parse(await polishPage.$eval('#jsonEditor',el=>el.value)).items[0];
 assert.equal(afterUndoResize.w,'40mm');assert.equal(afterUndoResize.h,'40mm','resize has one Undo snapshot');
 await polishPage.close();
 }
 await compatibilityPage.close();
 assert.deepEqual(errors,[],'no errors for sparse multi-edit or repeated snapping');
 console.log('PASS: sparse property compatibility, repeated geometry guides and Settings toggle');
 console.log('PASS: hierarchical Ctrl-selection and compatible batch edits');
 console.log('PASS: document modal, quick colors, Page hierarchy, themes and rotation controls');
 console.log('PASS: SVG selection, transform handles, live drag, marquee and object-to-object smart guides');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
