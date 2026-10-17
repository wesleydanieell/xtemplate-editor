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
 // Smart alignment: compare one shape to another, not just page centers.
 const guidesPage=await browser.newPage();
 await guidesPage.setViewport({width:1440,height:900});
 guidesPage.on('pageerror',error=>errors.push(error.message));
 await guidesPage.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
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
 assert.equal(await guidesPage.$eval('g[data-path="items.3"]',el=>el.querySelectorAll('.transform-handle.rotate-handle').length),1,
  'selected text should provide a rotation handle');
 await guidesPage.close();
 assert.deepEqual(errors,[],'no browser errors after object snapping and text selection');
 // Editor UI regression: document modal, nested Page hierarchy, color sync,
 // theme persistence and quick rotation while preserving precise numeric input.
 const workspacePage=await browser.newPage();
 await workspacePage.setViewport({width:1440,height:900});
 workspacePage.on('pageerror',error=>errors.push(error.message));
 await workspacePage.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle0'});
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
 await workspacePage.click('[data-rotation-preset="90"]');
 assert.equal(Number(await workspacePage.$eval('#transformRotate',el=>el.value)),90);
 const wheel=await workspacePage.$eval('#rotationWheel',el=>el.getBoundingClientRect().toJSON());
 const cx=wheel.x+wheel.width/2,cy=wheel.y+wheel.height/2;
 await workspacePage.mouse.move(cx,cy);await workspacePage.mouse.down();
 await workspacePage.mouse.move(cx+wheel.width*.35,cy,{steps:4});await workspacePage.mouse.up();
 assert.equal(Number(await workspacePage.$eval('#transformRotate',el=>el.value)),90);
 // Exact values remain possible even after coarse pointer adjustment.
 await workspacePage.$eval('#transformRotate',input=>{
  input.value='-35.5';input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 assert.equal(Number(await workspacePage.$eval('#transformRotate',el=>el.value)),-35.5);
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
 await workspacePage.click('[data-menu="viewMenu"]');
 await workspacePage.click('#viewMenu [data-menu-action="zoom-in"]');
 const larger=await pageWidth();
 assert(larger>fitWidth+0.5,`View Zoom in should grow page: ${fitWidth} → ${larger}`);
 await workspacePage.click('[data-menu="viewMenu"]');
 await workspacePage.click('#viewMenu [data-menu-action="zoom-out"]');
 const smaller=await pageWidth();
 assert(smaller<larger-0.5,`View Zoom out should shrink page: ${larger} → ${smaller}`);
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
 console.log('PASS: document modal, quick colors, Page hierarchy, themes and rotation controls');
 console.log('PASS: SVG selection, transform handles, live drag, marquee and object-to-object smart guides');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
