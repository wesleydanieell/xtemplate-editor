/** Consistent, locally bundled Lucide icons. SVG is generated from reviewed
 * Lucide ISC-licensed markup; labels remain visible and accessible.
 * A scoped observer updates dynamic tree rows/inspectors without interfering
 * with the editor's original callbacks or control IDs. */
import {iconPaths} from './icon-data.js';
const SVG_NS='http://www.w3.org/2000/svg';
export function icon(name,{size=16}={}){
 const source=iconPaths[name]||iconPaths['info'];
 const svg=document.createElementNS(SVG_NS,'svg');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width',String(size));svg.setAttribute('height',String(size));
 svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');
 svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
 svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add('ui-icon');
 const template=document.createElement('template');template.innerHTML=`<svg xmlns="${SVG_NS}">${source}</svg>`;
 svg.replaceChildren(...template.content.querySelector('svg').children);
 return svg;
}
const entries=[
 ['[data-toggle-panel="layers"]','panel-left'],['[data-toggle-panel="properties"]','panel-right'],
 ['#undoBtn','undo-2'],['#redoBtn','redo-2'],['.top-export','download'],
 ['[data-left-tab="layers"]','layers'],['[data-left-tab="templates"]','layout-template'],
 ['[data-right-tab="properties"]','sliders-horizontal'],['[data-right-tab="variables"]','sliders-vertical'],
 ['#addElement','plus'],['#expandTree','chevron-down'],
 ['#newBtn','file-plus-2'],['#openBtn','folder-open'],['#saveBtn','download'],
 ['#fileInfoBtn','file-text'],['#insertImageBtn','image'],
 ['#settingsMenu [for="themeSelect"]','palette'],
 ['#contextMenu [data-action="copy"]','copy'],['#contextMenu [data-action="cut"]','scissors'],
 ['#contextMenu [data-action="paste"]','clipboard'],['#contextMenu [data-action="group"]','group'],
 ['#contextMenu [data-action="rename"]','type'],['#contextMenu [data-action="duplicate"]','copy'],
 ['#contextMenu [data-action="delete"]','trash-2'],['#contextMenu [data-action="up"]','arrow-up'],
 ['#contextMenu [data-action="down"]','arrow-down'],
 ['[data-menu-action="undo"]','undo-2'],['[data-menu-action="redo"]','redo-2'],
 ['[data-menu-action="copy"]','copy'],['[data-menu-action="paste"]','clipboard'],
 ['[data-menu-action="cut"]','scissors'],['[data-menu-action="duplicate"]','copy'],
 ['[data-menu-action="group"]','group'],['[data-menu-action="delete"]','trash-2'],
 ['[data-menu-action="insert-rect"]','square'],['[data-menu-action="insert-text"]','type'],
 ['[data-menu-action="insert-repeat"]','repeat-2'],['[data-menu-action="insert-group"]','group'],
 ['[data-menu-action="split"]','file-code-2'],['[data-menu-action="fit"]','scan'],
 ['[data-menu-action="zoom-in"]','zoom-in'],['[data-menu-action="zoom-out"]','zoom-out'],
 ['[data-menu-action="properties"]','sliders-horizontal'],['[data-menu-action="variables"]','sliders-vertical'],
 ['#emptySelection .empty-icon','mouse-pointer-2'],
 ['[data-image-crop="toggle"]','crop'],['[data-image-crop-cancel]','x'],
 ['[data-image-replace]','image'],['#penCancel','x'],
 ['#togglePasteboard','scan'],['#splitToggle','file-code-2'],
 ['#canvasAddImage','image'],['[data-tool="select"]','mouse-pointer-2'],
 ['[data-tool="rect"]','square'],['[data-tool="ellipse"]','circle'],
 ['[data-tool="pen"]','pen-tool'],['[data-tool="ruled"]','rows-3'],
 ['[data-tool="grid"]','grid-3x3'],['[data-tool="text"]','type']
];
const headingIcons={content:'type',specific:'sliders-horizontal',layout:'move',appearance:'palette',technical:'settings-2'};
const layerIcons={rect:'square',text:'type',circle:'circle',ellipse:'orbit',image:'image',line:'minus',hline:'minus',vline:'minus',dot:'dot',hatch:'grid-3x3',polygon:'pentagon',polyline:'chart-line',path:'pen-tool',group:'group',repeat:'repeat-2'};
const specialHeadings={'Typography':'type','Image':'image','Repeat pattern':'repeat-2','Group':'group','Vector geometry':'pen-tool','Line geometry':'minus','Shape settings':'square'};
const titleIcons={'STRUCTURE':'list-tree','PROPERTIES':'sliders-horizontal','PREVIEW':'scan','QUICK ACTIONS':'search','NEW ELEMENT':'plus'};
function add(target,name,{replace=false}={}){
 if(!target||target.dataset.uiIcon===name)return;
 if(target.querySelector(':scope > .ui-icon'))target.querySelector(':scope > .ui-icon').remove();
 if(replace){
  // Keep semantic keyboard shortcut nodes from the existing toolbar;
  // replace only the legacy pictogram, not the shortcut/accessibility markup.
  const shortcuts=target.matches?.('.canvas-tool')?[...target.querySelectorAll(':scope > kbd')]:[];
  target.replaceChildren(...shortcuts);
 }
 target.prepend(icon(name));target.dataset.uiIcon=name;
}
function decorate(root){
 const scope=root?.querySelectorAll?root:document;
 for(const [selector,name] of entries){
  try{if(scope.matches?.(selector))add(scope,name,{replace:selector.includes('[data-tool=')||selector.includes('empty-icon')||selector==='#addElement'||selector==='#expandTree'});
   for(const node of scope.querySelectorAll(selector))add(node,name,{replace:selector.includes('[data-tool=')||selector.includes('empty-icon')||selector==='#addElement'||selector==='#expandTree'});
  }catch{/* Broken selectors must never affect document editing. */}
 }
 for(const node of [...(scope.matches?.('.tree-item')?[...scope.querySelectorAll('.tree-symbol')]:[]),...scope.querySelectorAll('.tree-item .tree-symbol')]){
  const row=node.closest('.tree-item');const name=row?.classList.contains('tree-page')?'file-text':
   layerIcons[row?.dataset?.layerType]||layerIcons[row?.querySelector('.tree-label')?.textContent?.trim().toLowerCase().split(' ')[0]]||'layers';
  add(node,name,{replace:true});
 }
 for(const node of scope.querySelectorAll('.context-submenu [data-add]')){
  const glyph=node.querySelector('.context-icon');if(glyph)add(glyph,layerIcons[node.dataset.add]||'shapes',{replace:true});
 }
 for(const node of [...(scope.matches?.('.property-block-title')?[scope]:[]),...scope.querySelectorAll('.property-block-title')]){
  const block=node.closest('.property-block');const name=block?.dataset.block==='specific'?(specialHeadings[node.textContent.trim()]||'sliders-horizontal'):(headingIcons[block?.dataset.block]||'settings-2');
  add(node,name);
 }
 for(const node of scope.querySelectorAll('.dock-heading>span,.pane-title>span:first-child,.inspector-heading>span:first-child,.context-heading')){
  const name=titleIcons[node.textContent.trim().toUpperCase()];if(name)add(node,name);
 }
 for(const node of scope.querySelectorAll('[data-image-position]')){
  // Image focus grid is geometric: directional arrows are more precise here
  // than swapping all positions for nearly identical pictograms.
  node.classList.add('ui-icon-context');
 }
}
export function initIcons(){
 decorate(document);
 const observer=new MutationObserver(changes=>{
  // Coalesce changes from framework-free DOM rebuilds. SVG injection itself
  // does not trigger further decoration because of data-ui-icon guards.
  for(const change of changes){
   if(change.target?.matches?.('.property-block-title'))decorate(change.target);
   for(const n of change.addedNodes)if(n.nodeType===1){
    if(n.classList?.contains('ui-icon'))continue;
    decorate(n);
   }
  }
 });
 observer.observe(document.body,{childList:true,subtree:true});
 return ()=>observer.disconnect();
}
