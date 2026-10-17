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
 const repeatedHline='g[data-path="items.0.children.0"]';
 assert.equal((await compatibilityPage.$$(repeatedHline)).length,4,'all four horizontal lines must render');
 await compatibilityPage.$eval('.tree-item[data-path="items.0.children.0"]',el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 // A repeated child keeps only its two endpoint resize handles, focused on
 // one copy; the outer repeat block owns the single rotation control.
 const childHandles=await compatibilityPage.$$eval(repeatedHline,nodes=>nodes.map(n=>n.querySelectorAll('[data-handle]').length));
 assert.equal(childHandles.filter(x=>x>0).length,1,'one repeat copy may have resize handles');
 assert.equal(childHandles.reduce((a,b)=>a+b,0),2,'hline keeps only two endpoint resize handles');
 assert.equal(await compatibilityPage.$$eval(repeatedHline,nodes=>nodes.reduce((count,n)=>count+n.querySelectorAll('[data-handle="rotate"]').length,0)),0,
  'repeat copies do not each rotate individually');
 assert.equal(await compatibilityPage.$eval('g[data-path="items.0"]',n=>n.querySelectorAll(':scope > [data-handle="rotate"]').length),1,
  'repeat must show one rotation handle for its entire bounds');
 const thirdCopy=await compatibilityPage.$$eval(repeatedHline+' .svg-hitbox',nodes=>{
  const r=nodes[2].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};
 });
 await compatibilityPage.mouse.click(thirdCopy.x,thirdCopy.y);
 const focusHandles=await compatibilityPage.$$eval(repeatedHline,nodes=>nodes.map(n=>n.querySelectorAll('[data-handle]').length));
 assert.equal(focusHandles[2],2,'third copy gains the two endpoint resize handles');
 const resizeHandle=await compatibilityPage.$$eval(repeatedHline,nodes=>{
  const r=nodes[2].querySelector('[data-handle="e"]').getBoundingClientRect();
  return{x:r.x+r.width/2,y:r.y+r.height/2};
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
 // Rigid rotation of repeated lines around the *whole collection* center.
 // Distances between endpoints and line spacing must be preserved.
 const rotateDoc={xtemplate:1,id:'test.repeat.rotate.block',name:'Repeat block rotation',params:{},items:[
  {type:'repeat',axis:'y',period:'20mm',count:4,children:[
   {type:'hline',x1:'40mm',x2:'120mm',y:'0mm',stroke:'ink'},
   {type:'text',text:'Text',x:'42mm',y:'10mm',fill:'ink'},
  ]},
 ]};
 await compatibilityPage.$eval('#fileInput',(input,raw)=>{
  const transfer=new DataTransfer();transfer.items.add(new File([raw],'rotation.xtemplate',{type:'application/json'}));
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 },JSON.stringify(rotateDoc));
 await compatibilityPage.waitForFunction(()=>document.querySelector('#docName')?.textContent==='Repeat block rotation');
 const copyPath='g[data-path="items.0.children.0"]';
 assert.equal((await compatibilityPage.$$(copyPath)).length,4);
 await compatibilityPage.$eval('.tree-item[data-path="items.0"]',n=>n.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 const beforeGeometry=await compatibilityPage.evaluate(()=>{
  const lines=[...document.querySelectorAll('g[data-path="items.0.children.0"] > line')];
  return lines.map(line=>({x1:+line.getAttribute('x1'),x2:+line.getAttribute('x2'),y:+line.getAttribute('y1')}));
 });
 const pivot=await compatibilityPage.$eval('g[data-path="items.0"]',element=>{
  const frame=element.querySelector(':scope > .repeat-selection').getBoundingClientRect();
  const handle=element.querySelector(':scope > [data-handle="rotate"]').getBoundingClientRect();
  return{cx:frame.left+frame.width/2,cy:frame.top+frame.height/2,
   hx:handle.left+handle.width/2,hy:handle.top+handle.height/2};
 });
 const r=Math.hypot(pivot.hx-pivot.cx,pivot.hy-pivot.cy);
 await compatibilityPage.mouse.move(pivot.hx,pivot.hy);
 await compatibilityPage.mouse.down();
 await compatibilityPage.mouse.move(pivot.cx+r,pivot.cy,{steps:14});
 await compatibilityPage.mouse.up();
 const rotated=JSON.parse(await compatibilityPage.$eval('#jsonEditor',el=>el.value));
 assert(Math.abs(rotated.items[0].rotate-90)<6,`repeat should rotate the entire block 90°: ${rotated.items[0].rotate}`);
 assert.equal(rotated.items[0].children[0].rotate,undefined,'rotation must not be written to child hline');
 const result=await compatibilityPage.$eval('g[data-path="items.0"]',element=>({
  transform:element.getAttribute('transform'),
  childTransforms:[...element.querySelectorAll('g[data-path="items.0.children.0"]')].map(el=>el.getAttribute('transform')),
 }));
 assert(result.transform.startsWith('rotate('),'repeat parent must own the rotation transform');
 assert(result.childTransforms.every(x=>!x),'repeat children should keep untransformed shared geometry');
 assert(await compatibilityPage.$$eval('g[data-path="items.0.children.1"] text',els=>els.every(el=>!el.getAttribute('transform'))),
  'text children must not inherit the parent repeat rotation a second time');
 const afterGeometry=await compatibilityPage.evaluate(()=>{
  const lines=[...document.querySelectorAll('g[data-path="items.0.children.0"] > line')];
  return lines.map(line=>{
   const paper=document.querySelector('#paper');const m=paper.getScreenCTM().inverse().multiply(line.getScreenCTM());const x1=+line.getAttribute('x1'),x2=+line.getAttribute('x2'),y=+line.getAttribute('y1');
   return {a:{x:m.a*x1+m.c*y+m.e,y:m.b*x1+m.d*y+m.f},
    b:{x:m.a*x2+m.c*y+m.e,y:m.b*x2+m.d*y+m.f}};
  });
 });
 assert.equal(afterGeometry.length,4);
 for(const line of afterGeometry)assert(Math.abs(Math.hypot(line.b.x-line.a.x,line.b.y-line.a.y)-80)<0.1,
  'rigid 90-degree group rotation must preserve line length');
 for(let i=1;i<afterGeometry.length;i++)assert(Math.abs(Math.hypot(afterGeometry[i].a.x-afterGeometry[i-1].a.x,afterGeometry[i].a.y-afterGeometry[i-1].a.y)-20)<0.1,
  'rigid group rotation must preserve repeat spacing');
 assert.equal(beforeGeometry.length,4);
 await compatibilityPage.close();
 assert.deepEqual(errors,[],'no errors for sparse multi-edit or repeated snapping');
 console.log('PASS: sparse property compatibility, repeated geometry guides and Settings toggle');
 console.log('PASS: hierarchical Ctrl-selection and compatible batch edits');
 console.log('PASS: document modal, quick colors, Page hierarchy, themes and rotation controls');
 console.log('PASS: SVG selection, transform handles, live drag, marquee and object-to-object smart guides');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
