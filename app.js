import { createAlignmentTools } from "./src/features/alignment.js";
import { validateTemplate } from "./src/core/validate-template.js";
import { readTemplate,writeTemplate,imageFileType,validateImageAssets,PACKAGE_LIMITS } from "./src/core/xtemplate-package.js";
import { xnotesCompatibilityWarnings } from "./src/core/xnotes-compatibility.js";
import { createDefaultNode } from "./src/core/template-schema.js";
import { createBlankTemplate } from "./src/core/blank-template.js";
import { evalExpr, mm } from "./src/core/expressions.js";
import { createHistory } from "./src/core/history.js";
import { anchoredPan, nextZoomLevel } from "./src/features/zoom.js";
import { calculateSnap, calculateObjectSnap, calculateResizeSnap } from "./src/features/snapping.js";
import { rotationFromPointer, normalizeDialAngle } from "./src/features/rotation-wheel.js";
import { variableChoices, completeExpression } from "./src/features/variable-completion.js";
import { valueHint, variableTypeHint } from "./src/features/value-hints.js";
import { LAYER_COLORS, readLayerColors, validLayerColor } from "./src/features/layer-colors.js";
import { screenToDocumentPoint } from "./src/features/pointer-geometry.js";
import { paintedBounds } from "./src/features/painted-bounds.js";
import { imageDisplayBounds, imageResizeFit } from "./src/features/image-frame.js";
import { repeatPositions } from "./src/features/repeat-layout.js";
import { inspectorSections } from "./src/features/inspector-priority.js";
import { readPointPairs, requiresBake, replacePointCoordinate, addPoint, removePoint, reversePoints, midpoint, alignPoints, distributePoints } from "./src/features/vector/points.js";
import { editablePathNodes, replaceSvgPathPoint, appendSvgLine, toggleSvgClosed, removeSvgPathAnchor, pathHandleConnections, closedSvgAnchorAlias } from "./src/features/vector/svg-path.js";
import { PEN_MODES,createPenNode,snapPenAngle,snapPenOrthogonal,penIncoming,penOutgoing,penPathData,resetOutgoingTangent } from "./src/features/vector/pen-model.js";
import { FLIPPABLE_TYPES, flipNativeNode, flipNeedsExpressionConfirmation } from "./src/features/vector/flip-geometry.js";
import { translate as matrixTranslate, scale as matrixScale, rotate as matrixRotate, around as matrixAround, multiply as matrixMultiply, toSVG as matrixSVG } from "./src/features/affine-transform.js";
import { resizePreviewTransform, rotationPreviewTransform, resizedBounds } from "./src/features/resize-preview.js";
import { resizeGestureBounds } from "./src/features/constrained-resize.js";
import { deleteSiblingNodes, duplicateSiblingNodes, getSiblingSelection as getTreeSiblingSelection, groupSiblingNodes, normalizePaths, sameParent, moveNodes, nudgeSiblingNodes } from "./src/core/tree-operations.js";
import { arrangeBounds } from "./src/features/arrange-selection.js";
import { sharedEditableProperties, editablePropertyValue } from "./src/core/common-properties.js";
import { selectTreePaths } from "./src/core/tree-selection.js";
(() => {
"use strict";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
const SIZES={a4:[210,297],a5:[148,210],letter:[216,279]};
const clone=o=>JSON.parse(JSON.stringify(o));
const samples={
ruled:{xtemplate:1,id:"xtemplate.studio.ruled",name:"Ruled paper",description:"Horizontal lines for writing.",license:"MIT",tags:["lines","writing"],params:{spacing:{type:"length",default:"8mm",min:"4mm",max:"14mm",label:"Line spacing",role:"spacing"}},items:[{type:"group",inset:"12mm",children:[{type:"repeat",axis:"y",period:"spacing",fit:"space",children:[{type:"hline",y:"100%",stroke:"#9eb8df",strokeWidth:"0.2mm"}]}]}]},
grid:{xtemplate:1,id:"xtemplate.studio.grid",name:"Grid paper",description:"Grade regular com espaçamento configurável.",license:"MIT",tags:["grid","math"],params:{spacing:{type:"length",default:"5mm",min:"2mm",max:"15mm",label:"Grid cell size",role:"spacing"}},items:[{type:"group",inset:"10mm",children:[{type:"repeat",axis:"xy",period:"spacing",fit:"space",children:[{type:"hline",y:"100%",stroke:"#b5c5df",strokeWidth:"0.15mm"},{type:"vline",x:"100%",stroke:"#b5c5df",strokeWidth:"0.15mm"}]}]}]},
cornell:{xtemplate:1,id:"xtemplate.examples.cornell",name:"Cornell notes",description:"A cue column, a ruled note area and a summary box at the bottom.",license:"MIT",tags:["lines","study"],params:{spacing:{type:"length",default:"8mm",min:"5mm",max:"12mm",label:"Line spacing",role:"spacing"},cue:{type:"number",default:0.3,min:0.15,max:0.45,step:0.05,label:"Cue column width"},summary:{type:"length",default:"50mm",min:"25mm",max:"90mm",label:"Summary height"}},items:[{type:"group",stroke:"accent",strokeWidth:"0.35mm",children:[{type:"hline",y:"22mm"},{type:"hline",y:"100% - summary"},{type:"vline",x:"W * cue",y1:"22mm",y2:"100% - summary"}]},{type:"group",x:"W * cue",y:"22mm",w:"100% - W * cue",h:"100% - 22mm - summary",children:[{type:"repeat",axis:"y",period:"spacing",children:[{type:"hline",y:"100%"}]}]},{type:"group",y:"100% - summary",h:"summary",children:[{type:"repeat",axis:"y",period:"spacing",children:[{type:"hline",y:"100%"}]}]},{type:"group",fill:"accent",size:"3mm",children:[{type:"text",text:"Cues",x:"4mm",y:"28mm"},{type:"text",text:"Notes",x:"W * cue + 4mm",y:"28mm"},{type:"text",text:"Summary",x:"4mm",y:"100% - summary + 6mm"}]}]},
engineering:{xtemplate:1,id:"xtemplate.examples.engineering",name:"Engineering paper",description:"Fine squares grouped into heavier blocks, centred on the sheet.",license:"MIT",tags:["grid","math","engineering"],params:{minor:{type:"length",default:"2mm",min:"1mm",max:"5mm",label:"Small square",role:"spacing"},every:{type:"integer",default:5,min:2,max:10,label:"Squares per block"}},items:[{type:"group",inset:"10mm",children:[{type:"repeat",axis:"xy",period:"minor * every",fit:"center",children:[{type:"group",opacity:0.45,strokeWidth:"0.15mm",children:[{type:"repeat",axis:"y",count:"every",children:[{type:"hline"}]},{type:"repeat",axis:"x",count:"every",children:[{type:"vline"}]}]},{type:"rect",strokeWidth:"0.3mm"}]}]}]},
todo:{xtemplate:1,id:"xtemplate.examples.todo",name:"Checklist",description:"Rows with a tick box each, stretched slightly so the rows fill the page exactly.",license:"MIT",tags:["planner","lists"],params:{row:{type:"length",default:"9mm",min:"6mm",max:"14mm",label:"Row height",role:"spacing"}},items:[{type:"text",text:"To do",x:"15mm",y:"18mm",size:"5mm",weight:"bold"},{type:"group",inset:["25mm","15mm","15mm","15mm"],children:[{type:"repeat",axis:"y",period:"row",fit:"round",children:[{type:"rect",y:"50% - 2.25mm",w:"4.5mm",h:"4.5mm",rx:"0.8mm"},{type:"hline",y:"100%",x1:"8mm"}]}]}]}
};
let doc=createBlankTemplate(),selectedPath=null,selectedPaths=[],dirty=false,drag=null,marqueeState=null,split=false,activeInspector="properties",suppressJson=false,toastTimer,clipboardNodes=[];
let documentAssets=new Map();
let documentImageSizes=new Map();
const assetObjectUrls=new Map();
function releaseAssetUrls(){for(const url of assetObjectUrls.values())URL.revokeObjectURL(url);assetObjectUrls.clear();}
function replaceDocumentAssets(next,sizes=new Map()){releaseAssetUrls();documentAssets=next;documentImageSizes=sizes;}
function imageObjectUrl(src){const data=documentAssets.get(src);if(!data)return null;
 if(!assetObjectUrls.has(src))assetObjectUrls.set(src,URL.createObjectURL(new Blob([data],{type:imageFileType(data)})));
 return assetObjectUrls.get(src);
}
async function validateImageFile(file){
 if(file.size>PACKAGE_LIMITS.maxPackage)throw Error('Image exceeds the 16 MiB package limit');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!imageFileType(bytes))throw Error('Only PNG, JPEG and WebP images are supported');
 const image=await createImageBitmap(new Blob([bytes],{type:imageFileType(bytes)}));
 const {width,height}=image;image.close();
 if(width>PACKAGE_LIMITS.maxPixels||height>PACKAGE_LIMITS.maxPixels)throw Error('Image dimensions exceed 8192px');
 return {bytes,width,height};
}
function availableImageName(filename){
 const ext=filename.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase()||'png';
 const safe=(filename.replace(/\.[^.]*$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'')||'image').slice(0,90);
 let name=`images/${safe}.${ext}`,index=2;
 while(documentAssets.has(name))name=`images/${safe}-${index++}.${ext}`;
 return name;
}
async function addImageFromFile(file,replaceNode=null){
 const {bytes,width,height}=await validateImageFile(file);
 const name=availableImageName(file.name);
 // Adding an asset is an undoable node operation; its bytes remain attached
 // to the session so that Undo/Redo can restore image references.
 documentAssets.set(name,bytes);
 documentImageSizes.set(name,{width,height});
 if(replaceNode){replaceNode.src=name;commit(()=>{});return;}
 const {parent,parentPath}=insertionContext();const arr=parent?parent.children:(doc.items||(doc.items=[]));
 arr.push({type:'image',src:name,x:'18mm',y:'18mm',w:'174mm',h:'155mm',fit:'contain',position:'center'});
 selectedPath=parent?parentPath.concat(['children',arr.length-1]):['items',arr.length-1];selectedPaths=[selectedPath.slice()];
 commit(()=>{});setInspectorTab('properties');
}

let smartGuides={x:null,y:null},smartGuideSegments={x:null,y:null};
// A repeated template node is one model object but has several visible SVG
// instances. Only the focused copy gets handles, avoiding hundreds of knobs.
let focusedRepeatInstance=null;
let vectorEditPath=null,vectorSelection=new Set(),vectorDrag=null;
let hatchEditPath=null,hatchDrag=null;
let pathEditPath=null,pathDrag=null,pathPointSelection=-1;
function resetVectorEditors(){vectorEditPath=null;vectorSelection.clear();vectorDrag=null;hatchEditPath=null;hatchDrag=null;pathEditPath=null;pathDrag=null;pathPointSelection=-1;}
const renderInstanceCounts=new Map();
const repeatFrameBounds=new Map();
function unionRepeatBounds(a,b){if(!a)return{...b};return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.max(a.x+a.w,b.x+b.w)-Math.min(a.x,b.x),h:Math.max(a.y+a.h,b.y+b.h)-Math.min(a.y,b.y)};}


let pasteboardVisible=true;
let magneticGuidesEnabled=true;
try{magneticGuidesEnabled=localStorage.getItem('xtemplate-magnetic-guides')!=='false';}catch{}

const history=createHistory(JSON.stringify(doc));let historyRestoring=false;
let pageSize=[210,297],zoomMode="fit",previewValues={},lastValidJson="",expanded=true,clipSerial=0;
const collapsedTree=new Set();
let treeDragSource=null,treeDragSelection=null,treeSelectionAnchor=null;
let layerColors={};
function layerColorStorageKey(){return 'xtemplate-layer-colors:'+String(doc.id||doc.name||'untitled').slice(0,120);}
function loadLayerColors(){
 try{layerColors=readLayerColors(JSON.parse(localStorage.getItem(layerColorStorageKey())||'{}'));}
 catch{layerColors={};}
}
function saveLayerColors(){try{localStorage.setItem(layerColorStorageKey(),JSON.stringify(layerColors));}catch{}}
function setLayerColors(paths,color){
 const valid=validLayerColor(color);
 for(const path of paths){
  if(!Array.isArray(path)||path[0]!=="items"||!getAt(path))continue;
  const key=nodeKey(path);
  if(valid)layerColors[key]=valid;else delete layerColors[key];
 }
 saveLayerColors();renderTree();
}
function layerColorTargets(path){
 // An unselected layer receives its own tag; clicking a selected layer's
 // marker edits the entire visible multi-selection, including descendants.
 const selected=selectedPaths.filter(p=>p?.[0]==="items"&&getAt(p));
 return selected.some(p=>nodeKey(p)===nodeKey(path))?selected.map(p=>p.slice()):[path.slice()];
}
function setLayerColor(path,color){setLayerColors([path],color);}
function resetLayerColors(){layerColors={};}
function snapshotLayerMarkers(){
 const entries=[];
 function visit(nodes,prefix){
  (nodes||[]).forEach((node,index)=>{
   const path=prefix.concat(index),color=layerColors[nodeKey(path)];
   if(color)entries.push([node,color]);
   if(['group','repeat'].includes(node.type))visit(node.children,path.concat('children'));
  });
 }
 visit(doc.items,['items']);return entries;
}
function restoreLayerMarkers(entries){
 layerColors={};
 for(const [node,color] of entries){
  const path=findNodePath(node);
  if(path)layerColors[nodeKey(path)]=color;
 }
 saveLayerColors();
}

const paper=$("paper"),wrap=$("paperWrap"),jsonEditor=$("jsonEditor");
function toast(msg){const e=$("toast");e.textContent=msg;e.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),2300);$("statusMessage").textContent=msg;}
function setDirty(v=true){dirty=v;$("dirtyMark").classList.toggle("hidden",!v);$("dirtyMark").title=v?"Unsaved changes":"Saved";}
$("docName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}if(e.key==="Escape"){e.currentTarget.textContent=doc.name||"Untitled";e.currentTarget.blur();}});
$("docName").addEventListener("blur",e=>{const name=e.currentTarget.textContent.trim()||"Untitled";e.currentTarget.textContent=name;if(name!==doc.name)commit(()=>{doc.name=name;});});
$("docName").addEventListener("focus",e=>{const r=document.createRange();r.selectNodeContents(e.currentTarget);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);});

function setStatus(msg){$("statusMessage").textContent=msg;}
function fmt(){return JSON.stringify(doc,null,2);}
function syncJson(){suppressJson=true;jsonEditor.value=fmt();lastValidJson=jsonEditor.value;updateLineNumbers();suppressJson=false;setValidation("ok","JSON válido");}
function setValidation(type,msg){const e=$("validationStatus");e.textContent=(type==="ok"?"● ":type==="error"?"● ":"⚠ ")+msg;e.className="validation "+type;}
function updateLineNumbers(){const n=(jsonEditor.value.match(/\n/g)||[]).length+1;$("lineNumbers").textContent=Array.from({length:n},(_,i)=>i+1).join("\n");}
function ctxVars(c){return{...previewValues,...(c.vars||{}),W:c.w,H:c.h,i:c.i??c.vars?.i??0,j:c.j??c.vars?.j??0};}
function resolveColor(v){if(v==null)return null;if(v==="ink")return $("inkColor").value;if(v==="accent")return $("accentColor").value;if(v==="none")return"none";if(Object.prototype.hasOwnProperty.call(previewValues,"$"+v))return previewValues["$"+v];return v;}
const COLOR_SWATCHES=[]; // Kept empty: no palette suggestions; users may type a value or use preview pickers.
function emitColorChange(input){input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));}
function renderColorChoices(inputId,mode="style"){
 const input=$(inputId),host=$(inputId+"Choices");if(!input||!host)return;host.replaceChildren();
 if(mode!=="style")return;
 const select=document.createElement("select");select.setAttribute("aria-label","Color token or color variable");select.title="Choose a special token or a color variable";
 const choices=[["","Suggestions…"],["ink","Ink (ink)"],["accent","Accent (accent)"],["none",inputId==="elementFill"?"No fill (none)":"No stroke (none)"]];
 for(const [name,p] of Object.entries(doc.params||{}))if(p.type==="color")choices.push([name,(p.label||name)+" · "+name]);
 choices.forEach(([value,label])=>{const o=document.createElement("option");o.value=value;o.textContent=label;select.appendChild(o);});
 select.addEventListener("change",()=>{if(!select.value)return;input.value=select.value;emitColorChange(input);select.value="";});
 host.appendChild(select);
}
function renderAllColorChoices(){[["elementStroke","style"],["elementFill","style"]].forEach(([id,mode])=>renderColorChoices(id,mode));}
const variablePopup=$("variableCompletion");
let completionInput=null,completionChoices=[],completionIndex=0;
function completionKind(input){
 if(!(input instanceof HTMLInputElement)||input.type!=="text"||input.disabled||input.readOnly)return null;
 const prop=input.dataset.property;
 if(["elementStroke","elementFill"].includes(input.id)||["stroke","fill"].includes(prop))return "color";
 if(input.closest('#elementInspector')||input.closest('#multiPropertyInspector')){
  if(input.id==="elementText"||input.id==="elementType"||prop==="text")return null;
  if(input.id==="elementStrokeWidth"||input.id==="elementX"||input.id==="elementY"||input.id==="elementW"||input.id==="elementH")return "numeric";
  if(input.closest('#advancedInspector')||prop && !["type","name","font","weight","italic","align","baseline","axis","fit","text","d","points","viewBox"].includes(prop))return "numeric";
 }
 return null;
}
function hideVariableCompletion(){
 variablePopup.classList.add("hidden");variablePopup.replaceChildren();
 if(completionInput){completionInput.removeAttribute("aria-activedescendant");completionInput.setAttribute("aria-expanded","false");}
 completionInput=null;completionChoices=[];
}
function updateCompletionHighlight(){
 [...variablePopup.querySelectorAll('.variable-completion-item')].forEach((item,i)=>{
  const active=i===completionIndex;item.classList.toggle("active",active);
  item.setAttribute("aria-selected",String(active));
 });
 if(completionInput&&completionChoices.length){
  completionInput.setAttribute("aria-activedescendant","variable-choice-"+completionIndex);
  variablePopup.querySelectorAll('.variable-completion-item')[completionIndex]?.scrollIntoView({block:"nearest"});
 }
}
function chooseVariable(index){
 const input=completionInput,choice=completionChoices[index];if(!input||!choice)return;
 const kind=completionKind(input),result=kind==="color"?{value:choice.name,caret:choice.name.length}:completeExpression(input.value,input.selectionStart??input.value.length,choice.name);
 hideVariableCompletion();input.focus();input.value=result.value;
 input.setSelectionRange(result.caret,result.caret);
 input.dispatchEvent(new Event("input",{bubbles:true}));
 input.dispatchEvent(new Event("change",{bubbles:true}));
}
function showVariableCompletion(input,filter=false){
 const kind=completionKind(input);if(!kind){hideVariableCompletion();return;}
 const query=!filter?"":kind==="color"?input.value:input.value.slice(0,input.selectionStart??input.value.length).match(/[A-Za-z0-9_]*$/)?.[0]||"";
 // Keep suggestions discoverable on focus; filter only while typing.
 completionChoices=variableChoices(doc.params||{},kind,query);
 if(!completionChoices.length){hideVariableCompletion();return;}
 completionInput=input;completionIndex=0;
 variablePopup.replaceChildren();
 const heading=document.createElement("div");heading.className="variable-completion-heading";
 heading.textContent=kind==="color"?"COLOR TOKENS":"TEMPLATE VARIABLES";
 variablePopup.appendChild(heading);
 for(const [i,choice] of completionChoices.entries()){
  const button=document.createElement("button");button.type="button";button.className="variable-completion-item";
  button.id="variable-choice-"+i;button.setAttribute("role","option");
  const marker=document.createElement("span");marker.className="variable-completion-marker";
  marker.textContent=choice.type==="color"?"◉":choice.type==="length"?"↔":"#";
  if(choice.type==="color"&&/^#[0-9a-f]{6}$/i.test(choice.value))marker.style.setProperty("--variable-swatch",choice.value);
  const details=document.createElement("span");details.className="variable-completion-details";
  const name=document.createElement("strong");name.textContent=choice.name;
  const description=document.createElement("small");description.textContent=choice.label+(choice.builtin?" · built-in":" · "+choice.type);
  details.append(name,description);
  const value=document.createElement("code");value.textContent=choice.value;
  button.append(marker,details,value);
  button.addEventListener("pointerdown",e=>e.preventDefault());
  button.addEventListener("click",()=>chooseVariable(i));
  variablePopup.appendChild(button);
 }
 const rect=input.getBoundingClientRect(),viewportW=document.documentElement.clientWidth;
 const popupWidth=Math.min(278,Math.max(190,rect.width+14),viewportW-20);
 variablePopup.style.width=popupWidth+"px";
 variablePopup.style.left=Math.max(8,Math.min(rect.left,viewportW-popupWidth-8))+"px";
 variablePopup.style.top=Math.min(rect.bottom+5,window.innerHeight-30)+"px";
 variablePopup.classList.remove("hidden");
 const popupHeight=variablePopup.getBoundingClientRect().height;
 if(rect.bottom+popupHeight+10>window.innerHeight&&rect.top>popupHeight+8)variablePopup.style.top=Math.max(8,rect.top-popupHeight-5)+"px";
 input.setAttribute("role","combobox");input.setAttribute("aria-autocomplete","list");
 input.setAttribute("aria-controls","variableCompletion");input.setAttribute("aria-expanded","true");
 updateCompletionHighlight();
}
document.addEventListener("focusin",event=>{
 const input=event.target,kind=completionKind(input);
 if(kind)showVariableCompletion(input);
 else hideVariableCompletion();
});
document.addEventListener("input",event=>{
 if(event.target===completionInput)showVariableCompletion(event.target,true);
});
document.addEventListener("click",event=>{
 // Clicking an already focused input does not emit focusin. Reopen if another
 // action (for example an inspector render) dismissed the suggestions.
 const input=event.target;
 if(completionKind(input)&&completionInput!==input)showVariableCompletion(input);
});
document.addEventListener("keydown",event=>{
 if(event.target!==completionInput||variablePopup.classList.contains("hidden"))return;
 if(event.key==="ArrowDown"||event.key==="ArrowUp"){
  event.preventDefault();completionIndex=(completionIndex+(event.key==="ArrowDown"?1:-1)+completionChoices.length)%completionChoices.length;updateCompletionHighlight();
 }else if(event.key==="Enter"||event.key==="Tab"){
  if(event.key==="Enter")event.preventDefault();
  chooseVariable(completionIndex);
 }else if(event.key==="Escape"){event.stopPropagation();event.preventDefault();hideVariableCompletion();}
},true);
document.addEventListener("pointerdown",event=>{
 if(completionInput&&!variablePopup.contains(event.target)&&event.target!==completionInput)hideVariableCompletion();
},true);
window.addEventListener("resize",hideVariableCompletion);
document.addEventListener("scroll",event=>{
 if(completionInput&&!variablePopup.contains(event.target)&&event.target!==completionInput.closest('#propertiesPanel')){
  // Schedule closing only after the focus-induced scroll has settled.
  requestAnimationFrame(()=>{
   if(completionInput&&document.activeElement!==completionInput)hideVariableCompletion();
  });
 }
},true);
function refreshVariableSuggestions(){
 // The popup renders current params on focus/input, including after edits.
 if(completionInput&&document.activeElement===completionInput)showVariableCompletion(completionInput);
}
function mergedStyle(n,p={}){const out={...p};// Android inherits rotation as a text style (quarter-turns only).
for(const k of ["stroke","strokeWidth","dash","fill","opacity","font","size","weight","italic","align","baseline","rotate"])if(n[k]!==undefined)out[k]=n[k];return out;}
function svgStyle(s){const o={};if(s.stroke!==undefined)o.stroke=resolveColor(s.stroke);if(s.strokeWidth!==undefined)o["stroke-width"]=evalExpr(s.strokeWidth,{w:1,h:1,vars:previewValues},"short",.25);if(s.fill!==undefined)o.fill=resolveColor(s.fill);if(s.opacity!==undefined)o.opacity=Math.max(0,Math.min(1,Number(s.opacity)));if(Array.isArray(s.dash)&&s.dash.length===2)o["stroke-dasharray"]=s.dash.map(v=>evalExpr(v,{w:1,h:1,vars:previewValues},"short",0)).join(" ");if(s.dash==="none")o["stroke-dasharray"]="none";if(s.size!==undefined)o["font-size"]=evalExpr(s.size,{w:1,h:1,vars:previewValues},"short",3.5);if(s.font)o["font-family"]=s.font==="mono"?"monospace":s.font==="serif"?"serif":"sans-serif";if(s.weight)o["font-weight"]=s.weight==="bold"?"700":s.weight;if(s.italic!==undefined)o["font-style"]=s.italic?"italic":"normal";if(s.align)o["text-anchor"]=s.align==="middle"?"middle":s.align==="end"?"end":"start";if(s.baseline)o["dominant-baseline"]=s.baseline==="middle"?"middle":s.baseline==="top"?"hanging":"alphabetic";return o;}
function svg(tag,attrs={},txt){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))if(v!==undefined&&v!==null)e.setAttribute(k,String(v));if(txt!==undefined)e.textContent=txt;return e;}
function applyClip(element,b){const id="xstudio-clip-"+(++clipSerial);let defs=paper.querySelector("defs");if(!defs){defs=svg("defs");paper.insertBefore(defs,paper.firstChild);}const cp=svg("clipPath",{id,clipPathUnits:"userSpaceOnUse"});cp.appendChild(svg("rect",{x:b.x,y:b.y,width:Math.max(0,b.w),height:Math.max(0,b.h)}));defs.appendChild(cp);element.setAttribute("clip-path","url(#"+id+")");return element;}
function nodeKey(path){return path.join(".");}
function getAt(path){if(path?.length===1&&path[0]==="__page__")return{type:"page"};return path?.reduce((o,k)=>o?.[k],doc);}
function toPath(s){return s.split(".").map((v,i)=>i%2===1&&/^\d+$/.test(v)?Number(v):v);}
function exprContext(box){return{...box,vars:{...previewValues,W:box.w,H:box.h,i:box.i||0,j:box.j||0}};}
function evalN(v,box,axis="x",fallback=0){return evalExpr(v,{...box,vars:ctxVars(box)},axis,fallback);}
function childrenRender(n,path,box,style){const g=svg("g");(n.children||[]).forEach((c,i)=>{const e=renderNode(c,path.concat(["children",i]),box,style);if(e)g.appendChild(e);});return g;}

function renderNode(n,path,box,parentStyle={stroke:"ink",strokeWidth:0.25,fill:null,opacity:1,font:"sans",size:3.5,weight:"normal",italic:false,align:"start",baseline:"alphabetic"}){if(!n||typeof n!=="object")return null;const type=n.type,st=mergedStyle(n,parentStyle),attrs=svgStyle(st),key=nodeKey(path),isSelected=selectedPaths.some(p=>nodeKey(p)===key),instance=renderInstanceCounts.get(key)||0;
renderInstanceCounts.set(key,instance+1);
const repeatChild=isRepeatedPath(path),showHandles=isSelected&&(!repeatChild||instance===(focusedRepeatInstance?.key===key?focusedRepeatInstance.instance:0));
const g=svg("g",{"data-path":key,"data-instance":instance,class:"svg-node",tabindex:0,role:"button","aria-label":type||"element"});const x=evalN(n.x??0,box,"x"),y=evalN(n.y??0,box,"y"),w=evalN(n.w??"100%",box,"x",box.w),h=evalN(n.h??"100%",box,"y",box.h);
// An SVG subtree is detached while renderNode runs; getBBox() on the repeat
// container reports an empty rectangle in Chromium. Accumulate the actual
// rendered leaf positions in page units instead, across every repeat cell.
if(!['group','repeat'].includes(type)){
 const shape=selectionBounds(n,box);
 if(shape&&[shape.x,shape.y,shape.w,shape.h].every(Number.isFinite)){
  for(let depth=2;depth<path.length;depth+=2){
   const ancestor=path.slice(0,depth);
   if(getAt(ancestor)?.type==='repeat'){
    const ancestorKey=nodeKey(ancestor);
    repeatFrameBounds.set(ancestorKey,unionRepeatBounds(repeatFrameBounds.get(ancestorKey),shape));
   }
  }
 }
}

switch(type){
case"group":{let [top,right,bottom,left]=[0,0,0,0];if(n.inset!==undefined){let a=Array.isArray(n.inset)?n.inset:[n.inset];if(a.length===1)a=[a[0],a[0],a[0],a[0]];else if(a.length===2)a=[a[0],a[1],a[0],a[1]];else if(a.length===3)a=[a[0],a[1],a[2],a[1]];[top,right,bottom,left]=[evalN(a[0],box,"y"),evalN(a[1],box,"x"),evalN(a[2],box,"y"),evalN(a[3],box,"x")];}const b={x:box.x+x+left,y:box.y+y+top,w:Math.max(0,w-left-right),h:Math.max(0,h-top-bottom),vars:box.vars||previewValues};const child=childrenRender(n,path,b,st);if(n.clip)applyClip(child,b);g.appendChild(child);break;}
case"repeat":{
 const axis=n.axis||"y",xy=axis==="xy",onX=axis==="x"||xy,onY=axis==="y"||xy;
 if(axis==="none"){const count=Math.min(1000,Math.max(0,Math.floor(evalN(n.count??n.countX??0,box,"plain"))));for(let i=0;i<count;i++){const c={...box,i,vars:{...(box.vars||previewValues),i}};g.appendChild(childrenRender(n,path,c,st));}applyClip(g,box);break;}
 const period=n.period,counts=n.count,fit=n.fit||"repeat",fx=Array.isArray(fit)?fit[0]:fit,fy=Array.isArray(fit)?fit[1]:fit;
 const px=onX?evalN(Array.isArray(period)?period[0]:period,box,"x",null):null;
 const py=onY?evalN(xy&&Array.isArray(period)?period[1]:period,box,"y",null):null;
 const cx=onX?evalN(Array.isArray(counts)?counts[0]:counts,box,"plain",null):null;
 const cy=onY?evalN(xy&&Array.isArray(counts)?counts[1]:counts,box,"plain",null):null;
 const extX=!!n.extend&&onX&&px!=null&&fx==="repeat",extY=!!n.extend&&onY&&py!=null&&fy==="repeat";
 const stagger=xy?evalN(n.stagger??0,box,"x"):0;
 const pageLeft=0,pageTop=0,pageRight=pageSize[0],pageBottom=pageSize[1];
 const xs=onX?repeatPositions(box.x,box.w,px,cx,fx,500,extX?{lo:pageLeft,hi:pageRight}:null,0):[{index:0,pos:box.x,size:box.w}];
 const rows=onY?repeatPositions(box.y,box.h,py,cy,fy,700,extY?{lo:pageTop,hi:pageBottom}:null,0):[{index:0,pos:box.y,size:box.h}];
 const totalX=extX||(!onX&&extY),totalY=extY||(!onY&&extX);
 const spanX=totalX?pageLeft:box.x,spanW=totalX?pageRight-pageLeft:box.w;
 const spanY=totalY?pageTop:box.y,spanH=totalY?pageBottom-pageTop:box.h;
 let rendered=0;
 for(const ry of rows){const shift=(xy&&Math.floor(ry.index)%2!==0)?stagger:0;
  const rowXs=onX&&shift!==0?repeatPositions(box.x,box.w,px,cx,fx,500,extX?{lo:pageLeft,hi:pageRight}:null,shift):xs;
  for(const rx of rowXs){if(rendered++>=2200)break;
   const ix=axis==="y"?ry.index:rx.index,iy=xy?ry.index:0,vars={...(box.vars||previewValues),i:ix,j:iy};
   if(typeof n.index==="string")vars[n.index]=ix;
   else if(Array.isArray(n.index)){if(n.index[0])vars[n.index[0]]=ix;if(n.index[1])vars[n.index[1]]=iy;}
   const cell={x:onX?rx.pos:spanX,y:onY?ry.pos:spanY,w:onX?rx.size:spanW,h:onY?ry.size:spanH,i:ix,j:iy,vars};
   g.appendChild(childrenRender(n,path,cell,st));
  }
  if(rendered>=2200)break;
 }
 applyClip(g,{x:spanX,y:spanY,w:spanW,h:spanH});
 break;
}
case"image":{
 const href=imageObjectUrl(n.src);
 if(href){const fit=['cover','contain','stretch'].includes(n.fit)?n.fit:'contain';
  const align={'center':'xMidYMid','top':'xMidYMin','bottom':'xMidYMax','left':'xMinYMid','right':'xMaxYMid','top left':'xMinYMin','top right':'xMaxYMin','bottom left':'xMinYMax','bottom right':'xMaxYMax'}[n.position]||'xMidYMid';
  const img=svg('image',{x:box.x+x,y:box.y+y,width:w,height:h,href,
   preserveAspectRatio:fit==='stretch'?'none':align+' '+(fit==='cover'?'slice':'meet'),
   opacity:Math.max(0,Math.min(1,evalN(st.opacity??1,box,'plain',1)))});
  g.appendChild(img);
 }else{g.appendChild(svg('rect',{x:box.x+x,y:box.y+y,width:w,height:h,fill:'#d8d8d8',stroke:'#b65c5c','stroke-dasharray':'3 2'}));}
 break;
}
case"line":g.appendChild(svg("line",{...attrs,x1:box.x+evalN(n.x1??0,box,"x"),y1:box.y+evalN(n.y1??0,box,"y"),x2:box.x+evalN(n.x2??0,box,"x"),y2:box.y+evalN(n.y2??0,box,"y")}));break;
case"hline":{const yy=box.y+evalN(n.y??0,box,"y");g.appendChild(svg("line",{...attrs,x1:box.x+evalN(n.x1??0,box,"x"),y1:yy,x2:box.x+evalN(n.x2??"100%",box,"x"),y2:yy}));break;}
case"vline":{const xx=box.x+evalN(n.x??0,box,"x");g.appendChild(svg("line",{...attrs,x1:xx,y1:box.y+evalN(n.y1??0,box,"y"),x2:xx,y2:box.y+evalN(n.y2??"100%",box,"y")}));break;}
case"rect":g.appendChild(svg("rect",{...attrs,x:box.x+x,y:box.y+y,width:w,height:h,rx:evalN(n.rx??0,box,"short")}));break;
case"circle":case"ellipse":case"dot":{const cx=box.x+evalN(n.cx??0,box,"x"),cy=box.y+evalN(n.cy??0,box,"y"),rx=evalN(n.r??n.rx??"0.35mm",box,"short"),ry=type==="ellipse"?evalN(n.ry??"2mm",box,"short"):rx;const a={...attrs,cx,cy,rx,ry};if(type==="dot"){a.fill=resolveColor(n.fill||n.stroke||"ink");a.stroke="none";}g.appendChild(svg("ellipse",a));break;}
case"polyline":case"polygon":{let pts=n.points;if(typeof pts==="string")pts=pts.trim().split(/[\s,]+/).map(Number);if(Array.isArray(pts)){const values=[];for(const p of pts){if(Array.isArray(p))values.push(...p);else values.push(p);}const points=[];for(let i=0;i+1<values.length;i+=2)points.push((box.x+evalN(values[i],box,"x"))+","+(box.y+evalN(values[i+1],box,"y")));g.appendChild(svg(type,{...attrs,points:points.join(" ")}));}break;}
case"text":{const all=Array.isArray(n.text)?n.text:String(n.text??"");let text=Array.isArray(all)?all[Math.max(0,Math.min(all.length-1,Math.floor(evalN(n.select??"i",box,"plain"))))]||"":all;text=String(text).replace(/{{/g,"\u0001").replace(/}}/g,"\u0002").replace(/\{([^{}]+)\}/g,(_,expr)=>String(evalN(expr,box,"plain",0))).replace(/\u0001/g,"{").replace(/\u0002/g,"}");const tx=box.x+x,ty=box.y+y;const textAttrs={...attrs,x:tx,y:ty,fill:resolveColor(st.fill||st.stroke||"ink"),stroke:"none"};const t=svg("text",textAttrs);if(n.rotate!==undefined||st.rotate!==undefined)t.setAttribute("transform",matrixSVG(matrixAround(matrixRotate(Math.round(evalN(st.rotate??0,box,"plain")/90)*90),tx,ty)));t.textContent=text;g.appendChild(t);break;}
case"hatch":{const period=Math.max(.5,evalN(n.period,box,"short",4)),angle=evalN(n.angle??0,box,"plain"),offset=evalN(n.offset??0,box,"short"),theta=angle*Math.PI/180,dx=Math.cos(theta),dy=-Math.sin(theta),nx=Math.sin(theta),ny=Math.cos(theta),length=(n.extend?Math.hypot(pageSize[0],pageSize[1]):Math.hypot(box.w,box.h))*2;for(let k=-500;k<=500;k++){const d=k*period+offset,cx=box.x+box.w/2+nx*d,cy=box.y+box.h/2+ny*d;g.appendChild(svg("line",{...attrs,x1:cx-dx*length,y1:cy-dy*length,x2:cx+dx*length,y2:cy+dy*length}));if(d>length)break;}applyClip(g,n.extend?{x:0,y:0,w:pageSize[0],h:pageSize[1]}:box);break;}
case"path":{if(typeof n.d==="string"){const vb=Array.isArray(n.viewBox)?n.viewBox:typeof n.viewBox==="string"?n.viewBox.split(/[\s,]+/).map(Number):null;let transform=matrixSVG(matrixTranslate(box.x,box.y));if(vb&&vb.length===4&&vb[2]>0&&vb[3]>0){let sx=w/vb[2],sy=h/vb[3],tx=box.x+x,ty=box.y+y;if(n.aspect!=="stretch"){const scale=Math.min(sx,sy);sx=sy=scale;tx+=(w-vb[2]*scale)/2;ty+=(h-vb[3]*scale)/2;}tx-=vb[0]*sx;ty-=vb[1]*sy;transform=matrixSVG(matrixMultiply(matrixTranslate(tx,ty),matrixScale(sx,sy)));}g.appendChild(svg("path",{...attrs,d:n.d,transform}));}break;}
}
// XNotes TemplateEval applies rotate only to glyph contours, quantized to 90°.
// Geometry of groups, repeats and non-text primitives must stay unrotated.
const repeatFrame=type==="repeat"?(repeatFrameBounds.get(key)||selectionBounds(n,box)):null;
const repeatedDescendantSelected=type==="repeat"&&selectedPaths.some(p=>nodeKey(p).startsWith(key+"."));
if(type==="repeat"&&(isSelected||repeatedDescendantSelected)&&repeatFrame){
 const b=repeatFrame;
 g.appendChild(svg("rect",{class:"svg-selection repeat-selection",x:b.x,y:b.y,width:Math.max(1,b.w),height:Math.max(1,b.h)}));

}
const hitTypes=["image","rect","text","path","ellipse","circle","dot","line","hline","vline","polygon","polyline"];if(hitTypes.includes(type)||(isSelected&&["group","repeat"].includes(type))){const hb=selectionBounds(n,box);g.insertBefore(svg("rect",{class:"svg-hitbox",x:hb.x,y:hb.y,width:Math.max(2,hb.w),height:Math.max(2,hb.h),fill:"transparent",stroke:"none","pointer-events":"all"}),g.firstChild);}if(isSelected&&type!=="repeat"&&(!repeatChild||showHandles)){const b=selectionBounds(n,box);g.appendChild(svg("rect",{class:"svg-selection",x:b.x,y:b.y,width:Math.max(1,b.w),height:Math.max(1,b.h)}));if(showHandles&&["image","group","rect","path","ellipse","circle","dot","line","hline","vline","polyline","polygon"].includes(type)&&(b.w>1||b.h>1)){const hs=1.7,pts=[[b.x,b.y,"nw"],[b.x+b.w/2,b.y,"n"],[b.x+b.w,b.y,"ne"],[b.x+b.w,b.y+b.h/2,"e"],[b.x+b.w,b.y+b.h,"se"],[b.x+b.w/2,b.y+b.h,"s"],[b.x,b.y+b.h,"sw"],[b.x,b.y+b.h/2,"w"]],visiblePts=type==="hline"?pts.filter(p=>["e","w"].includes(p[2])):type==="vline"?pts.filter(p=>["n","s"].includes(p[2])):pts;for(const [hx,hy,id] of visiblePts)g.appendChild(svg("rect",{class:"transform-handle handle-"+id,"data-handle":id,x:hx-hs/2,y:hy-hs/2,width:hs,height:hs,rx:.25}));if(!repeatChild&&type==="text"){g.appendChild(svg("line",{class:"rotation-stem",x1:b.x+b.w/2,y1:b.y,x2:b.x+b.w/2,y2:b.y-5}));g.appendChild(svg("circle",{class:"transform-handle rotate-handle","data-handle":"rotate",cx:b.x+b.w/2,cy:b.y-5,r:1.5}));}}else if(type==="text"&&showHandles&&!repeatChild){
 g.appendChild(svg("line",{class:"rotation-stem",x1:b.x+b.w/2,y1:b.y,x2:b.x+b.w/2,y2:b.y-5}));
 g.appendChild(svg("circle",{class:"transform-handle rotate-handle","data-handle":"rotate",cx:b.x+b.w/2,cy:b.y-5,r:1.5}));
 }}
return g;}
function selectionBounds(n,b){const t=n.type,x=b.x+evalN(n.x??0,b,"x"),y=b.y+evalN(n.y??0,b,"y"),w=evalN(n.w??"100%",b,"x",b.w),h=evalN(n.h??"100%",b,"y",b.h);if(t==='image')return imageDisplayBounds({x,y,w,h},documentImageSizes.get(n.src),n.fit,n.position);if(t==="hline"){const x1=evalN(n.x1??0,b,"x"),x2=evalN(n.x2??"100%",b,"x");return{x:b.x+Math.min(x1,x2),y:b.y+evalN(n.y??0,b,"y"),w:Math.abs(x2-x1),h:0.6};}if(t==="vline"){const y1=evalN(n.y1??0,b,"y"),y2=evalN(n.y2??"100%",b,"y");return{x:b.x+evalN(n.x??0,b,"x"),y:b.y+Math.min(y1,y2),w:0.6,h:Math.abs(y2-y1)};}if(t==="line"){const x1=evalN(n.x1??0,b,"x"),y1=evalN(n.y1??0,b,"y"),x2=evalN(n.x2??0,b,"x"),y2=evalN(n.y2??0,b,"y");return{x:b.x+Math.min(x1,x2),y:b.y+Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1)};}if(t==="text")return{x,y,w:Math.max(10,String(n.text||"").length*1.8),h:5};if(t==="ellipse"){const rx=evalN(n.rx??"15mm",b,"short"),ry=evalN(n.ry??"8mm",b,"short");return{x:b.x+evalN(n.cx??0,b,"x")-rx,y:b.y+evalN(n.cy??0,b,"y")-ry,w:2*rx,h:2*ry};}if(["circle","dot"].includes(t)){const r=evalN(n.r??"0.35mm",b,"short");return{x:b.x+evalN(n.cx??0,b,"x")-r,y:b.y+evalN(n.cy??0,b,"y")-r,w:2*r,h:2*r};}if(["polyline","polygon"].includes(t)){let values=n.points;if(typeof values==="string")values=values.trim().split(/[\s,]+/).map(Number);if(Array.isArray(values)){const flat=values.flat(Infinity),xs=[],ys=[];for(let i=0;i+1<flat.length;i+=2){xs.push(b.x+evalN(flat[i],b,"x"));ys.push(b.y+evalN(flat[i+1],b,"y"));}if(xs.length)return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}}return{x,y,w,h};}
function pathCurrent(){return selectedPath&&nodeKey(selectedPath)===pathEditPath&&selectedPaths.length===1&&getAt(selectedPath)?.type==='path'?getAt(selectedPath):null;}
function pathShape(){const key=pathEditPath;return [...paper.querySelectorAll('g[data-path="'+key+'"]')].map(g=>g.querySelector(':scope > path')).find(Boolean);}
/** Map the authored path's local coordinates to *page viewBox units*, not CSS pixels.
 * shape.getCTM() can include the outer SVG viewBox scale: that caused handles to
 * drift away from their curves when completing a path or changing zoom. */
function pathToPageMatrix(shape){
 const root=paper.getScreenCTM(),element=shape.getScreenCTM();
 return root&&element?root.inverse().multiply(element):null;
}
function pathDocumentPoint(shape,x,y){
 const m=pathToPageMatrix(shape);if(!m)return {x,y};const p=paper.createSVGPoint();p.x=x;p.y=y;
 const out=p.matrixTransform(m);return{x:out.x,y:out.y};
}
function pathLocalPoint(shape,point){
 const m=pathToPageMatrix(shape);if(!m)return point;const p=paper.createSVGPoint();p.x=point.x;p.y=point.y;
 const out=p.matrixTransform(m.inverse());return{x:out.x,y:out.y};
}
function renderPathOverlay(){
 paper.querySelector('#svg-path-overlay')?.remove();const node=pathCurrent();if(!node)return;
 const shape=pathShape();if(!shape)return;
 let parsed;try{parsed=editablePathNodes(node.d);}catch{return;}
 const group=svg('g',{id:'svg-path-overlay'});
 const connections=pathHandleConnections(parsed);
 const byIndex=new Map(connections.map(c=>[c.index,c]));
 const closedAlias=closedSvgAnchorAlias(parsed);
 // Connect each tangent to the anchor it actually controls, not both to the
 // segment endpoint (which made Bézier handles look disconnected after Enter).
 for(const relation of connections){
  const p=parsed.nodes[relation.index],anchor=parsed.nodes[relation.anchorIndex];
  if(!p||!anchor)continue;
  const c=pathDocumentPoint(shape,p.x,p.y),a=pathDocumentPoint(shape,anchor.x,anchor.y);
  group.appendChild(svg('line',{class:'svg-path-guide','data-path-handle-side':relation.side,
   x1:a.x,y1:a.y,x2:c.x,y2:c.y}));
 }
 for(const [i,p] of parsed.nodes.entries()){
  if(i===closedAlias?.aliasIndex)continue; // final closing C shares the M vertex
  const real=pathDocumentPoint(shape,p.x,p.y),relation=byIndex.get(i),anchor=relation?parsed.nodes[relation.anchorIndex]:null;
  const anchorPos=anchor?pathDocumentPoint(shape,anchor.x,anchor.y):null;
  // Editor-only display: collapsed tangents still exist in SVG C data, but
  // coincide with their anchor. A 3mm marker (previous behavior) fell *inside*
  // the anchor's hit target at common zoom levels and appeared to be missing.
  // Position both collapsed handles at opposite 20px screen-space offsets.
  const pageScreen=paper.getScreenCTM(),pxPerUnit=pageScreen?Math.max(.01,Math.hypot(pageScreen.a,pageScreen.b)):2;
  const visualOffset=20/pxPerUnit;
  const collapsed=!!anchorPos&&Math.hypot(real.x-anchorPos.x,real.y-anchorPos.y)<Math.max(.12,2/pxPerUnit);
  const offsetDirection=relation?.side==='incoming'?-1:1;
  const pos=collapsed?{x:anchorPos.x+visualOffset*offsetDirection,y:anchorPos.y-visualOffset*.4}:real;
  // The indicator is not a new geometry point: dragging uses the unchanged
  // authored control plus the cursor delta, preserving XNotes coordinates.
  if(collapsed&&anchorPos){group.appendChild(svg('line',{
   class:'svg-path-guide collapsed-guide','data-collapsed-guide':relation.side,
   x1:anchorPos.x,y1:anchorPos.y,x2:pos.x,y2:pos.y
  }));}
  const handle=svg('g',{'data-svg-path-point':i,class:'svg-path-node',
   ...(relation?{'data-path-tangent':relation.side}:{}),
   ...(collapsed?{'data-collapsed-tangent':'true'}:{})});
  const targetRadius=Math.max(2.7,9/pxPerUnit);
  handle.appendChild(svg('circle',{cx:pos.x,cy:pos.y,r:targetRadius,class:'svg-path-hit',fill:'transparent',stroke:'none'}));
  handle.appendChild(svg('circle',{cx:pos.x,cy:pos.y,r:Math.max(1.4,(p.role==='control'?4.5:5)/pxPerUnit),
   class:'svg-path-handle '+p.role+(relation?' '+relation.side:'')+(collapsed?' collapsed':'')+(pathPointSelection===i?' selected':'')}));
  const tooltip=svg('title',{});tooltip.textContent=`${relation?relation.side+' Bézier tangent':p.role==='anchor'?'Anchor':'Control'} ${i+1}${collapsed?' (retracted; drag to extend)':''} · Arrows: fine adjustment`;
  handle.appendChild(tooltip);group.appendChild(handle);
 }
 paper.appendChild(group);
}
function renderSvgPathControls(root,node){
 const title=document.createElement('div');title.className='advanced-heading';title.textContent='SVG PATH EDITOR';root.appendChild(title);
 let parsed,reason='';try{parsed=editablePathNodes(node.d);}catch(e){reason=e.message;}
 if(!parsed){const note=document.createElement('p');note.className='inspector-tip';note.textContent='Visual editing is read-only for this path: '+reason+'. Use the original d field above. No normalization or data loss occurs.';root.appendChild(note);return;}
 const buttons=document.createElement('div');buttons.className='vector-actions';root.appendChild(buttons);
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);buttons.appendChild(b);};
 button(pathCurrent()===node?'Done editing':'Edit SVG nodes',()=>{pathEditPath=pathCurrent()===node?null:nodeKey(selectedPath);pathPointSelection=-1;render();});
 button('Add line',()=>{const last=parsed.nodes.at(-1);commit(()=>{node.d=appendSvgLine(node.d,last.x+10,last.y+10);});});
 button('Remove selected node',()=>{
  try{const next=removeSvgPathAnchor(node.d,pathPointSelection);commit(()=>{node.d=next;});pathPointSelection=-1;render();}
  catch(e){toast(e.message);}
 });
 button(parsed.closed?'Open path':'Close path',()=>commit(()=>{node.d=toggleSvgClosed(node.d);}));
 const note=document.createElement('p');note.className='inspector-tip';note.textContent='Bézier handles: orange = incoming, blue = outgoing. At intermediate cubic anchors, both controls are independently editable. Retracted controls have separated dashed markers; the exported XNotes path remains unchanged until you drag them. Complex SVG commands remain available in the d field.';root.appendChild(note);
 if(pathCurrent()!==node)return;
 const list=document.createElement('div');list.className='vector-coordinate-list';root.appendChild(list);
 const closingAlias=closedSvgAnchorAlias(parsed);
 parsed.nodes.forEach((pt,i)=>{
  if(i===closingAlias?.aliasIndex)return;
  const row=document.createElement('div');row.className='vector-point-row'+(pathPointSelection===i?' selected':'');
  row.addEventListener('click',e=>{if(e.target.closest('input'))return;pathPointSelection=i;render();});
  const index=document.createElement('span');index.textContent=pt.role==='control'?'C'+(i+1):'#'+(i+1);row.appendChild(index);
  for(const axis of ['x','y']){
   const label=document.createElement('label');label.textContent=axis.toUpperCase();const field=document.createElement('input');field.type='number';field.step='0.1';field.value=pt[axis];
   field.addEventListener('change',()=>{const v=Number(field.value);if(!Number.isFinite(v))return;commit(()=>{node.d=replaceSvgPathPoint(node.d,pt,axis==='x'?v:pt.x,axis==='y'?v:pt.y);});});
   label.appendChild(field);row.appendChild(label);
  }
  list.appendChild(row);
 });
}
function hatchCurrent(){return selectedPath&&nodeKey(selectedPath)===hatchEditPath&&selectedPaths.length===1&&getAt(selectedPath)?.type==='hatch'?getAt(selectedPath):null;}
function hatchParameters(node,box){
 const angle=evalN(node.angle??0,box,'plain'),period=Math.max(.5,evalN(node.period??'4mm',box,'short')),
 offset=evalN(node.offset??0,box,'short');
 return {angle,period,offset,cx:box.x+box.w/2,cy:box.y+box.h/2};
}
function renderHatchOverlay(){
 paper.querySelector('#hatch-editor-overlay')?.remove();const node=hatchCurrent();if(!node)return;
 const box=parentBoxForPath(selectedPath),p=hatchParameters(node,box),a=p.angle*Math.PI/180,
 tangent={x:Math.cos(a),y:-Math.sin(a)},normal={x:Math.sin(a),y:Math.cos(a)};
 const g=svg('g',{id:'hatch-editor-overlay'});
 // Independent lanes keep handles recognizable even at small periods/offsets.
 const handles=[
  {kind:'angle',x:p.cx+27*tangent.x,y:p.cy+27*tangent.y,origin:{x:p.cx,y:p.cy},label:'ANGLE '+Number(p.angle.toFixed(1))+'°'},
  {kind:'period',x:p.cx+p.period*normal.x,y:p.cy+p.period*normal.y,origin:{x:p.cx,y:p.cy},label:'SPACING '+Number(p.period.toFixed(2))+' mm'},
  {kind:'offset',x:p.cx-20*tangent.x+p.offset*normal.x,y:p.cy-20*tangent.y+p.offset*normal.y,origin:{x:p.cx-20*tangent.x,y:p.cy-20*tangent.y},label:'OFFSET '+Number(p.offset.toFixed(2))+' mm'}
 ];
 for(const {kind,x,y,origin,label} of handles){
  g.appendChild(svg('line',{class:'hatch-helper',x1:origin.x,y1:origin.y,x2:x,y2:y}));
  const handle=svg('circle',{class:'hatch-handle','data-hatch-control':kind,cx:x,cy:y,r:2.9});
  const title=svg('title',{});title.textContent=label+' · drag to adjust';handle.appendChild(title);g.appendChild(handle);
  const text=svg('text',{class:'hatch-helper-label',x:x+3.8,y:y-3.8});text.textContent=label;g.appendChild(text);
 }
 g.appendChild(svg('circle',{cx:p.cx,cy:p.cy,r:1.1,fill:'#466fde','pointer-events':'none'}));
 paper.appendChild(g);
}
function renderHatchControls(root,node){
 const title=document.createElement('div');title.className='advanced-heading';title.textContent='HATCH · QUICK CONTROLS';root.appendChild(title);
 const controls=document.createElement('div');controls.className='vector-actions';root.appendChild(controls);
 const btn=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);controls.appendChild(b);return b;};
 btn(hatchCurrent()===node?'Hide canvas handles':'Adjust on canvas',()=>{hatchEditPath=hatchCurrent()===node?null:nodeKey(selectedPath);render();});
 const help=document.createElement('p');help.className='hatch-control-legend';help.textContent='Gold: direction · Green: spacing · Blue: offset. Drag a handle; hold Shift for 15° angle steps.';root.appendChild(help);
 const box=parentBoxForPath(selectedPath),values=hatchParameters(node,box);
 for(const [key,label,min,max,step,unit] of [['angle','Angle',-180,180,1,'°'],['period','Spacing',.5,30,.25,'mm'],['offset','Offset',-30,30,.25,'mm']]){
  const row=document.createElement('label');row.className='hatch-slider';row.textContent=label+' ';
  const slider=document.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.value=String(Math.min(max,Math.max(min,values[key])));
  const output=document.createElement('output');output.textContent=Number(values[key].toFixed(2))+unit;
  let approved=false,initial=null;
  const ensureApproval=()=>{
   if(approved)return true;
   if(requiresBake(node[key]??0)&&!confirm('This Hatch property uses an expression. Replace only this value with a fixed number?'))return false;
   initial=clone(node);approved=true;return true;
  };
  slider.addEventListener('pointerdown',event=>{if(!ensureApproval())event.preventDefault();});
  slider.addEventListener('input',()=>{
   if(!ensureApproval()){slider.value=String(values[key]);return;}
   const value=Number(slider.value);output.textContent=value+unit;
   node[key]=key==='angle'?value:value+'mm';renderCanvas();
  });
  slider.addEventListener('change',()=>{
   if(!approved)return;
   const value=Number(slider.value),base=initial?.[key];
   if(JSON.stringify(base)!==JSON.stringify(node[key]))commit(()=>{});else render();
   approved=false;initial=null;
  });
  row.append(slider,output);root.appendChild(row);
 }
 const presets=document.createElement('div');presets.className='vector-actions';root.appendChild(presets);
 for(const [name,angle] of [['Horizontal',0],['Vertical',90],['Diagonal /',45],['Diagonal \\',-45]]){
  const b=document.createElement('button');b.type='button';b.textContent=name;b.title='Angle '+angle+'°';
  b.addEventListener('click',()=>{
   if(requiresBake(node.angle??0)&&!confirm('Replace the angle expression with a fixed preset?'))return;
   commit(()=>{node.angle=angle;});
  });presets.appendChild(b);
 }
 for(const spacing of [2,4,8]){
  const b=document.createElement('button');b.type='button';b.textContent=spacing+' mm';b.title='Spacing preset';
  b.addEventListener('click',()=>{
   if(requiresBake(node.period??0)&&!confirm('Replace the spacing expression with a fixed preset?'))return;
   commit(()=>{node.period=spacing+'mm';});
  });presets.appendChild(b);
 }
 const note=document.createElement('p');note.className='inspector-tip';note.textContent='Native XNotes fields only. Advanced: extend and expressions below.';root.appendChild(note);
}
function vectorCurrent(){
 const key=selectedPath?nodeKey(selectedPath):null;
 if(!key||key!==vectorEditPath||selectedPaths.length!==1)return null;
 const n=getAt(selectedPath);
 return n&&['polyline','polygon'].includes(n.type)?n:null;
}
function vectorElements(){
 if(!selectedPath)return null;
 const key=nodeKey(selectedPath),instance=focusedRepeatInstance?.key===key?focusedRepeatInstance.instance:0;
 const elements=[...paper.querySelectorAll('g[data-path="'+key+'"]')];
 return elements.find(e=>Number(e.dataset.instance)===instance)||elements[0];
}
function renderedPolygonPoints(){
 const g=vectorElements(),shape=g?.querySelector(':scope > polygon, :scope > polyline');
 if(!shape)return null;
 return [...Array(shape.points.numberOfItems).keys()].map(i=>({x:shape.points.getItem(i).x,y:shape.points.getItem(i).y}));
}
function renderVectorOverlay(){
 paper.querySelector('#vector-overlay')?.remove();
 const node=vectorCurrent();if(!node)return;
 let pts;try{pts=renderedPolygonPoints();}catch{return;}
 if(!pts?.length)return;
 const overlay=svg('g',{id:'vector-overlay','aria-label':'Edit vector vertices'});
 for(let i=0;i<pts.length;i++){
  const p=pts[i],next=pts[(i+1)%pts.length];
  if(i<pts.length-1||node.type==='polygon')overlay.appendChild(svg('line',{class:'vector-edge','data-vector-segment':i,x1:p.x,y1:p.y,x2:next.x,y2:next.y}));
 }
 for(let i=0;i<pts.length;i++){
  const p=pts[i],group=svg('g',{'data-vector-vertex':i,class:'vector-vertex'+(vectorSelection.has(i)?' active':'')});
  group.appendChild(svg('circle',{cx:p.x,cy:p.y,r:3.7,fill:'transparent',stroke:'none'}));
  group.appendChild(svg('circle',{cx:p.x,cy:p.y,r:1.4,class:'vector-vertex-dot'}));
  overlay.appendChild(group);
 }
 paper.appendChild(overlay);
}
function isExpressionPoint(node,indices){
 const pairs=readPointPairs(node.points);
 return indices.some(i=>pairs[i]&&(requiresBake(pairs[i][0])||requiresBake(pairs[i][1])));
}
function approveVectorBake(node,indices){
 if(!isExpressionPoint(node,indices))return true;
 return confirm('As coordenadas selecionadas contêm expressões. Movê-las substituirá somente essas coordenadas por valores fixos em mm. Continuar?');
}
function writeVectorDelta(original,indices,dx,dy,box){
 let points=readPointPairs(original.points);
 for(const i of indices){
  if(i<0||i>=points.length)continue;
  const x=evalN(points[i][0],box,'x')+dx,y=evalN(points[i][1],box,'y')+dy;
  points=replacePointCoordinate(points,i,0,x);
  points=replacePointCoordinate(points,i,1,y);
 }
 return points;
}
function renderFlipControls(root,node){
 if(!FLIPPABLE_TYPES.includes(node.type))return;
 const head=document.createElement('div');head.className='advanced-heading';head.textContent='MIRROR · GEOMETRY';root.appendChild(head);
 const actions=document.createElement('div');actions.className='vector-actions vector-flip-actions';root.appendChild(actions);
 for(const [axis,label,title] of [
  ['horizontal','Flip Horizontal','Mirror left ↔ right about the shape center'],
  ['vertical','Flip Vertical','Mirror top ↕ bottom about the shape center']
 ]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.title=title;
  button.dataset.flipAxis=axis;
  button.addEventListener('click',()=>{
   try{
    const box=parentBoxForPath(selectedPath);
    const needsApproval=flipNeedsExpressionConfirmation(node,axis);
    if(needsApproval&&!confirm('This mirror operation will replace expression coordinates on the mirrored axis with evaluated millimeter values. Other coordinates and attributes will remain intact. Continue?'))return;
    const updated=flipNativeNode(node,axis,{
     context:box,
     evaluate:(value,coordinateAxis,parent)=>evalN(value,parent,coordinateAxis,NaN),
     allowExpressionBake:needsApproval
    }).node;
    commit(()=>{Object.assign(node,updated);});
    if(isRepeatedPath(selectedPath))toast('The shared node was mirrored; all repeated copies were updated.');
   }catch(error){toast(error.message);}
  });
  actions.appendChild(button);
 }
 const description=document.createElement('p');description.className='inspector-tip';
 description.textContent=node.type==='path'
  ?'Mirrors native SVG anchors and Bézier controls. Unsupported SVG commands remain unchanged.'
  :'Mirrors only geometry on the chosen axis; style and other coordinates are preserved.';
 root.appendChild(description);
}
function renderPolygonControls(root,node){
 const title=document.createElement('div');title.className='advanced-heading';title.textContent='VERTEX EDITING';root.appendChild(title);
 const actions=document.createElement('div');actions.className='vector-actions';root.appendChild(actions);
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;actions.appendChild(b);b.addEventListener('click',fn);return b;};
 const active=vectorCurrent()===node;
 button(active?'Done editing':'Edit points',()=>{
  if(active){vectorEditPath=null;vectorSelection.clear();}
  else{vectorEditPath=nodeKey(selectedPath);vectorSelection.clear();}
  render();
 });
 if(!active)return;
 const notify=document.createElement('p');notify.className='inspector-tip';notify.textContent=isRepeatedPath(selectedPath)?'Editing one point changes every repeated instance of this node.':'Drag points; Shift-click to select multiple. Double-click an edge to insert a vertex.';root.appendChild(notify);
 button('Insert after',()=>{
  const pts=readPointPairs(node.points),index=[...vectorSelection].at(-1)??pts.length-1,next=(index+1)%pts.length;
  const box=parentBoxForPath(selectedPath),a=pts[index],b=pts[next];
  const current=[evalN(a[0],box,'x'),evalN(a[1],box,'y')],following=[evalN(b[0],box,'x'),evalN(b[1],box,'y')];
  // A polyline is open: inserting after the final endpoint must extend it,
  // rather than unexpectedly creating a segment back to the first vertex.
  const candidate=node.type==='polyline'&&index===pts.length-1?[current[0]+10,current[1]]:midpoint(current,following);
  const pair=candidate.map(v=>Number(v.toFixed(3))+'mm');
  const at=index+1;commit(()=>{node.points=addPoint(node.points,at,pair);});vectorSelection=new Set([at]);render();
 });
 button('Remove selected',()=>{
  try{let pairs=readPointPairs(node.points);const indices=[...vectorSelection].sort((a,b)=>b-a);
   for(const i of indices)pairs=removePoint(pairs,i,node.type==='polygon');
   commit(()=>{node.points=pairs;});vectorSelection=new Set([Math.min(indices.at(-1)||0,pairs.length-1)]);render();
  }catch(err){toast(err.message);}
 });
 button('Reverse',()=>commit(()=>{node.points=reversePoints(node.points);}));
 for(const [label,axis] of [['Align X',0],['Align Y',1]])button(label,()=>{
  const indices=[...vectorSelection].sort((a,b)=>a-b);if(indices.length<2)return toast('Select two or more vertices with Shift.');
  if(!approveVectorBake(node,indices))return;
  const pairs=readPointPairs(node.points),box=parentBoxForPath(selectedPath),value=evalN(pairs[indices[0]][axis],box,axis?'y':'x');
  commit(()=>{node.points=alignPoints(node.points,indices,axis,value);});
 });
 for(const [label,axis] of [['Distribute X',0],['Distribute Y',1]])button(label,()=>{
  const pairs=readPointPairs(node.points),box=parentBoxForPath(selectedPath);
  if(!approveVectorBake(node,pairs.map((_,i)=>i)))return;
  commit(()=>{node.points=distributePoints(node.points,axis,(v,axisIndex)=>evalN(v,box,axisIndex?'y':'x'));});
 });
 if(node.type==='polygon'){
  for(const sides of [3,4,5,6])button(sides+' sides',()=>{
   const box=parentBoxForPath(selectedPath),pairs=readPointPairs(node.points);
   if(!approveVectorBake(node,pairs.map((_,i)=>i)))return;
   const xs=pairs.map(p=>evalN(p[0],box,'x')),ys=pairs.map(p=>evalN(p[1],box,'y'));
   const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,
    radius=Math.max(1,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))/2);
   commit(()=>{node.points=Array.from({length:sides},(_,i)=>{
    const angle=-Math.PI/2+2*Math.PI*i/sides;
    return[(cx+radius*Math.cos(angle)).toFixed(3)+'mm',(cy+radius*Math.sin(angle)).toFixed(3)+'mm'];
   });});
  });
 }

 button(node.type==='polygon'?'Open path':'Close path',()=>commit(()=>{node.type=node.type==='polygon'?'polyline':'polygon';}));
 const box=parentBoxForPath(selectedPath);let pts;
 try{pts=readPointPairs(node.points);}catch(err){toast(err.message);return;}
 const list=document.createElement('div');list.className='vector-coordinate-list';root.appendChild(list);
 pts.forEach((pair,i)=>{
  const row=document.createElement('div');row.className='vector-point-row'+(vectorSelection.has(i)?' selected':'');
  const pick=document.createElement('button');pick.type='button';pick.textContent='#'+(i+1);pick.addEventListener('click',e=>{
   if(e.shiftKey)vectorSelection.has(i)?vectorSelection.delete(i):vectorSelection.add(i);
   else vectorSelection=new Set([i]);render();
  });row.appendChild(pick);
  for(let axis=0;axis<2;axis++){
   const field=document.createElement('label');field.textContent=axis?'Y':'X';
   const input=document.createElement('input');input.type='text';input.value=String(pair[axis]);input.title='XNotes coordinate: mm, percentage or expression';
   input.addEventListener('change',()=>{
    if(!input.value.trim())return;
    commit(()=>{const updated=readPointPairs(node.points);updated[i][axis]=input.value.trim();node.points=updated;});
   });field.appendChild(input);row.appendChild(field);
  }
  list.appendChild(row);
 });
}
let currentVectorDragPreview=null;
function previewVectorPoints(dragState,dx,dy){
 const path=nodeKey(dragState.path),elements=[...paper.querySelectorAll('g[data-path="'+path+'"]')];
 for(const el of elements){const shape=el.querySelector(':scope > polygon, :scope > polyline');if(!shape)continue;
  const base=dragState.shapes.find(s=>s.element===shape)?.points;if(!base)continue;
  shape.setAttribute('points',base.map((p,i)=>dragState.indices.includes(i)?(p.x+dx)+','+(p.y+dy):p.x+','+p.y).join(' '));
 }
 const overlay=paper.querySelector('#vector-overlay');
 if(overlay){for(const handle of overlay.querySelectorAll('[data-vector-vertex]')){
  const i=Number(handle.dataset.vectorVertex),p=dragState.activePoints[i];
  if(!p)continue;for(const circle of handle.querySelectorAll('circle')){circle.setAttribute('cx',p.x+(dragState.indices.includes(i)?dx:0));circle.setAttribute('cy',p.y+(dragState.indices.includes(i)?dy:0));}
 }
 for(const edge of overlay.querySelectorAll('[data-vector-segment]')){
  const i=Number(edge.dataset.vectorSegment),j=(i+1)%dragState.activePoints.length;
  for(const [name,p,selected] of [['x1',dragState.activePoints[i],dragState.indices.includes(i)],['y1',dragState.activePoints[i],dragState.indices.includes(i)],['x2',dragState.activePoints[j],dragState.indices.includes(j)],['y2',dragState.activePoints[j],dragState.indices.includes(j)]])edge.setAttribute(name,(name.startsWith('x')?p.x:p.y)+(selected?(name.startsWith('x')?dx:dy):0));
 }
 }
}
function initializePreviewValues(){const previous=previewValues,next={};for(const [name,p] of Object.entries(doc.params||{})){const d=p.default;if(p.type==="color")next["$"+name]=previous["$"+name]||d||"#333333";else next[name]=previous[name]!==undefined?previous[name]:(typeof d==="number"?d:(mm(d,1) ?? (Number(d)||0)));}previewValues=next;}
function renderCanvas(){renderInstanceCounts.clear();repeatFrameBounds.clear();paper.replaceChildren();paper.setAttribute("viewBox","0 0 "+pageSize[0]+" "+pageSize[1]);paper.appendChild(svg("rect",{x:0,y:0,width:pageSize[0],height:pageSize[1],fill:"#fffefa"}));
// The artwork must *always* be clipped to the physical XNotes page, even in
// pasteboard edit mode. The unmasked sibling overlays remain available for
// off-page anchor manipulation and precise transforms.
const mask=svg('clipPath',{id:'xstudio-page-artwork-clip',clipPathUnits:'userSpaceOnUse'});
mask.appendChild(svg('rect',{x:0,y:0,width:pageSize[0],height:pageSize[1]}));
const definitions=svg('defs');definitions.appendChild(mask);paper.appendChild(definitions);
const artwork=svg('g',{id:'page-artwork','clip-path':'url(#xstudio-page-artwork-clip)'});
paper.appendChild(artwork);
const box={x:0,y:0,w:pageSize[0],h:pageSize[1],vars:{...previewValues,W:pageSize[0],H:pageSize[1],i:0,j:0}};(doc.items||[]).forEach((n,i)=>{const e=renderNode(n,["items",i],box);if(e)artwork.appendChild(e);});
// Overlay for editor controls lives OUTSIDE the clipped artwork. Selected
// off-page objects still expose their eight resize handles and selection box.
// Only the rendered shapes remain inside the page clip path.
const selectionOverlay=svg('g',{id:'editor-selection-overlay'});
for(const node of artwork.querySelectorAll('g[data-path]')){
 const handles=[...node.children].filter(child=>child.classList?.contains('svg-selection')||child.classList?.contains('transform-handle')||child.classList?.contains('rotation-stem'));
 if(!handles.length)continue;
 const layer=svg('g',{'data-path':node.dataset.path,'data-instance':node.dataset.instance||0,class:'selection-control-layer'});
 for(const handle of handles)layer.appendChild(handle);
 selectionOverlay.appendChild(layer);
}
paper.appendChild(selectionOverlay);
paper.appendChild(svg('rect',{id:'page-edit-boundary',x:0,y:0,width:pageSize[0],height:pageSize[1],fill:'none',stroke:'#8599bc','stroke-width':.45,'stroke-dasharray':'2 1.5','pointer-events':'none'}));
renderSmartGuideOverlay();renderVectorOverlay();renderHatchOverlay();renderPathOverlay();}
function render(){renderCanvas();
$("pageDimensions").textContent=pageSize[0]+" × "+pageSize[1]+" mm";if($("filePageSize"))$("filePageSize").value=$("paperSize").value;$("docName").textContent=doc.name||"Untitled";$("nodeStatus").textContent=countNodes(doc.items||[])+" nodes";if(document.activeElement!==$("metaKind"))$("metaKind").value=doc.kind==='cover'?'cover':'page';if(document.activeElement!==$("metaName"))$("metaName").value=doc.name||"";if(document.activeElement!==$("metaId"))$("metaId").value=doc.id||"";if(document.activeElement!==$("metaDescription"))$("metaDescription").value=doc.description||"";if(document.activeElement!==$("metaAuthor"))$("metaAuthor").value=doc.author||"";if(document.activeElement!==$("metaLicense"))$("metaLicense").value=doc.license||"";if(document.activeElement!==$("metaVersion"))$("metaVersion").value=doc.version||"";if(document.activeElement!==$("metaTags"))$("metaTags").value=(doc.tags||[]).join(", ");renderTree();renderInspector();renderParams();renderAllColorChoices();refreshVariableSuggestions();renderQuickProperties();fitPaper();}
function countNodes(items){return items.reduce((sum,n)=>sum+1+((n.type==="group"||n.type==="repeat")?countNodes(n.children||[]):0),0);}
const layerColorPicker=document.createElement("div");
layerColorPicker.className="layer-color-picker hidden";
layerColorPicker.setAttribute("role","group");layerColorPicker.setAttribute("aria-label","Layer organization color");
document.body.appendChild(layerColorPicker);
let activeColorLayer=null;
function closeLayerColorPicker(){layerColorPicker.classList.add("hidden");layerColorPicker.replaceChildren();activeColorLayer=null;}
function openLayerColorPicker(path,anchor){
 closeLayerColorPicker();
 const targets=layerColorTargets(path);
 activeColorLayer=path.slice();
 const title=document.createElement("div");title.className="layer-color-heading";
 title.textContent=targets.length>1?"COLOR · "+targets.length+" SELECTED":"LAYER COLOR";
 const palette=document.createElement("div");palette.className="layer-color-swatches";
 for(const color of LAYER_COLORS){
  const swatch=document.createElement("button");swatch.type="button";swatch.className="layer-color-swatch";
  swatch.style.setProperty("--swatch-color",color);swatch.title=color;swatch.setAttribute("aria-label","Set color "+color);
  swatch.addEventListener("click",()=>{setLayerColors(targets,color);closeLayerColorPicker();});
  palette.appendChild(swatch);
 }
 const footer=document.createElement("div");footer.className="layer-color-footer";
 const custom=document.createElement("input");custom.type="color";custom.value=layerColors[nodeKey(path)]||LAYER_COLORS[0];custom.setAttribute("aria-label","Custom layer color");
 custom.addEventListener("input",()=>{setLayerColors(targets,custom.value);closeLayerColorPicker();});
 const clear=document.createElement("button");clear.type="button";clear.textContent="Clear color";
 clear.addEventListener("click",()=>{setLayerColors(targets,null);closeLayerColorPicker();});
 footer.append(custom,clear);layerColorPicker.append(title,palette,footer);
 const rect=anchor.getBoundingClientRect();
 layerColorPicker.classList.remove("hidden");
 const width=layerColorPicker.offsetWidth,height=layerColorPicker.offsetHeight;
 layerColorPicker.style.left=Math.min(window.innerWidth-width-8,Math.max(8,rect.right+6))+"px";
 layerColorPicker.style.top=Math.min(window.innerHeight-height-8,Math.max(8,rect.top))+"px";
}
document.addEventListener("pointerdown",e=>{
 if(!layerColorPicker.classList.contains("hidden")&&!layerColorPicker.contains(e.target)&&!e.target.closest('.tree-color-control'))closeLayerColorPicker();
},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLayerColorPicker();});
function renderTree(){
 const tree=$("tree");tree.replaceChildren();
 const branchTypes=new Set(["group","repeat"]);
 const roots=doc.items||[];
 const page=document.createElement("button");
 page.type="button";page.className="tree-item tree-page"+(selectedPath?.[0]==="__page__"?" active":"");
 page.dataset.path="__page__";page.draggable=false;page.setAttribute("aria-pressed",String(selectedPath?.[0]==="__page__"));
 page.innerHTML='<span class="tree-disclosure"></span><span class="tree-symbol">▤</span><span class="tree-text"><span class="tree-label">Page</span><span class="tree-meta">ROOT · '+pageSize[0]+' × '+pageSize[1]+' mm</span></span><span class="tree-index">PAGE</span>';
 page.addEventListener("click",()=>{selectedPath=["__page__"];selectedPaths=[selectedPath.slice()];setInspectorTab("properties");render();});
 page.addEventListener("dragover",e=>{if(!treeDragSource)return;e.preventDefault();page.classList.add("tree-drop-target");});
 page.addEventListener("dragleave",()=>page.classList.remove("tree-drop-target"));
 page.addEventListener("drop",e=>{e.preventDefault();page.classList.remove("tree-drop-target");const paths=treeDragSelection||[treeDragSource];if(paths[0]?.[0]==="items")moveTreeNodes(paths,null,"root");treeDragSource=null;treeDragSelection=null;});
 tree.appendChild(page);
 if(!roots.length){const empty=document.createElement("div");empty.className="tree-empty";empty.textContent="No elements yet. Use + to create an element on the Page.";tree.appendChild(empty);}
 const typeOrdinalByNode=new Map(),typeCounts=new Map();
 function indexTypes(nodes){for(const node of nodes||[]){if(!node||typeof node!=="object")continue;const type=node.type||"other",ordinal=(typeCounts.get(type)||0)+1;typeCounts.set(type,ordinal);typeOrdinalByNode.set(node,ordinal);if(branchTypes.has(type))indexTypes(node.children||[]);}}
 indexTypes(roots);
 function add(n,path,depth){
  const key=nodeKey(path),children=branchTypes.has(n.type)?(n.children||[]):[],canExpand=children.length>0,active=selectedPaths.some(p=>nodeKey(p)===key),typeOrdinal=typeOrdinalByNode.get(n)||1;
  const b=document.createElement("button");b.type="button";b.className="tree-item tree-type-"+(n.type||"other")+(active?" active":"");b.setAttribute("aria-pressed",String(active));b.dataset.path=key;b.draggable=true;b.style.paddingLeft=(12+depth*18)+"px";
  b.addEventListener("dragstart",e=>{
   treeDragSource=path.slice();
   const selected=selectedPaths.some(item=>nodeKey(item)===key);
   treeDragSelection=normalizeSelectedPaths(selected?selectedPaths:[path]).filter(item=>item[0]==='items');
   e.dataTransfer.setData("text/plain",key);e.dataTransfer.effectAllowed="move";
   b.classList.add("tree-dragging");
   if(treeDragSelection.length>1)e.dataTransfer.setData("text/x-xtemplate-selection",String(treeDragSelection.length));
  });
  b.addEventListener("dragend",()=>{treeDragSource=null;treeDragSelection=null;b.classList.remove("tree-dragging");tree.querySelectorAll(".tree-drop-target,.drop-before,.drop-after").forEach(el=>el.classList.remove("tree-drop-target","drop-before","drop-after"));});
  b.addEventListener("dragover",e=>{const source=treeDragSource,paths=treeDragSelection||[source];
   if(!source||paths.some(item=>nodeKey(item)===key||key.startsWith(nodeKey(item)+"."))||source[0]==="__page__")return;e.preventDefault();e.dataTransfer.dropEffect="move";tree.querySelectorAll(".tree-drop-target,.drop-before,.drop-after").forEach(el=>el.classList.remove("tree-drop-target","drop-before","drop-after"));const rect=b.getBoundingClientRect(),ratio=(e.clientY-rect.top)/Math.max(1,rect.height);const place=branchTypes.has(n.type)&&ratio>=.3&&ratio<=.7?"inside":ratio<.3?"before":"after";b.classList.add(place==="inside"?"tree-drop-target":place==="before"?"drop-before":"drop-after");b.dataset.dropPlace=place;});
  b.addEventListener("dragleave",e=>{if(!b.contains(e.relatedTarget))b.classList.remove("tree-drop-target","drop-before","drop-after");});
  b.addEventListener("drop",e=>{e.preventDefault();b.classList.remove("tree-drop-target","drop-before","drop-after");const source=treeDragSource||toPath(e.dataTransfer.getData("text/plain")),target=toPath(b.dataset.path),place=b.dataset.dropPlace||"after";if(!source.length||source[0]==="__page__")return;moveTreeNodes(treeDragSelection||[source],target,place);treeDragSource=null;treeDragSelection=null;});
  const disclosure=document.createElement("span");disclosure.className="tree-disclosure";disclosure.textContent=canExpand?(collapsedTree.has(key)?"▸":"▾"):"";disclosure.title=canExpand?(collapsedTree.has(key)?"Expand":"Collapse"):"";disclosure.setAttribute("aria-hidden","true");
  const symbols={group:"▣",repeat:"⠿",hline:"━",vline:"┃",line:"／",rect:"▱",circle:"○",ellipse:"◉",dot:"•",text:"T",path:"⌁",polygon:"⬡",polyline:"⌁",hatch:"⁄"};
  const icon=document.createElement("span");icon.className="tree-symbol";icon.textContent=symbols[n.type]||"◇";
  const textWrap=document.createElement("span");textWrap.className="tree-text";
  const label=document.createElement("span");label.className="tree-label";
  const typeNames={group:"Group",repeat:"Repeat",hline:"Horizontal line",vline:"Vertical line",rect:"Rectangle",circle:"Circle",ellipse:"Ellipse",dot:"Dot",line:"Line",text:"Text",path:"SVG path",polygon:"Polygon",polyline:"Polyline",hatch:"Hatch"};
  const baseName=typeNames[n.type]||String(n.type||"Element");
  const content=n.type==="text"?String(Array.isArray(n.text)?n.text[0]:n.text||"").trim():"";
  label.textContent=n.name||(n.type==="text"&&content?baseName+" "+typeOrdinal+" · "+content:baseName+" "+typeOrdinal);
  label.title="Double-click or press F2 to rename this layer";
  function renameLayer(){
   const oldName=n.name||"",initial=label.textContent;
   const edit=document.createElement("input");edit.type="text";edit.className="tree-rename";
   edit.value=oldName||initial;edit.maxLength=80;edit.setAttribute("aria-label","Layer name");
   label.replaceWith(edit);b.draggable=false;
   let finished=false;
   const finish=save=>{
    if(finished)return;finished=true;b.draggable=true;
    const value=edit.value.trim();
    if(save&&value!==oldName){commit(()=>{if(value)n.name=value;else delete n.name;});}
    else renderTree();
   };
   edit.addEventListener("pointerdown",e=>e.stopPropagation());
   edit.addEventListener("click",e=>e.stopPropagation());
   edit.addEventListener("keydown",e=>{
    e.stopPropagation();
    if(e.key==="Enter"){e.preventDefault();finish(true);}
    if(e.key==="Escape"){e.preventDefault();finish(false);}
   });
   edit.addEventListener("blur",()=>finish(true));
   edit.focus();edit.select();
  }
  b.addEventListener("structure-rename",renameLayer);
  label.addEventListener("dblclick",e=>{e.preventDefault();e.stopPropagation();renameLayer();});
  b.addEventListener("keydown",e=>{if(e.key==="F2"){e.preventDefault();renameLayer();}});
  const meta=document.createElement("span");meta.className="tree-meta";
  const info=[];
  if(n.type==="group"||n.type==="repeat")info.push((n.children||[]).length+" child"+((n.children||[]).length===1?"":"ren"));
  if(n.type==="repeat")info.push("axis "+(n.axis||"y"),"period "+String(n.period??"auto"));
  else if(["rect","group","path","text"].includes(n.type))info.push("x "+String(n.x??"0"),"y "+String(n.y??"0"));
  else if(n.type==="line")info.push(String(n.x1??0)+","+String(n.y1??0)+" → "+String(n.x2??0)+","+String(n.y2??0));
  else if(n.type==="text")info.push(String(n.text||"").slice(0,22));
  else if(["circle","dot","ellipse"].includes(n.type))info.push("r "+String(n.r??n.rx??"default"));
  meta.textContent=info.join(" · ");
  b.title=(n.name||baseName+" "+typeOrdinal)+(info.length?" — "+info.join(" · "):"");
  textWrap.append(label,meta);
  const idx=document.createElement("span");idx.className="tree-index";idx.textContent=String(path.at(-1)+1);idx.title="Sibling position "+(path.at(-1)+1);
  const colorControl=document.createElement("span");
  colorControl.className="tree-color-control"+(layerColors[key]?" is-colored":"");
  colorControl.setAttribute("role","button");colorControl.setAttribute("tabindex","0");
  colorControl.setAttribute("aria-label","Set organization color for "+label.textContent);
  colorControl.title="Color tag (editor only)";
  colorControl.style.setProperty("--layer-mark",layerColors[key]||"var(--ui-soft,#8594a9)");
  colorControl.textContent="●";
  const showColorPicker=e=>{
   e.preventDefault();e.stopPropagation();
   openLayerColorPicker(path,colorControl);
  };
  colorControl.addEventListener("click",showColorPicker);
  colorControl.addEventListener("pointerdown",e=>e.stopPropagation());
  colorControl.addEventListener("keydown",e=>{
   e.stopPropagation();if(e.key==="Enter"||e.key===" ")showColorPicker(e);
  });
  b.append(disclosure,icon,textWrap,colorControl,idx);
  b.style.setProperty("--layer-mark",layerColors[key]||"transparent");
  b.classList.toggle("tree-is-colored",Boolean(layerColors[key]));
  b.addEventListener("click",e=>{if(canExpand&&e.target.closest(".tree-disclosure")){if(collapsedTree.has(key))collapsedTree.delete(key);else collapsedTree.add(key);renderTree();return;}selectFromTree(path,e);});
  tree.appendChild(b);
  if(canExpand&&!collapsedTree.has(key))children.forEach((c,i)=>add(c,path.concat(["children",i]),depth+1));
 }
 roots.forEach((n,i)=>add(n,["items",i],1));
 $("treeCount").textContent=(selectedPaths.length>1?selectedPaths.length+" selected · ":"")+countNodes(roots)+" elements";
 const expand=$("expandTree");expand.textContent=collapsedTree.size?"＋":"−";expand.title=collapsedTree.size?"Expand all layers":"Collapse all groups";
}
// Dropping in blank structure space sends the dragged layer to the Page root.
$("tree").addEventListener("dragover",e=>{
 if(!treeDragSource||e.target.closest(".tree-item"))return;
 e.preventDefault();e.dataTransfer.dropEffect="move";
});
$("tree").addEventListener("drop",e=>{
 if(!treeDragSource||e.target.closest(".tree-item"))return;
 e.preventDefault();moveTreeNodes(treeDragSelection||[treeDragSource],null,"root");treeDragSource=null;treeDragSelection=null;
});
function findNodePath(target){let found=null;function visit(items,parentPath){for(let i=0;i<items.length&&!found;i++){const n=items[i],path=parentPath.concat(i);if(n===target){found=path;return;}if(["group","repeat"].includes(n.type))visit(n.children||[],path.concat("children"));}}visit(doc.items||[],["items"]);return found;}
function moveTreeNodes(paths,target,place='after'){
 const valid=normalizeSelectedPaths(paths).filter(path=>path?.[0]==='items'&&getAt(path));
 if(!valid.length)return;
 const original=valid.map(path=>({node:getAt(path),bounds:transformGeometry(getAt(path),path)}));
 const colorMarkers=snapshotLayerMarkers();
 const moved=moveNodes(doc,valid,target,place);
 if(!moved){toast('Invalid target: cannot move layers into themselves or their descendants.');return;}
 // Reparenting changes the reference frame. Restore each independent node's
 // visible location after moving, without changing its hierarchy or siblings.
 for(const {node,bounds} of original){
  const nextPath=findNodePath(node);if(!nextPath||!bounds)continue;
  const current=transformGeometry(node,nextPath);if(!current)continue;
  const dx=bounds.x-current.x,dy=bounds.y-current.y;
  if(Number.isFinite(dx)&&Number.isFinite(dy)&&(Math.abs(dx)>.001||Math.abs(dy)>.001)&&draggableTypes.has(node.type))
   moveBy(node,dx,dy,parentBoxForPath(nextPath));
 }
 restoreLayerMarkers(colorMarkers);
 selectedPaths=moved.paths.map(path=>path.slice());selectedPath=selectedPaths.at(-1)||null;
 treeSelectionAnchor=selectedPaths[0]||null;
 commit(()=>{});setInspectorTab('properties');
 toast(moved.count+(moved.count===1?' layer':' layers')+' moved.');
}
function select(path){
 selectedPath=path;selectedPaths=path?[path.slice()]:[];
 if(path)for(let i=2;i<path.length;i+=2)collapsedTree.delete(nodeKey(path.slice(0,i)));
 render();setInspectorTab("properties");
}
function normalizeSelectedPaths(paths){return normalizePaths(paths);}
function selectFromTree(path,e){
 const visible=[...$("tree").querySelectorAll(".tree-item[data-path]")]
  .map(button=>toPath(button.dataset.path)).filter(p=>p[0]!=="__page__");
 const next=selectTreePaths(visible,selectedPaths,treeSelectionAnchor||selectedPath,path,{
  shift:e.shiftKey,additive:e.ctrlKey||e.metaKey
 });
 selectedPaths=next.paths;
 treeSelectionAnchor=next.anchor;
 selectedPath=selectedPaths.at(-1)||null;
 for(const p of selectedPaths)for(let i=2;i<p.length;i+=2)collapsedTree.delete(nodeKey(p.slice(0,i)));
 render();setInspectorTab("properties");
}
function getSiblingSelection(){return getTreeSiblingSelection(doc,selectedPaths);}
function groupSelection(){
 const markers=snapshotLayerMarkers();
 const result=groupSiblingNodes(doc,selectedPaths);
 if(!result){toast("Selecione ao menos dois elementos irmãos para agrupar.");return;}
 restoreLayerMarkers(markers);
 selectedPath=result.path;selectedPaths=result.paths;commit(()=>{});setInspectorTab("properties");toast("Elementos agrupados.");
}
function getValue(n,k){if(n[k]===undefined)return"";return typeof n[k]==="object"?JSON.stringify(n[k]):String(n[k]);}
// The document form has one owner at a time: Element when Page is selected,
// or the File properties dialog when requested from the application menu.
// Move the existing DOM nodes instead of cloning fields with duplicate IDs.
function placeDocumentFields(inSidebar){
 const fields=$("documentPanel");
 if(inSidebar){
  if(fields.parentElement!==$("propertiesPanel"))$("propertiesPanel").appendChild(fields);
  fields.classList.add("page-properties-fields");
 }else{
  const modalCard=$("filePropertiesModal").querySelector(".file-properties-card");
  if(fields.parentElement!==modalCard)modalCard.insertBefore(fields,modalCard.querySelector(".modal-actions"));
  fields.classList.remove("page-properties-fields");
 }
}
function showFilePropertiesDialog(){
 placeDocumentFields(false);
 $("filePropertiesModal").classList.remove("hidden");
 $("metaName").focus();
}
function renderInspector(){
 let contextual=$("contextualElementTools");
 if(!contextual){contextual=document.createElement('div');contextual.id='contextualElementTools';contextual.className='contextual-element-tools';$("elementInspector").prepend(contextual);}
 const n=getAt(selectedPath),has=!!n,multi=selectedPaths.length>1;
 if(!has||multi||n?.type==='page')contextual.replaceChildren();
 if(n?.type!=="page"&&$("filePropertiesModal").classList.contains("hidden"))placeDocumentFields(false);
 let multiRoot=$("multiPropertyInspector");
 if(!multiRoot){multiRoot=document.createElement("div");multiRoot.id="multiPropertyInspector";$("elementInspector").before(multiRoot);}
 multiRoot.classList.toggle("hidden",!multi);$("selectionArrange")?.classList.toggle("hidden",!multi);document.querySelector(".transform-panel")?.classList.toggle("hidden",multi);
 if(n?.type==="page"){
  $("selectedType").textContent="PAGE";$("emptySelection").classList.add("hidden");$("elementInspector").classList.add("hidden");multiRoot.classList.add("hidden");
  if($("filePropertiesModal").classList.contains("hidden"))placeDocumentFields(true);
  return;
 }
 if(multi){
  $("emptySelection").classList.add("hidden");$("elementInspector").classList.add("hidden");$("selectedType").textContent=selectedPaths.length+" ELEMENTS";
  renderMultiPropertyInspector(multiRoot);return;
 }
 $("emptySelection").classList.toggle("hidden",has);$("elementInspector").classList.toggle("hidden",!has);
 $("selectedType").textContent=has?(n.type||"NODE").toUpperCase():"—";
 if(!has){
  $("emptySelection").querySelector("b").textContent="No element selected";
  $("emptySelection").querySelector("p").textContent="Choose a layer in Structure or click an element on the page to inspect it.";
  $("advancedInspector").replaceChildren();return;
 }
 $("elementType").value=n.type||"";
 for(const [id,k] of [["elementX","x"],["elementY","y"],["elementW","w"],["elementH","h"],["elementStroke","stroke"],["elementFill","fill"],["elementStrokeWidth","strokeWidth"],["elementOpacity","opacity"],["elementText","text"]]){
  const input=$(id);if(document.activeElement===input)continue;
  input.value=k==="opacity"?Math.round(Math.max(0,Math.min(1,Number(n.opacity??1)))*100):getValue(n,k);
 }
 const dims={elementX:["group","repeat","rect","text","path","image"],elementY:["group","repeat","rect","text","path","image"],elementW:["group","rect","path","image"],elementH:["group","rect","path","image"]};
 for(const [id,types] of Object.entries(dims))$(id).disabled=!types.includes(n.type);
 $("elementText").disabled=n.type!=="text";
 for(const id of ['elementStroke','elementFill','elementStrokeWidth'])$(id).disabled=n.type==='image';
 renderAdvanced(n);
 applyPropertyValueHints($("elementInspector"));
}
function renderMultiPropertyInspector(root){
 root.replaceChildren();root.className="multi-property-inspector";
 const lead=document.createElement("p");lead.className="section-description";lead.textContent="Editing "+selectedPaths.length+" selected elements. Only properties supported by every selected element are shown; missing optional values may be set together.";root.appendChild(lead);
 const nodes=selectedPaths.map(path=>getAt(path)).filter(Boolean);if(nodes.length!==selectedPaths.length)return;
 // Capabilities, not explicit JSON keys: defaults and inherited styles are valid.
 // A changed field writes a value to each node; unrelated keys are untouched.
 const fields=sharedEditableProperties(nodes);
 if(!fields.length){const empty=document.createElement("p");empty.className="param-empty";empty.textContent="The selected elements have no editable properties in common.";root.appendChild(empty);return;}
 const labels={stroke:"Stroke",fill:"Fill",strokeWidth:"Stroke width",opacity:"Opacity (%)",rotate:"Rotation (°)",font:"Font",size:"Text size",weight:"Weight",italic:"Italic",align:"Alignment",baseline:"Baseline",dash:"Dash pattern",clip:"Clip",inset:"Inset",axis:"Axis",period:"Period",count:"Count",fit:"Fit",index:"Index alias",stagger:"Stagger",extend:"Extend",text:"Text",x:"X",y:"Y",w:"Width",h:"Height",rx:"Corner radius",cx:"Center X",cy:"Center Y",r:"Radius",ry:"Radius Y",points:"Points",d:"SVG path data",viewBox:"ViewBox",aspect:"Aspect ratio",angle:"Angle",offset:"Offset",select:"Text index",x1:"X1",y1:"Y1",x2:"X2",y2:"Y2"};
 const priority=["stroke","fill","strokeWidth","opacity","rotate","x","y","w","h"];
 fields.sort((a,b)=>{
  const ai=priority.indexOf(a),bi=priority.indexOf(b);
  return (ai<0?priority.length:ai)-(bi<0?priority.length:bi)||a.localeCompare(b);
 });
 for(const key of fields){
  const lab=document.createElement("label");lab.className="field";lab.append(document.createTextNode(labels[key]||key));let input;
  const vals=nodes.map(node=>editablePropertyValue(node,key));
  const same=vals.every(v=>JSON.stringify(v)===JSON.stringify(vals[0]));
  const unset=vals.every(v=>v===undefined);
  if(key==="italic"||key==="clip"||key==="extend"){input=document.createElement("input");input.type="checkbox";input.checked=same&&!!vals[0];}
  else if(["axis","fit","weight","font","align","baseline","aspect"].includes(key)){input=document.createElement("select");const opts={axis:["x","y","xy","none"],fit:["repeat","space","round","center"],weight:["normal","bold"],font:["sans","serif","mono"],align:["start","middle","end"],baseline:["alphabetic","middle","top"],aspect:["contain","stretch"]}[key];const blank=document.createElement("option");blank.value="";blank.textContent=same?String(vals[0]??""):"Multiple values";input.appendChild(blank);opts.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;input.appendChild(o);});input.value=same?String(vals[0]??""):"";}
  else {input=document.createElement("input");input.type=key==="opacity"?"range":"text";if(key==="opacity"){input.min="0";input.max="100";input.step="1";input.value=same?Math.round(Number(vals[0]??1)*100):50;}else input.value=same?(Array.isArray(vals[0])?JSON.stringify(vals[0]):String(vals[0]??"")):"";input.placeholder=unset?"Inherited / not set":same?"":"Multiple values";}
  if(key==="opacity")input.addEventListener("input",()=>{const v=Number(input.value)/100;for(const path of selectedPaths){const target=getAt(path);if(target)target.opacity=Math.max(0,Math.min(1,v));}renderCanvas();});
  input.dataset.property=key;
  input.addEventListener("change",()=>{let value=input.value;if(["italic","clip","extend"].includes(key))value=input.checked;else if(key==="opacity")value=Number(value)/100;else if(value.trim()===""){value=undefined;}else if(["inset","period","count","fit","index","points","viewBox","dash","text"].includes(key)&&value.trim().startsWith("[")){try{value=JSON.parse(value);}catch{toast("Invalid list for "+key);return;}}else if(["clip","extend","italic"].includes(key))value=input.checked;
   commit(()=>{for(const path of selectedPaths){const target=getAt(path);if(!target)continue;if(value===undefined)delete target[key];else target[key]=clone(value);}});
  });
  lab.appendChild(input);root.appendChild(lab);
 }
 applyPropertyValueHints(root);
}
function applyPropertyValueHints(scope){
 if(!scope)return;
 const inputs=[...scope.querySelectorAll('input')];
 for(const input of inputs){
  const key=input.dataset.property || ({elementX:'x',elementY:'y',elementW:'w',elementH:'h',elementStroke:'stroke',elementFill:'fill',elementStrokeWidth:'strokeWidth',elementText:'text'})[input.id];
  const hint=valueHint(key);
  if(!hint||!['text','number'].includes(input.type))continue;
  input.title=hint[0]+' — '+hint[1];
  if(input.type==='text'&&!input.placeholder)input.placeholder=hint[1];
  const parent=input.closest('label.field');
  if(!parent||parent.querySelector('.value-field-hint'))continue;
  const small=document.createElement('small');small.className='value-field-hint';small.textContent=hint[0]+' · '+hint[1];
  parent.appendChild(small);
 }
}
function renderAdvanced(n){
 const root=$("advancedInspector");root.replaceChildren();
 const heading=document.createElement("div");heading.className="advanced-heading";heading.textContent="GEOMETRY & OPTIONS";root.appendChild(heading);
 function addField(label,key,opt={}){
  const lab=document.createElement("label");lab.className="field"+(opt.wide?" wide":"");lab.append(document.createTextNode(label));
  let inp;
  if(opt.select&&!opt.json){inp=document.createElement("select");opt.select.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;inp.appendChild(o);});inp.value=n[key]===undefined?(opt.default||opt.select[0]):n[key];}
  else if(opt.checkbox){inp=document.createElement("input");inp.type="checkbox";inp.checked=!!n[key];inp.className="check-input";}
  else if(opt.area){inp=document.createElement("textarea");inp.rows=3;inp.value=typeof n[key]==="string"?n[key]:n[key]===undefined?"":JSON.stringify(n[key]);}
  else{inp=document.createElement("input");inp.type=opt.type||"text";inp.value=getValue(n,key);}
  inp.addEventListener("change",()=>{
   try{if(opt.checkbox)n[key]=inp.checked;
    else if(inp.value.trim()==="")delete n[key];
    else if(opt.select)n[key]=inp.value;
    else if(opt.json||(["inset","period","count","fit","index","points","viewBox","dash"].includes(key)&&inp.value.trim().startsWith("[")))n[key]=JSON.parse(inp.value);
    else if(opt.numeric&&Number.isFinite(Number(inp.value)))n[key]=Number(inp.value);
    else n[key]=inp.value;
    commit(()=>{});
   }catch(e){toast("Invalid value: "+e.message);}
  });
  lab.dataset.fieldKeys=key;lab.appendChild(inp);root.appendChild(lab);
 }
 const row=(a,b)=>{const wrap=document.createElement("div");wrap.className="field-row";wrap.dataset.fieldKeys=a[1]+","+b[1];root.appendChild(wrap);function fieldIn(label,key,opt={}){const lab=document.createElement("label");lab.className="field";lab.append(document.createTextNode(label));const inp=document.createElement("input");inp.value=getValue(n,key);inp.addEventListener("change",()=>{if(inp.value.trim()==="")delete n[key];else if(opt.numeric&&Number.isFinite(Number(inp.value)))n[key]=Number(inp.value);else n[key]=inp.value;commit(()=>{});});lab.appendChild(inp);wrap.appendChild(lab);}fieldIn(a[0],a[1],a[2]||{});fieldIn(b[0],b[1],b[2]||{});};
 if(n.type==="group"){addField("Margem interna (inset)","inset",{wide:true,json:Array.isArray(n.inset)});addField("Recortar conteúdo (clip)","clip",{checkbox:true});}
 if(n.type==="repeat"){addField("Eixo","axis",{select:["x","y","xy","none"]});addField("Period (period)","period",{wide:true,json:Array.isArray(n.period)});addField("Contagem (count)","count",{wide:true,json:Array.isArray(n.count)});addField("Ajuste (fit)","fit",Array.isArray(n.fit)?{wide:true,json:true}:{select:["repeat","space","round","center"]});addField("Índice (alias)","index",{wide:true,json:Array.isArray(n.index)});addField("Deslocamento alternado (stagger)","stagger");addField("Estender até o papel (extend)","extend",{checkbox:true});}
 if(n.type==="line"){row(["X inicial","x1"],["Y inicial","y1"]);row(["X final","x2"],["Y final","y2"]);}
 if(n.type==="hline"){addField("Y position","y");row(["X inicial","x1"],["X final","x2"]);}
 if(n.type==="vline"){addField("X position","x");row(["Y inicial","y1"],["Y final","y2"]);}
 if(n.type==="rect")addField("Raio dos cantos (rx)","rx");
 if(["circle","dot"].includes(n.type)){row(["Centro X","cx"],["Centro Y","cy"]);addField("Raio (r)","r");}
 if(n.type==="ellipse"){row(["Centro X","cx"],["Centro Y","cy"]);row(["Raio X","rx"],["Raio Y","ry"]);}
 if(n.type==="text")addField("Índice do texto (select)","select");
 if(["polyline","polygon"].includes(n.type))addField("Pontos (lista de pares [x,y])","points",{wide:true,area:true,json:true});
 if(n.type==="path"){addField("Dados SVG (d)","d",{wide:true,area:true});addField("ViewBox [x,y,w,h]","viewBox",{wide:true,json:true});addField("Aspect ratio","aspect",{select:["contain","stretch"]});}
 if(n.type==='image'){
  addField('Source (inside package)','src',{wide:true});
  addField('Image fit','fit',{select:['contain','cover','stretch']});
  addField('Image position','position',{select:['center','top','bottom','left','right','top left','top right','bottom left','bottom right']});
  const replace=document.createElement('button');replace.type='button';replace.className='quiet';replace.textContent='Replace image…';replace.addEventListener('click',()=>{$('imageFileInput').dataset.replace='true';$('imageFileInput').click();});
  const wrap=document.createElement('div');wrap.dataset.fieldKeys='src,fit,position';wrap.className='field';
  wrap.appendChild(replace);
  const note=document.createElement('small');note.className='value-field-hint';
  note.textContent='Contain keeps the full photo visible. Cover crops to fill. Free edge/corner resizing stretches the image; Shift + corner preserves the current proportions and fit.';
  wrap.appendChild(note);root.appendChild(wrap);
 }
 if(n.type==="hatch"){addField("Period","period",{json:Array.isArray(n.period)});addField("Ângulo (graus)","angle",{numeric:true});addField("Deslocamento","offset");addField("Estender além da caixa","extend",{checkbox:true});}
 const styleHead=document.createElement("div");styleHead.className="advanced-heading";styleHead.textContent="TYPE & STROKE";root.appendChild(styleHead);
 if(n.type==="text"){addField("Tamanho da fonte","size");addField("Peso","weight",{select:["normal","bold"]});addField("Fonte","font",{select:["sans","serif","mono"]});addField("Alinhamento","align",{select:["start","middle","end"]});addField("Linha de base","baseline",{select:["alphabetic","middle","top"]});addField("Italic","italic",{checkbox:true});}
 if(n.type==="text")addField("Rotation (degrees, XNotes 90° steps)","rotate");
 if(n.type!=='image')addField("Tracejado [stroke, espaço]","dash",{wide:true,json:Array.isArray(n.dash)});
 const fields=[...root.children].filter(child=>child.dataset.fieldKeys).map(element=>({element,keys:element.dataset.fieldKeys.split(",")}));
 const sections=inspectorSections(n.type,fields);
 root.replaceChildren();
 for(const [id,label] of [["essential","ESSENTIAL · "+n.type.toUpperCase()],["additional","OTHER PROPERTIES"],["advanced","ADVANCED OPTIONS"]]){
  if(!sections[id].length)continue;
  const title=document.createElement("div");title.className="advanced-heading";title.textContent=label;
  root.appendChild(title);
  for(const field of sections[id])root.appendChild(field.element);
 }
 const contextual=$("contextualElementTools");contextual.replaceChildren();
 renderFlipControls(contextual,n);
 if(['polygon','polyline'].includes(n.type))renderPolygonControls(contextual,n);
 if(n.type==='hatch')renderHatchControls(contextual,n);
 if(n.type==='path')renderSvgPathControls(contextual,n);
}
function commit(fn){
 try{
  fn();validate(doc);
  const next=JSON.stringify(doc);
  if(!historyRestoring&&history.record(next))updateHistoryButtons();
  setDirty(true);syncJson();render();setStatus("Changes applied");
 }catch(e){
  // Most visual actions mutate before commit(() => {}). Restore the last valid
  // document rather than leaving an unexportable in-memory tree after failure.
  doc=JSON.parse(history.current);selectedPath=null;selectedPaths=[];
  initializePreviewValues();syncJson();render();toast(e.message);
 }
}
function updateHistoryButtons(){const u=$("undoBtn"),r=$("redoBtn");if(u)u.disabled=!history.canUndo;if(r)r.disabled=!history.canRedo;}
function resetHistory(){history.reset(JSON.stringify(doc));updateHistoryButtons();}
function restoreHistory(direction,label){const state=direction==="undo"?history.undo(JSON.stringify(doc)):history.redo(JSON.stringify(doc));if(state===null)return;historyRestoring=true;try{doc=JSON.parse(state);selectedPath=null;selectedPaths=[];setDirty(true);initializePreviewValues();syncJson();render();setInspectorTab("properties");setStatus(label);updateHistoryButtons();}finally{historyRestoring=false;}}
function undo(){restoreHistory("undo","Desfeito");}
function redo(){restoreHistory("redo","Refeito");}
$("undoBtn")?.addEventListener("click",undo);$("redoBtn")?.addEventListener("click",redo);
function updateNode(k,v){const n=getAt(selectedPath);if(!n)return;if(v.trim()===""){delete n[k];return;}if(k==="opacity"&&Number.isFinite(Number(v)))n[k]=Math.max(0,Math.min(1,Number(v)/100));else if(k==="text")n[k]=v;else n[k]=v;}
[["elementX","x"],["elementY","y"],["elementW","w"],["elementH","h"],["elementStroke","stroke"],["elementFill","fill"],["elementStrokeWidth","strokeWidth"],["elementOpacity","opacity"],["elementText","text"]].forEach(([id,k])=>{
 const input=$(id);input.addEventListener("change",e=>commit(()=>updateNode(k,e.target.value)));
 if(k==="opacity")input.addEventListener("input",e=>{const n=getAt(selectedPath);if(!n)return;n.opacity=Math.max(0,Math.min(1,Number(e.target.value)/100));$("elementOpacityValue").textContent=e.target.value+"%";renderCanvas();});
});
function setInspectorTab(tab){
 if(tab==="document"){
  setInspectorTab("properties");
  return;
 }
 activeInspector=tab;
 document.querySelectorAll(".right-tab").forEach(b=>b.classList.toggle("active",b.dataset.inspector===tab));
 $("propertiesPanel").classList.toggle("hidden",tab!=="properties");
 $("paramsPanel").classList.toggle("hidden",tab!=="params");
}
document.querySelectorAll(".right-tab").forEach(b=>b.addEventListener("click",()=>setInspectorTab(b.dataset.inspector)));
function setLeftTab(tab){
 document.querySelectorAll(".left-tab").forEach(b=>{
  const active=b.dataset.leftTab===tab;
  b.classList.toggle("active",active);
  b.setAttribute("aria-selected",String(active));
 });
 document.querySelectorAll("[data-left-panel]").forEach(panel=>panel.classList.toggle("hidden",panel.dataset.leftPanel!==tab));
}
document.querySelectorAll(".left-tab").forEach(b=>b.addEventListener("click",()=>setLeftTab(b.dataset.leftTab)));
function renderParams(){const root=$("paramsEditor");root.replaceChildren();const params=doc.params||(doc.params={});const entries=Object.entries(params);if(!entries.length){const p=document.createElement("p");p.className="param-empty";p.textContent="Este template não define parâmetros. Adicione um para expor valores configuráveis sem editar a estrutura dos elements.";root.appendChild(p);}entries.forEach(([name,p])=>{const card=document.createElement("details");card.className="param-card";const head=document.createElement("summary");head.className="param-card-head";const titleWrap=document.createElement("span");titleWrap.className="param-title-wrap";const code=document.createElement("code");code.textContent=name;const titleType=document.createElement("small");titleType.textContent=(p.label||name)+" · "+(p.type||"length");titleWrap.append(code,titleType);const del=document.createElement("button");del.textContent="×";del.title="Delete variable";del.setAttribute("aria-label","Delete variable "+name);del.addEventListener("click",async e=>{e.preventDefault();e.stopPropagation();if(!await requestConfirmation("Delete variable","Delete “"+name+"”? Properties using this variable will keep their value/reference.","Delete"))return;delete doc.params[name];delete previewValues[name];delete previewValues["$"+name];commit(()=>{});});head.append(titleWrap,del);card.appendChild(head);const grid=document.createElement("div");grid.className="param-grid";function field(label,value,key,wide=false,type="text"){const lab=document.createElement("label");if(wide)lab.className="wide";lab.append(document.createTextNode(label));const inp=document.createElement("input");inp.type=type;const isLength=p.type==="length"&&["default","min","max","step"].includes(key);inp.type=isLength?"number":type;if(isLength)inp.step="any";inp.value=isLength&&value!==undefined&&value!==""?(mm(value)??(Number.isFinite(Number(value))?Number(value):"")):value??"";if(key==="default"&&p.type==="color")inp.type="text";if(key==="default"&&["number","integer"].includes(p.type))inp.type="number";if(["min","max","step"].includes(key)&&["number","integer"].includes(p.type))inp.type="number";inp.addEventListener("change",()=>{commit(()=>{if(inp.value===""){if(key==="default"&&p.type==="color")throw Error("Enter a hex color, for example #4f7cff.");delete p[key];}else if(isLength&&Number.isFinite(Number(inp.value)))p[key]=Number(inp.value)+"mm";else if(["min","max","step"].includes(key)&&p.type!=="color"&&Number.isFinite(Number(inp.value)))p[key]=Number(inp.value);else if(key==="default"&&p.type==="color"){if(!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(inp.value))throw Error("Use a hex color, for example #4f7cff.");p[key]=inp.value;}else if(key==="default"&&["number","integer"].includes(p.type)&&Number.isFinite(Number(inp.value)))p[key]=p.type==="integer"?Math.round(Number(inp.value)):Number(inp.value);else p[key]=inp.value;if(key==="default"){delete previewValues[name];delete previewValues["$"+name];initializePreviewValues();}});});lab.appendChild(inp);if(key==="default"&&p.type==="color"){
  const picker=document.createElement('input');picker.type='color';picker.className='variable-edit-color-picker';
  picker.setAttribute('aria-label','Choose default color for '+name);
  const asLongHex=hex=>/^#[0-9a-f]{3}$/i.test(hex)?'#'+[...hex.slice(1)].map(c=>c+c).join(''):hex;
  picker.value=/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(inp.value)?asLongHex(inp.value):'#4f7cff';
  // Changing a hex value by hand refreshes the swatch. The color picker
  // triggers the same vetted commit path as the normal input on change.
  inp.addEventListener('input',()=>{const hex=asLongHex(inp.value.trim());
   if(/^#[0-9a-f]{6}$/i.test(hex))picker.value=hex;
  });
  picker.addEventListener('input',()=>{inp.value=picker.value;});
  picker.addEventListener('change',()=>{inp.value=picker.value;inp.dispatchEvent(new Event('change',{bubbles:true}));});
  lab.classList.add('variable-edit-color-field');lab.appendChild(picker);
 }grid.appendChild(lab);}const typelab=document.createElement("label");typelab.textContent="Type";const sel=document.createElement("select");["length","number","integer","color"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o);});sel.value=p.type||"length";sel.addEventListener("change",()=>commit(()=>{p.type=sel.value;p.default=sel.value==="color"?"#4f7cff":sel.value==="length"?"5mm":1;delete previewValues[name];delete previewValues["$"+name];initializePreviewValues();}));typelab.appendChild(sel);
 const typeHint=document.createElement("small");typeHint.className="value-type-hint";
 typeHint.textContent=variableTypeHint(sel.value)?.[1]||"";
 sel.addEventListener("change",()=>{typeHint.textContent=variableTypeHint(sel.value)?.[1]||"";});
 typelab.appendChild(typeHint);grid.appendChild(typelab);field("Label",p.label||"", "label",true);const roleLabel=document.createElement("label");roleLabel.className="wide";roleLabel.append(document.createTextNode("Template role"));const roleSelect=document.createElement("select");[["","Default"],["spacing","Primary spacing"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;roleSelect.appendChild(option);});roleSelect.value=p.role||"";const spacingOwner=Object.entries(doc.params||{}).find(([otherName,other])=>other.role==="spacing"&&otherName!==name);roleSelect.querySelector('option[value="spacing"]').disabled=p.type!=="length"||!!spacingOwner;if(p.type!=="length")roleSelect.value="";roleSelect.addEventListener("change",()=>commit(()=>{if(roleSelect.value)p.role=roleSelect.value;else delete p.role;}));roleLabel.appendChild(roleSelect);grid.appendChild(roleLabel);field("Default",p.default??"", "default",true,"text");if(p.type!=="color"){field("Minimum",p.min??"","min");field("Maximum",p.max??"","max");field("Step",p.step??"","step");}const live=document.createElement("label");live.className="wide";live.textContent=p.type==="length"?"Preview value (mm)":"Preview value";if(p.type==="color"){const row=document.createElement("span");row.className="param-color";const inp=document.createElement("input");inp.type="text";inp.value=previewValues["$"+name]||p.default||"#4f7cff";const val=document.createElement("code");val.textContent=inp.value;const choices=document.createElement("span");choices.className="color-swatch-row";COLOR_SWATCHES.forEach(color=>{const b=document.createElement("button");b.type="button";b.className="color-swatch";b.style.backgroundColor=color;b.title=color;b.setAttribute("aria-label","Use color "+color);b.addEventListener("click",()=>{inp.value=color;inp.dispatchEvent(new Event("input",{bubbles:true}));});choices.appendChild(b);});inp.addEventListener("input",()=>{if(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(inp.value)){previewValues["$"+name]=inp.value;val.textContent=inp.value;renderCanvas();}else val.textContent="Invalid hex";});const picker=document.createElement('input');picker.type='color';picker.className='variable-preview-color-picker';
 picker.setAttribute('aria-label','Choose preview color for '+name);
 const normalize=hex=>/^#[0-9a-f]{3}$/i.test(hex)?'#'+[...hex.slice(1)].map(c=>c+c).join(''):hex;
 if(/^#[0-9a-f]{6}$/i.test(normalize(inp.value)))picker.value=normalize(inp.value);
 picker.addEventListener('input',()=>{inp.value=picker.value;inp.dispatchEvent(new Event('input',{bubbles:true}));});
 inp.addEventListener('input',()=>{const hex=normalize(inp.value);
  if(/^#[0-9a-f]{6}$/i.test(hex))picker.value=hex;
 });
 row.append(inp,picker,val,choices);live.appendChild(row);}else{const inp=document.createElement("input");inp.type="number";inp.step=p.type==="integer"?"1":"any";inp.min=p.min!==undefined?String(p.type==="length"?(mm(p.min)??p.min):p.min):"";inp.max=p.max!==undefined?String(p.type==="length"?(mm(p.max)??p.max):p.max):"";inp.value=previewValues[name]??p.default??"";inp.addEventListener("change",()=>{let v=p.type==="length"?(mm(inp.value)??(Number(inp.value)||0)):Number(inp.value);const low=p.min===undefined?null:(p.type==="length"?(mm(p.min)??Number(p.min)):Number(p.min)),high=p.max===undefined?null:(p.type==="length"?(mm(p.max)??Number(p.max)):Number(p.max));if(Number.isFinite(low))v=Math.max(low,v);if(Number.isFinite(high))v=Math.min(high,v);if(p.type==="integer")v=Math.round(v);previewValues[name]=Number.isFinite(v)?v:0;renderCanvas();});live.appendChild(inp);}grid.appendChild(live);card.appendChild(grid);const usage=document.createElement("div");usage.className="param-usage";const uses=[];function scanUses(nodes,path="items"){(nodes||[]).forEach((node,index)=>{if(!node||typeof node!=="object")return;const nodePath=path+"["+index+"]";for(const prop of ["stroke","fill"]){if(p.type==="color"&&node[prop]===name)uses.push({type:node.type,prop,nodePath});}if(p.type!=="color"){for(const [prop,value] of Object.entries(node)){if(["children","type","stroke","fill","font","weight","align","baseline"].includes(prop)||typeof value!=="string")continue;const re=new RegExp("(^|[^A-Za-z0-9_])"+name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^A-Za-z0-9_]|$)");if(re.test(value))uses.push({type:node.type,prop,nodePath});}}if(Array.isArray(node.children))scanUses(node.children,nodePath+".children");});}scanUses(doc.items);const usageTitle=document.createElement("b");usageTitle.textContent=uses.length?"Where it is used":"Not linked yet";usage.appendChild(usageTitle);const usageText=document.createElement("p");usageText.textContent=uses.length?uses.slice(0,5).map(u=>u.type+" · "+u.prop+" · "+u.nodePath).join("\n")+(uses.length>5?"\n+ "+(uses.length-5)+" use(s)":""):(p.type==="color"?"To link it, select an element and choose this variable in the Stroke or Fill field.":"To link it, use the name "+name+" in an element measurement or expression, for example: "+name+" * 2.");usage.appendChild(usageText);card.appendChild(usage);root.appendChild(card);});}
const paramCreateForm=$("paramCreateForm");
function syncParamRoleOption(){const option=$("newParamRole").querySelector('option[value="spacing"]');if(!option)return;const name=$("newParamName").value.trim(),owner=Object.entries(doc.params||{}).some(([key,p])=>key!==name&&p.role==="spacing");option.disabled=$("newParamType").value!=="length"||owner;if(option.disabled&&$("newParamRole").value==="spacing")$("newParamRole").value="";}
function resetParamForm(){paramCreateForm.reset();$("newParamName").value="";$("newParamLabel").value="";$("newParamType").value="length";$("newParamDefault").value=5;$("newParamMin").value="";$("newParamMax").value="";$("newParamDefault").type="number";$("newParamDefault").min="0";$("newParamDefault").step="any";["newParamMin","newParamMax"].forEach(id=>{const input=$(id);input.type="number";input.step="any";input.min="0";input.placeholder="mm";});$("newParamRole").value="";$("newParamError").classList.add("hidden");$("newParamLimits").classList.remove("hidden");renderColorChoices("newParamDefault","literal");$("newParamDefaultChoices").classList.add("hidden");$("newParamColorPicker").classList.add("hidden");$("newParamColorPicker").value="#4f7cff";syncParamRoleOption();}
function updateParamFormType(){const type=$("newParamType").value,defaults={length:"5mm",color:"#4f7cff",number:"1",integer:"1"};$("newParamDefault").type=type==="color"?"text":(["number","integer","length"].includes(type)?"number":"text");$("newParamDefault").step=type==="integer"?"1":"any";$("newParamDefault").min=type==="length"?"0":"";$("newParamDefault").value=type==="length"?5:defaults[type];renderColorChoices("newParamDefault","literal");$("newParamDefaultChoices").classList.toggle("hidden",type!=="color");$("newParamColorPicker").classList.toggle("hidden",type!=="color");if(type==="color")$("newParamColorPicker").value="#4f7cff";["newParamMin","newParamMax"].forEach(id=>{const input=$(id);input.type=type==="color"?"text":"number";input.step="any";input.min=type==="length"?"0":"";input.placeholder=type==="length"?"mm":"Opcional";});$("newParamLimits").classList.toggle("hidden",type==="color");syncParamRoleOption();}
$("addParam").addEventListener("click",()=>{resetParamForm();refreshNewVariableHint();$("newVariableModal").classList.remove("hidden");paramCreateForm.classList.remove("hidden");$("newParamName").focus();});
$("cancelAddParam").addEventListener("click",()=>{paramCreateForm.classList.add("hidden");closeModal("newVariableModal");});
function refreshNewVariableHint(){
 const hint=variableTypeHint($("newParamType").value);
 $("newParamTypeHint").textContent=hint?.[1]||"";
}
// Native browser color picker + exact hexadecimal entry, synchronized both
// ways without changing the document until the variable is created.
$("newParamColorPicker").addEventListener('input',e=>{
 $("newParamDefault").value=e.target.value;
});
$("newParamDefault").addEventListener('input',e=>{
 if($("newParamType").value!=='color')return;
 let hex=e.target.value.trim();
 if(/^#[0-9a-f]{3}$/i.test(hex))hex='#'+[...hex.slice(1)].map(c=>c+c).join('');
 if(/^#[0-9a-f]{6}$/i.test(hex))$("newParamColorPicker").value=hex;
});
$("newParamType").addEventListener("change",refreshNewVariableHint);
$("newParamType").addEventListener("change",updateParamFormType);
paramCreateForm.addEventListener("submit",e=>{e.preventDefault();const name=$("newParamName").value.trim(),label=$("newParamLabel").value.trim(),type=$("newParamType").value,rawDefault=$("newParamDefault").value.trim(),rawMin=$("newParamMin").value.trim(),rawMax=$("newParamMax").value.trim(),error=$("newParamError");let message="";
 if(!/^[A-Za-z_][A-Za-z0-9_]{0,47}$/.test(name))message="Use um nome iniciado por letra ou _, sem espaços.";
 else if(["W","H","i","j","pi"].includes(name))message="Esse nome é reservado pelo mecanismo de expressões.";
 else if(Object.hasOwn(doc.params||{},name))message="Já existe um parâmetro com esse nome.";
 let def=rawDefault,min,max;
 if(!message&&type==="length"&&(!Number.isFinite(Number(rawDefault))||Number(rawDefault)<0))message="Informe uma medida em milímetros maior ou igual a zero.";
 if(!message&&type==="color"&&!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(rawDefault))message="Enter a hex color, for example #4f7cff.";
 if(!message&&["number","integer"].includes(type)&&!Number.isFinite(Number(rawDefault)))message="O valor padrão precisa ser numérico.";
 if(!message&&type==="integer"&&!Number.isInteger(Number(rawDefault)))message="O valor padrão precisa ser um número inteiro.";
 const parseLimit=(v,which)=>{if(!v)return null;const n=Number(v);return Number.isFinite(n)?n:null;};
 if(!message&&type!=="color"){min=parseLimit(rawMin,"min");max=parseLimit(rawMax,"max");if(rawMin&&min===null)message="O mínimo não é válido para esse tipo.";else if(rawMax&&max===null)message="O máximo não é válido para esse tipo.";else if(min!==null&&max!==null&&min>max)message="O mínimo não pode ser maior que o máximo.";else if(min!==null&&Number(rawDefault)<min)message="O padrão está abaixo do mínimo.";else if(max!==null&&Number(rawDefault)>max)message="Default is greater than the maximum.";}
 if(message){error.textContent=message;error.classList.remove("hidden");return;}
 const param={type,default:type==="length"?Number(rawDefault)+"mm":type==="color"?rawDefault:(type==="integer"?Math.round(Number(rawDefault)):Number(rawDefault)),label:label||name};if(min!==null&&min!==undefined)param.min=type==="length"?min+"mm":min;if(max!==null&&max!==undefined)param.max=type==="length"?max+"mm":max;if($("newParamRole").value)param.role=$("newParamRole").value;
 if(!doc.params)doc.params={};doc.params[name]=param;initializePreviewValues();commit(()=>{});paramCreateForm.classList.add("hidden");closeModal("newVariableModal");setInspectorTab("params");toast("Variable '"+name+"' created.");});
const validate = validateTemplate;
function renderJsonInput(){
 const source=jsonEditor.value;
 try{
  const next=JSON.parse(source);
  validate(next);
  const serialized=JSON.stringify(next);
  if(serialized!==JSON.stringify(doc)){
   if(!historyRestoring&&history.record(serialized))updateHistoryButtons();
   doc=next;
   selectedPath=null;selectedPaths=[];
   initializePreviewValues();
   setDirty(true);
   updateHistoryButtons();
   render();
   renderTree();
   renderInspector();
   setStatus("JSON aplicado à pré-visualização");
  }
  setValidation("ok","JSON válido");
 }catch(e){
  setValidation("error","JSON inválido");
  setStatus(e.message);
 }
}
let jsonInputTimer;
jsonEditor.addEventListener("input",()=>{if(suppressJson)return;updateLineNumbers();clearTimeout(jsonInputTimer);jsonInputTimer=setTimeout(renderJsonInput,250);});
jsonEditor.addEventListener("scroll",()=>$("lineNumbers").scrollTop=jsonEditor.scrollTop);
jsonEditor.addEventListener("click",updateCursor);jsonEditor.addEventListener("keyup",updateCursor);
function updateCursor(){const before=jsonEditor.value.slice(0,jsonEditor.selectionStart),lines=before.split("\n");$("jsonCursor").textContent="Linha "+lines.length+", coluna "+(lines[lines.length-1].length+1);}
$("formatJson").addEventListener("click",()=>{try{const next=JSON.parse(jsonEditor.value);validate(next);doc=next;syncJson();initializePreviewValues();render();setDirty(true);toast("JSON formatted.");}catch(e){toast("Invalid JSON: "+e.message);}});
$("resetJson").addEventListener("click",()=>{syncJson();initializePreviewValues();render();toast("JSON editor reverted to the last valid version.");});
function toggleSplit(force){split=force===undefined?!split:force;$("jsonPane").classList.toggle("hidden",!split);$("splitToggle").classList.toggle("active",split);$("splitToggle").querySelector("span").textContent=split?"Close JSON":"Split editor";if(split){syncJson();$("jsonEditor").focus();}fitPaper();}
$("splitToggle").addEventListener("click",()=>toggleSplit());
$("metaKind").addEventListener('change',e=>commit(()=>{if(e.target.value==='cover')doc.kind='cover';else delete doc.kind;}));
$("metaName").addEventListener("change",e=>commit(()=>doc.name=e.target.value.trim()||"Untitled"));$("metaId").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.id=e.target.value;else delete doc.id;}));$("metaDescription").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.description=e.target.value;else delete doc.description;}));$("metaAuthor").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.author=e.target.value;else delete doc.author;}));$("metaLicense").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.license=e.target.value;else delete doc.license;}));$("metaVersion").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.version=e.target.value;else delete doc.version;}));$("metaTags").addEventListener("change",e=>commit(()=>{doc.tags=e.target.value.split(",").map(s=>s.trim()).filter(Boolean);}));
for(const [main,quick] of [["inkColor","quickInkColor"],["accentColor","quickAccentColor"]]){
 for(const [source,target] of [[main,quick],[quick,main]]){
  $(source).addEventListener("input",()=>{
   const color=$(source).value;$(target).value=color;
   if(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color))renderCanvas();
  });
 }
}
function addNode(type){if(type==='image'){$('imageFileInput').click();return;}const n=createDefaultNode(type);if(!n){toast("Unsupported element type: "+type);return;}const {parent,parentPath}=insertionContext();const arr=parent?parent.children:(doc.items||(doc.items=[]));arr.push(n);selectedPath=parent?parentPath.concat(["children",arr.length-1]):["items",arr.length-1];selectedPaths=[selectedPath.slice()];commit(()=>{});setInspectorTab("properties");setStatus("Element added");}
$("addElement").addEventListener("click",openStructureAddMenu);
$("deleteElement").addEventListener("click",async()=>{
 if(!selectedPaths.length)return;
 const count=selectedPaths.length;
 if(!await requestConfirmation("Delete element"+(count===1?"":"s"),"Delete "+count+" selected element"+(count===1?"":"s")+"? This change can be undone with Ctrl+Z.","Delete"))return;
 const paths=normalizeSelectedPaths(selectedPaths).filter(path=>path?.[0]!=="__page__").map(path=>path.slice()).sort((a,b)=>{const pa=nodeKey(a.slice(0,-1)),pb=nodeKey(b.slice(0,-1));return pa===pb?b.at(-1)-a.at(-1):b.length-a.length;});
 if(!paths.length)return;
 for(const path of paths){const parent=getAt(path.slice(0,-1)),index=path.at(-1);if(Array.isArray(parent)&&index>=0&&index<parent.length)parent.splice(index,1);}
 selectedPath=null;selectedPaths=[];commit(()=>{});
});
$("duplicateElement").addEventListener("click",()=>{
 if(!selectedPaths.length)return;
 if(selectedPaths.length===1){const path=selectedPaths[0],parent=getAt(path.slice(0,-1)),index=path.at(-1);if(!Array.isArray(parent))return;parent.splice(index+1,0,clone(getAt(path)));selectedPath=path.slice(0,-1).concat(index+1);selectedPaths=[selectedPath.slice()];commit(()=>{});return;}
 const result=duplicateSiblingNodes(doc,selectedPaths);
 if(!result){toast("Para duplicar vários elementos juntos, selecione itens do mesmo grupo.");return;}
 selectedPaths=result.paths;selectedPath=result.path;commit(()=>{});toast(result.count+" elementos duplicados.");
});
$("expandTree").addEventListener("click",()=>{
 if(collapsedTree.size)collapsedTree.clear();
 else{
  function walk(items,path=[]){items.forEach((n,i)=>{const p=path.concat(path.length?["children",i]:["items",i]);if(["group","repeat"].includes(n.type)&&(n.children||[]).length){collapsedTree.add(nodeKey(p));walk(n.children,p);}});}
  walk(doc.items||[]);
 }
 renderTree();
});

/** A node's actually painted SVG bounds, including nested group transforms and
 * each repeated instance, in page/document units rather than CSS pixels. */

function snapTargetsFor(excludedPaths=[]){
 const excluded=excludedPaths.map(nodeKey),targets=[];
 const related=candidate=>excluded.some(key=>candidate===key||candidate.startsWith(key+".")||key.startsWith(candidate+"."));
 // Query actual SVG instances, not template nodes. A repeat can produce dozens
 // of individually visible alignment targets; custom shapes and hatch groups
 // also have proper painted bounds despite lacking explicit x/y/w/h keys.
 for(const element of paper.querySelectorAll('g[data-path]')){
  if(element.closest('#editor-selection-overlay'))continue;
  const candidate=element.dataset.path;
  if(related(candidate))continue;
  const bounds=paintedBounds(element,paper);
  if(bounds&&bounds.w>=0&&bounds.h>=0)targets.push({...bounds,kind:'object',path:candidate});
 }
 return targets;
}
function snapToGuides(proposed,excludedPaths=[],targets=null){
 if(!magneticGuidesEnabled)return{dx:0,dy:0,guides:{x:null,y:null},segments:{x:null,y:null}};
 const rect=paper.getBoundingClientRect(),toleranceX=7*pageSize[0]/Math.max(1,rect.width),toleranceY=7*pageSize[1]/Math.max(1,rect.height);
 return calculateObjectSnap(proposed,targets||snapTargetsFor(excludedPaths),{w:pageSize[0],h:pageSize[1]},toleranceX,toleranceY);
}
function snappedResizeBounds(bounds,handle,excludedPaths=[],targets=null){
 if(!magneticGuidesEnabled)return{bounds,guides:{x:null,y:null},segments:{x:null,y:null}};
 const rect=paper.getBoundingClientRect(),tx=7*pageSize[0]/Math.max(1,rect.width),ty=7*pageSize[1]/Math.max(1,rect.height);
 return calculateResizeSnap(bounds,handle,targets||snapTargetsFor(excludedPaths),{w:pageSize[0],h:pageSize[1]},tx,ty);
}
function resizeForGesture(bounds,handle,dx,dy,shiftKey,paths,targets){
 const rect=paper.getBoundingClientRect(),toleranceX=7*pageSize[0]/Math.max(1,rect.width),
   toleranceY=7*pageSize[1]/Math.max(1,rect.height);
 return resizeGestureBounds(bounds,handle,dx,dy,{
  shiftKey,magnetic:magneticGuidesEnabled,
  targets:targets||snapTargetsFor(paths),page:{w:pageSize[0],h:pageSize[1]},
  toleranceX,toleranceY
 });
}
function clearSmartGuides(){smartGuides={x:null,y:null};smartGuideSegments={x:null,y:null};}
function renderSmartGuideOverlay(){
 paper.querySelectorAll(".smart-guide,.smart-guide-point").forEach(el=>el.remove());
 const x=smartGuideSegments.x,y=smartGuideSegments.y;
 if(x){
  paper.appendChild(svg("line",{class:"smart-guide"+(x.kind==="object"?" object-guide":""),x1:x.x,y1:x.y1,x2:x.x,y2:x.y2}));
  if(x.kind==="object")for(const cy of [x.y1,x.y2])paper.appendChild(svg("circle",{class:"smart-guide-point",cx:x.x,cy,r:0.7}));
 }
 if(y){
  paper.appendChild(svg("line",{class:"smart-guide"+(y.kind==="object"?" object-guide":""),x1:y.x1,y1:y.y,x2:y.x2,y2:y.y}));
  if(y.kind==="object")for(const cx of [y.x1,y.x2])paper.appendChild(svg("circle",{class:"smart-guide-point",cx,cy:y.y,r:0.7}));
 }
}
function captureDragTransforms(paths){
 const keys=new Set(paths.map(nodeKey)),seen=new Set(),out=[];
 for(const element of paper.querySelectorAll("g[data-path]")){
  if(!keys.has(element.dataset.path)||seen.has(element))continue;
  seen.add(element);out.push({element,transform:element.getAttribute("transform")||""});
 }
 return out;
}
function applyDragPreview(transforms,dx,dy){
 const translation="translate("+dx+" "+dy+")";
 for(const item of transforms)item.element.setAttribute("transform",translation+(item.transform?" "+item.transform:""));
}
function updateResizePreviewFields(state){
 const bounds=state.previewBounds;if(!bounds)return;
 for(const [id,value] of [["transformX",bounds.x],["transformY",bounds.y],["transformW",bounds.w],["transformH",bounds.h]]){
  const input=$(id);if(input&&document.activeElement!==input)input.value=Number(value.toFixed(2));
 }
}
function updateTransformPreview(dx,dy){
 const node=getAt(selectedPath);if(!node)return;
 const bounds=transformGeometry(node,selectedPath);
 if(bounds){
  if(document.activeElement!==$("transformX"))$("transformX").value=Number((bounds.x+dx).toFixed(2));
  if(document.activeElement!==$("transformY"))$("transformY").value=Number((bounds.y+dy).toFixed(2));
 }
 if(["image","group","rect","text","path"].includes(node.type)){
  const box=parentBoxForPath(selectedPath);
  const x=evalN(node.x??0,box,"x")+dx,y=evalN(node.y??0,box,"y")+dy;
  if(document.activeElement!==$("elementX"))$("elementX").value=Number(x.toFixed(2))+"mm";
  if(document.activeElement!==$("elementY"))$("elementY").value=Number(y.toFixed(2))+"mm";
 }
}

function isRepeatedPath(path){for(let i=0;i<path.length-2;i+=2)if(getAt(path.slice(0,i+2))?.type==="repeat")return true;return false;}
function replaceAt(path,value){const parent=getAt(path.slice(0,-1)),index=path.at(-1);if(Array.isArray(parent)&&Number.isInteger(index)&&index>=0&&index<parent.length)parent[index]=clone(value);}
function unionBounds(items){const bounds=items.map(item=>item.bounds).filter(Boolean);if(!bounds.length)return null;const x=Math.min(...bounds.map(b=>b.x)),y=Math.min(...bounds.map(b=>b.y)),right=Math.max(...bounds.map(b=>b.x+b.w)),bottom=Math.max(...bounds.map(b=>b.y+b.h));return{x,y,w:right-x,h:bottom-y};}

const draggableTypes=new Set(["image","group","rect","path","text","ellipse","circle","dot","line","hline","vline","polyline","polygon"]);
paper.addEventListener("pointerdown",e=>{
 if(activeTool==='select'&&e.button===0&&pathCurrent()){
  const handle=e.target.closest('[data-svg-path-point]');if(handle){
   if(document.activeElement?.matches('select,button'))document.activeElement.blur();
   pathPointSelection=Number(handle.dataset.svgPathPoint);
   const shape=pathShape(),pt=editablePathNodes(pathCurrent().d).nodes[pathPointSelection];
   pathDrag={pointerId:e.pointerId,path:selectedPath.slice(),pointIndex:pathPointSelection,
    origin:clone(pathCurrent()),startLocal:shape?pathLocalPoint(shape,pagePoint(e)):null,
    originalPoint:{x:pt.x,y:pt.y}};
   paper.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();return;
  }
 }
 if(activeTool==='select'&&e.button===0&&hatchCurrent()){
  const knob=e.target.closest('[data-hatch-control]');if(knob){
   const key=knob.dataset.hatchControl,n=hatchCurrent();
   if(requiresBake(n[key]??0)&&!confirm('This Hatch attribute contains an expression. Replace it with a fixed value in mm/degrees?')){e.preventDefault();return;}
   hatchDrag={pointerId:e.pointerId,path:selectedPath.slice(),origin:clone(n),key};
   paper.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();return;
  }
 }
 if(activeTool==='select'&&e.button===0&&vectorCurrent()){
  const vertex=e.target.closest('[data-vector-vertex]'),edge=e.target.closest('[data-vector-segment]');
  if(vertex){
   const i=Number(vertex.dataset.vectorVertex),node=vectorCurrent();
   if(e.shiftKey){vectorSelection.has(i)?vectorSelection.delete(i):vectorSelection.add(i);renderCanvas();e.preventDefault();e.stopPropagation();return;}
   if(!vectorSelection.has(i))vectorSelection=new Set([i]);
   const indices=[...vectorSelection];if(!approveVectorBake(node,indices)){e.preventDefault();e.stopPropagation();return;}
   const shapeElements=[...paper.querySelectorAll('g[data-path="'+vectorEditPath+'"]')].map(g=>g.querySelector(':scope > polygon, :scope > polyline')).filter(Boolean);
   const shapes=shapeElements.map(element=>({element,points:[...Array(element.points.numberOfItems).keys()].map(j=>({x:element.points.getItem(j).x,y:element.points.getItem(j).y}))}));
   vectorDrag={pointerId:e.pointerId,path:selectedPath.slice(),origin:clone(node),start:pagePoint(e),indices,shapes,activePoints:renderedPolygonPoints(),lastDelta:{dx:0,dy:0},moved:false,targets:snapTargetsFor([selectedPath])};
   renderCanvas(); // show current selected handles; pointer is captured on the stable SVG root
   const current=[...paper.querySelectorAll('g[data-path="'+vectorEditPath+'"]')].map(g=>g.querySelector(':scope > polygon, :scope > polyline')).filter(Boolean);
   vectorDrag.shapes=current.map((element,k)=>({element,points:shapes[k]?.points||[]}));
   paper.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();return;
  }
  if(edge){e.preventDefault();e.stopPropagation();return;}
 }
 if(activeTool==="pen"){
  const hit=e.target.closest('g[data-path]');
  if(hit&&!curveState){
   const hitPath=toPath(hit.dataset.path),hitNode=getAt(hitPath);
   if(hitNode&&hitNode.type===penMode&&['polygon','polyline','path'].includes(penMode)){
    select(hitPath);
    if(penMode==='path'){pathEditPath=nodeKey(hitPath);pathPointSelection=-1;}
    else {vectorEditPath=nodeKey(hitPath);vectorSelection.clear();}
    setActiveTool('select');render();e.preventDefault();e.stopImmediatePropagation();return;
   }
  }
  e.preventDefault();e.stopImmediatePropagation();handlePenPointerDown(e);return;
 }
 if(activeTool!=="select"||e.button!==0)return;
 // render() replaces SVG descendants; stop this event before the outer canvas
 // sees a detached target and incorrectly clears the freshly made selection.
 e.stopPropagation();
 const g=e.target.closest("[data-path]");
 if(!g){const pt=pagePoint(e);marqueeState={pointerId:e.pointerId,start:pt,current:pt};paper.appendChild(svg("rect",{id:"marquee-selection",class:"marquee-selection",x:pt.x,y:pt.y,width:0,height:0,fill:"#6485f526",stroke:"#6485f5","stroke-width":0.55,"stroke-dasharray":"2 1","pointer-events":"none"}));paper.setPointerCapture(e.pointerId);e.preventDefault();return;}
 const path=toPath(g.dataset.path),n=getAt(path),handle=e.target.closest("[data-handle]")?.dataset.handle,key=nodeKey(path);
 if(!n)return;
 // Snapshot painted geometry before select() replaces this SVG subtree;
 // when dragging a repeated child, this is the clicked instance's bounds.
 const visibleBounds=n.type==='image'?transformGeometry(n,path):paintedBounds(g,paper);
 if(isRepeatedPath(path))focusedRepeatInstance={key,instance:Number(g.dataset.instance)||0};
 else focusedRepeatInstance=null;
 if((e.ctrlKey||e.metaKey||e.shiftKey)&&!handle){selectFromTree(path,e);return;}
 const multi=!handle&&selectedPaths.length>1&&selectedPaths.some(p=>nodeKey(p)===key);
 if(!multi)select(path);
 if(n.type==="repeat"&&handle!=="rotate")return;
 if(!draggableTypes.has(n.type)&&n.type!=="repeat")return;
 const parentBox=parentBoxForPath(path),geometry=transformGeometry(n,path);
 const items=(multi?selectedPaths.map(p=>p.slice()):[path.slice()]).map(p=>({path:p,origin:clone(getAt(p)),bounds:transformGeometry(getAt(p),p),parentBox:clone(parentBoxForPath(p)),repeated:isRepeatedPath(p)}));
 const repeatRect=n.type==="repeat"?g.querySelector(':scope > .repeat-selection'):null;
 const repeatBounds=repeatRect?{x:Number(repeatRect.getAttribute('x')),y:Number(repeatRect.getAttribute('y')),w:Number(repeatRect.getAttribute('width')),h:Number(repeatRect.getAttribute('height'))}:null;
 const bounds=repeatBounds||(multi?(unionBounds(items)||geometry):(handle&&!isRepeatedPath(path)?geometry:(visibleBounds||geometry)));if(!bounds)return;
 const point=pagePoint(e),snapTargets=snapTargetsFor(items.map(item=>item.path)),previewTransforms=captureDragTransforms(items.map(item=>item.path));
 drag={pointerId:e.pointerId,path,mode:handle?"transform":"move",handle,modelBounds:geometry,startX:e.clientX,startY:e.clientY,startPoint:point,parentBox:clone(parentBox),bounds,origin:clone(n),items,moved:false,repeated:isRepeatedPath(path),snapTargets,previewTransforms,lastDelta:{dx:0,dy:0},startAngle:Math.atan2(point.y-(bounds.y+bounds.h/2),point.x-(bounds.x+bounds.w/2))*180/Math.PI};
 try{paper.setPointerCapture(e.pointerId);}catch{}e.preventDefault();
});
paper.addEventListener("pointermove",e=>{
 if(pathDrag?.pointerId===e.pointerId){
  const st=pathDrag,n=getAt(st.path),parsed=editablePathNodes(st.origin.d),pt=parsed.nodes[st.pointIndex],shape=pathShape();
  if(!shape)return;
  const local=pathLocalPoint(shape,pagePoint(e));
  const start=st.startLocal||st.originalPoint;
  n.d=replaceSvgPathPoint(st.origin.d,pt,st.originalPoint.x+local.x-start.x,st.originalPoint.y+local.y-start.y);
  renderCanvas();e.preventDefault();return;
 }
 if(hatchDrag?.pointerId===e.pointerId){
  const state=hatchDrag,n=getAt(state.path),box=parentBoxForPath(state.path),params=hatchParameters(n,box),pt=pagePoint(e);
  const x=pt.x-params.cx,y=pt.y-params.cy;
  if(state.key==='angle'){
   let angle=Math.atan2(-y,x)*180/Math.PI;
   if(e.shiftKey)angle=Math.round(angle/15)*15;
   n.angle=Number(angle.toFixed(2));
  }else{const rad=params.angle*Math.PI/180,normal=x*Math.sin(rad)+y*Math.cos(rad);
   if(state.key==='period')n.period=Math.max(.5,Number(Math.abs(normal).toFixed(2)))+'mm';
   if(state.key==='offset')n.offset=Number(normal.toFixed(2))+'mm';
  }
  renderCanvas();e.preventDefault();return;
 }
 if(vectorDrag?.pointerId===e.pointerId){
  const dragState=vectorDrag,now=pagePoint(e),d={dx:now.x-dragState.start.x,dy:now.y-dragState.start.y};
  if(Math.hypot(d.dx,d.dy)<.15&&!dragState.moved)return;
  const anchor=dragState.activePoints[dragState.indices[0]];
  if(anchor&&!e.altKey){const snap=snapToGuides({x:anchor.x+d.dx,y:anchor.y+d.dy,w:0,h:0},[dragState.path],dragState.targets);
   d.dx+=snap.dx;d.dy+=snap.dy;smartGuides=snap.guides;smartGuideSegments=snap.segments;
  }else{clearSmartGuides();}
  dragState.moved=true;dragState.lastDelta=d;
  previewVectorPoints(dragState,d.dx,d.dy);renderSmartGuideOverlay();e.preventDefault();return;
 }
 if(curveState&&activeTool==='pen'){
  updatePenFromPointer(e);
  e.stopImmediatePropagation();return;
 }
 if(marqueeState&&marqueeState.pointerId===e.pointerId){marqueeState.current=pagePoint(e);const a=marqueeState.start,b=marqueeState.current,el=paper.querySelector("#marquee-selection");if(el){el.setAttribute("x",Math.min(a.x,b.x));el.setAttribute("y",Math.min(a.y,b.y));el.setAttribute("width",Math.abs(b.x-a.x));el.setAttribute("height",Math.abs(b.y-a.y));}return;}
 if(!drag||drag.pointerId!==e.pointerId)return;
 if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<3)return;
 drag.moved=true;const point=pagePoint(e);let dx=point.x-drag.startPoint.x,dy=point.y-drag.startPoint.y;
 if(drag.mode==="transform"&&drag.origin.type==="repeat"){
  const b=drag.bounds,angle=Math.atan2(point.y-(b.y+b.h/2),point.x-(b.x+b.w/2))*180/Math.PI-drag.startAngle;
  // Keep pointer capture intact: live-replacing the SVG during the drag
  // fires lostpointercapture and cancels the operation before pointerup.
  const preview=drag.previewTransforms.find(item=>item.element.dataset.path===nodeKey(drag.path));
  if(preview)preview.element.setAttribute('transform',rotationPreviewTransform(angle,b.x+b.w/2,b.y+b.h/2,preview.transform));
  return;
 }
 if(drag.mode==="transform"&&drag.origin.type==="group"){
  // Group children use their own repeat period/count. Do not scale the painted SVG:
  // modify the *container box* and rebuild its layout instead, preserving cell spacing.
  const original=drag.modelBounds||drag.bounds;
  const snap=resizeForGesture(original,drag.handle,dx,dy,e.shiftKey,[drag.path],drag.snapTargets);
  const next=snap.bounds;smartGuides=snap.guides;smartGuideSegments=snap.segments;
  const node=getAt(drag.path),box=drag.parentBox,fmt=value=>Number(value.toFixed(3))+"mm";
  if(!node)return;
  node.x=fmt(next.x-box.x);node.y=fmt(next.y-box.y);
  node.w=fmt(next.w);node.h=fmt(next.h);
  drag.previewBounds=next;
  renderCanvas();renderSmartGuideOverlay();
  updateResizePreviewFields(drag);
  return;
 }
 if(drag.mode==="move"){
  const g=drag.bounds,proposed={x:g.x+dx,y:g.y+dy,w:g.w,h:g.h};
  const snap=snapToGuides(proposed,drag.items.map(item=>item.path),drag.snapTargets);
  dx+=snap.dx;dy+=snap.dy;drag.lastDelta={dx,dy};smartGuides=snap.guides;smartGuideSegments=snap.segments||{x:null,y:null};
  applyDragPreview(drag.previewTransforms,dx,dy);renderSmartGuideOverlay();updateTransformPreview(dx,dy);return;
 }
 replaceAt(drag.path,drag.origin);const n=getAt(drag.path);if(!n)return;
 const base=drag.origin,g=drag.modelBounds||drag.bounds,type=base.type,fmt=v=>Number(v.toFixed(2))+"mm",box=drag.parentBox;
 if(drag.handle==="rotate"){
  // The pointer belongs to the *clicked SVG instance*, not the first repeat
  // cell. Measure both angles around its on-screen center; the template model
  // stores only their difference, which each copy applies around its own center.
  const pivot=drag.bounds;
  const angle=Math.atan2(point.y-(pivot.y+pivot.h/2),point.x-(pivot.x+pivot.w/2))*180/Math.PI;
  if(type==="text")n.rotate=Math.round(((Number(base.rotate)||0)+angle-drag.startAngle)/90)*90;
 }else{
  const h=drag.handle,resize=resizeForGesture(g,h,dx,dy,
    e.shiftKey||['circle','dot'].includes(type),[drag.path],drag.snapTargets);
  const {x:left,y:top,w:width,h:height}=resize.bounds,
    right=left+width,bottom=top+height;
  smartGuides=resize.guides;smartGuideSegments=resize.segments;
  renderSmartGuideOverlay();
  if(type==="circle"||type==="dot"){
   const size=Math.max(1,Math.max(width,height));
   n.r=fmt(size/2);n.cx=fmt(left+size/2-box.x);n.cy=fmt(top+size/2-box.y);
  }else if(type==="ellipse"){n.rx=fmt(Math.max(1,right-left)/2);n.ry=fmt(Math.max(1,bottom-top)/2);n.cx=fmt(left+(right-left)/2-box.x);n.cy=fmt(top+(bottom-top)/2-box.y);
  }else if(type==="line"){
   const src=base,srcX1=evalN(src.x1??0,box,"x"),srcX2=evalN(src.x2??0,box,"x"),srcY1=evalN(src.y1??0,box,"y"),srcY2=evalN(src.y2??0,box,"y"),xs=Math.sign(srcX2-srcX1)||1,ys=Math.sign(srcY2-srcY1)||1,w=right-left,hg=bottom-top;
   n.x1=fmt((xs<0?left+w:left)-box.x);n.x2=fmt((xs<0?left:left+w)-box.x);n.y1=fmt((ys<0?top+hg:top)-box.y);n.y2=fmt((ys<0?top:top+hg)-box.y);
  }else if(type==="hline"){if(!h.includes("n")&&!h.includes("s")){n.x1=fmt(left-box.x);n.x2=fmt(right-box.x);}
  }else if(type==="vline"){if(!h.includes("e")&&!h.includes("w")){n.y1=fmt(top-box.y);n.y2=fmt(bottom-box.y);}
  }else if(["polyline","polygon"].includes(type)){
   const points=Array.isArray(base.points)?base.points.flat(Infinity):String(base.points??"").trim().split(/[\s,]+/).map(Number),out=[];
   const originalLeft=g.x-box.x,originalTop=g.y-box.y,targetLeft=left-box.x,targetTop=top-box.y;
   for(let i=0;i+1<points.length;i+=2){const px=evalN(points[i],box,"x"),py=evalN(points[i+1],box,"y"),nx=g.w>0?targetLeft+(px-originalLeft)*((right-left)/g.w):targetLeft,ny=g.h>0?targetTop+(py-originalTop)*((bottom-top)/g.h):targetTop;out.push([fmt(nx),fmt(ny)]);}n.points=out;
  }else{
   n.x=fmt(left-box.x);n.y=fmt(top-box.y);n.w=fmt(right-left);n.h=fmt(bottom-top);
   if(type==='image')n.fit=imageResizeFit(base.fit,h,e.shiftKey);
  }
 }
 render();
});
function cancelCanvasGesture(e){
 if(pathDrag&&(!e||pathDrag.pointerId===e.pointerId)){replaceAt(pathDrag.path,pathDrag.origin);pathDrag=null;render();}
 if(hatchDrag&&(!e||hatchDrag.pointerId===e.pointerId)){replaceAt(hatchDrag.path,hatchDrag.origin);hatchDrag=null;render();}
 if(vectorDrag&&(!e||vectorDrag.pointerId===e.pointerId)){vectorDrag=null;clearSmartGuides();render();}
 if(marqueeState&&(!e||marqueeState.pointerId===e.pointerId)){marqueeState=null;$("marquee-selection")?.remove();}
 if(drag&&(!e||drag.pointerId===e.pointerId)){const state=drag;drag=null;for(const item of state.items||[])replaceAt(item.path,item.origin);clearSmartGuides();render();}
 if(typeof curveState!=="undefined"&&curveState&&(!e||curveState.pointerId===e.pointerId)){curveState.pointerId=null;renderPenPreview();}
 if(typeof drawState!=="undefined"&&drawState&&(!e||drawState.pointerId===e.pointerId)){drawState=null;renderDrawPreview();}
}
paper.addEventListener("pointerup",e=>{
 if(pathDrag?.pointerId===e.pointerId){
  const state=pathDrag;pathDrag=null;
  if(getAt(state.path)?.d!==state.origin.d)commit(()=>{});else render();
  e.preventDefault();return;
 }
 if(hatchDrag?.pointerId===e.pointerId){
  const state=hatchDrag;hatchDrag=null;
  if(JSON.stringify(getAt(state.path))!==JSON.stringify(state.origin))commit(()=>{});else render();
  e.preventDefault();return;
 }
 if(vectorDrag?.pointerId===e.pointerId){
  const state=vectorDrag;vectorDrag=null;clearSmartGuides();
  if(state.moved){const box=parentBoxForPath(state.path),n=getAt(state.path);
   const {dx,dy}=state.lastDelta;
   commit(()=>{n.points=writeVectorDelta(state.origin,state.indices,dx,dy,box);});
  }else render();
  e.preventDefault();return;
 }
 if(curveState&&curveState.pointerId===e.pointerId){curveState.pointerId=null;e.stopImmediatePropagation();return;}
 if(marqueeState&&marqueeState.pointerId===e.pointerId){
  const state=marqueeState;marqueeState=null;$("marquee-selection")?.remove();const a=state.start,b=state.current,box={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)};
  const hits=new Map();
  if(box.w>=1||box.h>=1){
   for(const element of paper.querySelectorAll("g[data-path]")){
    const path=toPath(element.dataset.path),node=getAt(path);
    if(!node||["group","repeat"].includes(node.type))continue;
    let bounds=null;
    try{const hitbox=element.querySelector(":scope > .svg-hitbox"),b=(hitbox||element).getBBox();bounds={x:b.x,y:b.y,w:b.width,h:b.height};}catch{}
    if(bounds&&bounds.x+bounds.w>=box.x&&bounds.x<=box.x+box.w&&bounds.y+bounds.h>=box.y&&bounds.y<=box.y+box.h)hits.set(nodeKey(path),path);
   }
  }
  selectedPaths=normalizeSelectedPaths([...hits.values()]);
  selectedPath=selectedPaths.at(-1)||null;render();setInspectorTab("properties");return;
 }
 if(!drag||drag.pointerId!==e.pointerId)return;
 const state=drag;drag=null;
 // Groups with dense descendants have been previewed using one SVG transform. Now apply the
 // equivalent geometry change once so repeat layout is recomputed just once on commit.
 if(state.mode==="transform"&&state.origin.type==="repeat"&&state.moved){
  const pt=pagePoint(e),b=state.bounds;
  const endAngle=Math.atan2(pt.y-(b.y+b.h/2),pt.x-(b.x+b.w/2))*180/Math.PI;
  getAt(state.path).rotate=Math.round((Number(state.origin.rotate)||0)+endAngle-state.startAngle);
 }
 if(state.mode==="transform"&&state.origin.type==="group"&&state.moved){
  const endPoint=pagePoint(e),dx=endPoint.x-state.startPoint.x,dy=endPoint.y-state.startPoint.y;
  replaceAt(state.path,state.origin);
  const node=getAt(state.path),g=state.modelBounds||state.bounds,box=state.parentBox,fmt=value=>Number(value.toFixed(2))+"mm";
  if(state.handle==="rotate"){
   const angle=Math.atan2(endPoint.y-(g.y+g.h/2),endPoint.x-(g.x+g.w/2))*180/Math.PI;
   node.rotate=Math.round((Number(state.origin.rotate)||0)+angle-state.startAngle);
  }else{
   const resized=resizeForGesture(g,state.handle,dx,dy,e.shiftKey,[state.path],state.snapTargets).bounds;
   node.x=fmt(resized.x-box.x);node.y=fmt(resized.y-box.y);node.w=fmt(resized.w);node.h=fmt(resized.h);
  }
 }
 // Use the pointerup coordinates too; some browsers coalesce the last pointermove event.
 if(state.mode==="move"&&Math.hypot(e.clientX-state.startX,e.clientY-state.startY)>=3){
  const end=pagePoint(e);let dx=end.x-state.startPoint.x,dy=end.y-state.startPoint.y;
  const bounds=state.bounds,proposed={x:bounds.x+dx,y:bounds.y+dy,w:bounds.w,h:bounds.h};
  const snap=snapToGuides(proposed,state.items.map(item=>item.path),state.snapTargets);
  dx+=snap.dx;dy+=snap.dy;state.lastDelta={dx,dy};state.moved=true;
 }
 clearSmartGuides();
 if(state.moved&&state.mode==="move"){
  const {dx,dy}=state.lastDelta;
  if(Math.abs(dx)+Math.abs(dy)>1e-6){for(const item of state.items)moveBy(getAt(item.path),dx,dy,item.parentBox);commit(()=>{});}
  else render();
 }else if(state.moved)commit(()=>{});
 else render();
});
paper.addEventListener('dblclick',e=>{
 if(!vectorCurrent()||!e.target.closest('[data-vector-segment]'))return;
 const index=Number(e.target.closest('[data-vector-segment]').dataset.vectorSegment),node=vectorCurrent(),box=parentBoxForPath(selectedPath),pairs=readPointPairs(node.points);
 const next=(index+1)%pairs.length,a=pairs[index],b=pairs[next];
 const newPair=midpoint([evalN(a[0],box,'x'),evalN(a[1],box,'y')],[evalN(b[0],box,'x'),evalN(b[1],box,'y')]).map(v=>Number(v.toFixed(3))+'mm');
 commit(()=>{node.points=addPoint(node.points,index+1,newPair);});vectorSelection=new Set([index+1]);render();e.preventDefault();
});
paper.addEventListener("pointercancel",e=>cancelCanvasGesture(e));
paper.addEventListener("lostpointercapture",e=>cancelCanvasGesture(e));
$("openBtn").addEventListener("click",()=>$("fileInput").click());
$("fileInput").addEventListener("change",async e=>{
 const f=e.target.files?.[0];if(!f)return;
 if(dirty&&!confirm('There are unsaved changes. Open another file anyway?')){e.target.value='';return;}
 try{
  const imported=await readTemplate(await f.arrayBuffer());validate(imported.document);
  validateImageAssets(imported.document,imported.assets);
  const sizes=new Map();
  for(const [name,bytes] of imported.assets){
   const image=await createImageBitmap(new Blob([bytes],{type:imageFileType(bytes)}));
   const width=image.width,height=image.height;image.close();
   if(width>PACKAGE_LIMITS.maxPixels||height>PACKAGE_LIMITS.maxPixels)
    throw Error('Image exceeds 8192px: '+name);
   sizes.set(name,{width,height});
  }
  // Do not discard the current document or its images on a failed import.
  replaceDocumentAssets(imported.assets,sizes);doc=imported.document;resetVectorEditors();selectedPath=null;selectedPaths=[];
  setDirty(false);loadLayerColors();resetHistory();previewValues={};initializePreviewValues();syncJson();render();
  document.querySelectorAll('.template-card').forEach(b=>b.classList.remove('active'));
  toast(imported.packaged?'Image template package loaded.':'Template loaded.');setStatus('File opened: '+f.name);
 }catch(err){toast('Could not open: '+err.message);}
 e.target.value='';
});
$('imageFileInput').addEventListener('change',async e=>{
 const file=e.target.files?.[0],isReplace=e.target.dataset.replace==='true';e.target.dataset.replace='';e.target.value='';
 if(!file)return;
 try{
  const selected=isReplace?getAt(selectedPath):null;
  if(isReplace&&selected?.type!=='image')throw Error('Select an image element first');
  await addImageFromFile(file,selected);
 }catch(err){toast('Could not add image: '+err.message);}
});
$('insertImageBtn').addEventListener('click',()=>{$('imageFileInput').click();});
$('canvasAddImage').addEventListener('click',()=>{$('imageFileInput').click();});
document.querySelectorAll(".template-card").forEach(b=>b.addEventListener("click",()=>{const key=b.dataset.template;if(dirty&&!confirm("Descartar alterações não exportadas e abrir este modelo?"))return;replaceDocumentAssets(new Map());doc=clone(samples[key]);resetVectorEditors();selectedPath=null;selectedPaths=[];loadLayerColors();resetHistory();previewValues={};initializePreviewValues();setDirty(false);syncJson();render();document.querySelectorAll(".template-card").forEach(x=>x.classList.toggle("active",x===b));}));
$("paperSize").addEventListener("change",e=>{pageSize=SIZES[e.target.value]||SIZES.a4;wrap.style.aspectRatio=pageSize[0]+"/"+pageSize[1];render();});
$("filePageSize").addEventListener("change",e=>{
 $("paperSize").value=e.target.value;
 $("paperSize").dispatchEvent(new Event("change",{bubbles:true}));
});
const ZOOM_LEVELS=[25,50,75,100,125,150,200,300];
function fitWidth(){const canvas=$("canvasArea"),availableW=Math.max(100,canvas.clientWidth-75),availableH=Math.max(150,canvas.clientHeight-70);return Math.max(100,Math.min(availableW,availableH*pageSize[0]/pageSize[1],500));}
function currentPaperWidth(){return wrap.getBoundingClientRect().width||fitWidth();}
function fitPaper(){const canvas=$("canvasArea"),fit=fitWidth();let w=zoomMode==="fit"?fit:pageSize[0]*2*(Number(zoomMode)/100);wrap.style.width=Math.max(60,w)+"px";$("zoom").value=zoomMode;const actual=zoomMode==="fit"?Math.round(fit/(pageSize[0]*2)*100):Number(zoomMode);$("zoomLabel").textContent=zoomMode==="fit"?"Fit · "+actual+"%":actual+"%";canvas.classList.toggle("zoomed-in",zoomMode!=="fit"&&w>fit+1);}
function setZoom(next,anchor=null){
 const oldWidth=currentPaperWidth(),oldRect=wrap.getBoundingClientRect(),oldPan={...panOffset};
 // The canvas changes from a centered flex layout to top-left alignment when
 // zooming past Fit. Without an anchor, menu/toolbar zoom would jump between
 // the two layout origins, especially when alternating in/out. Zoom around
 // the existing page center by default; pointer-wheel zoom keeps its cursor.
 const reference=anchor||{x:oldRect.left+oldRect.width/2,y:oldRect.top+oldRect.height/2};
 zoomMode=next;fitPaper();
 const newWidth=currentPaperWidth(),newRect=wrap.getBoundingClientRect();
 if(next==="fit"){panOffset.x=0;panOffset.y=0;applyPan();return;}
 if(oldWidth>0){
  panOffset=anchoredPan({pan:oldPan,anchor:reference,oldRect,newRect,scale:newWidth/oldWidth});
  applyPan();
 }
}
function stepZoom(direction,anchor=null){
 // Fit is a viewport-dependent percentage, not 100%. Calculate the real
 // rendered scale before choosing the next step, otherwise Zoom in can shrink
 // the page (or Zoom out can grow it) after selecting Fit.
 const visiblePercent=zoomMode==="fit"?currentPaperWidth()/(pageSize[0]*2)*100:Number(zoomMode);
 const next=nextZoomLevel(visiblePercent,direction,ZOOM_LEVELS);
 setZoom(next,anchor);
}
$("zoom").addEventListener("change",e=>setZoom(e.target.value));$("zoomOut").addEventListener("click",()=>stepZoom(-1));$("zoomIn").addEventListener("click",()=>stepZoom(1));
window.addEventListener("resize",fitPaper);
window.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();$("saveBtn").click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="o"){e.preventDefault();$("openBtn").click();}if(e.key==="Escape")$("addMenu")?.classList.add("hidden");if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();toggleSplit();}});
// Ergonomic editing: transform controls, context menu, canvas navigation, and shortcuts.
function numericMm(value, fallback=0){if(typeof value==="number")return value;const m=String(value??"").trim().match(/^([-+]?(?:\d+(?:\.\d*)?|\.\d+))\s*(mm|cm|in|pt)?$/i);if(!m)return fallback;const n=Number(m[1]);return n*(({cm:10,in:25.4,pt:25.4/72})[(m[2]||"mm").toLowerCase()]||1);}
function transformContext(){return{x:0,y:0,w:pageSize[0],h:pageSize[1],vars:{...previewValues,W:pageSize[0],H:pageSize[1],i:0,j:0}};}
function groupChildBox(n,box){
 const x=evalN(n.x??0,box,"x"),y=evalN(n.y??0,box,"y"),w=evalN(n.w??"100%",box,"x",box.w),h=evalN(n.h??"100%",box,"y",box.h);
 let [top,right,bottom,left]=[0,0,0,0];
 if(n.inset!==undefined){let a=Array.isArray(n.inset)?n.inset:[n.inset];if(a.length===1)a=[a[0],a[0],a[0],a[0]];else if(a.length===2)a=[a[0],a[1],a[0],a[1]];else if(a.length===3)a=[a[0],a[1],a[2],a[1]];[top,right,bottom,left]=[evalN(a[0],box,"y"),evalN(a[1],box,"x"),evalN(a[2],box,"y"),evalN(a[3],box,"x")];}
 return{x:box.x+x+left,y:box.y+y+top,w:Math.max(0,w-left-right),h:Math.max(0,h-top-bottom),i:box.i||0,j:box.j||0,vars:{...(box.vars||previewValues),i:box.i||box.vars?.i||0,j:box.j||box.vars?.j||0}};
}
function repeatChildBox(n,box){
 const axis=n.axis||"y",xy=axis==="xy",onX=axis==="x"||xy,onY=axis==="y"||xy;
 if(axis==="none")return{...box,i:0,j:0,vars:{...(box.vars||previewValues),i:0,j:0}};
 const period=n.period,counts=n.count,fit=n.fit||"repeat",fx=Array.isArray(fit)?fit[0]:fit,fy=Array.isArray(fit)?fit[1]:fit;
 const px=onX?evalN(Array.isArray(period)?period[0]:period,box,"x",null):null;
 const py=onY?evalN(xy&&Array.isArray(period)?period[1]:period,box,"y",null):null;
 const cx=onX?evalN(Array.isArray(counts)?counts[0]:counts,box,"plain",null):null;
 const cy=onY?evalN(xy&&Array.isArray(counts)?counts[1]:counts,box,"plain",null):null;
 const xs=onX?repeatPositions(box.x,box.w,px,cx,fx,500):[{index:0,pos:box.x,size:box.w}];
 const ys=onY?repeatPositions(box.y,box.h,py,cy,fy,700):[{index:0,pos:box.y,size:box.h}];
 const rx=xs[0]||{index:0,pos:box.x,size:box.w},ry=ys[0]||{index:0,pos:box.y,size:box.h};
 const i=axis==="y"?ry.index:rx.index,j=xy?ry.index:0;
 return{x:onX?rx.pos:box.x,y:onY?ry.pos:box.y,w:onX?rx.size:box.w,h:onY?ry.size:box.h,i,j,vars:{...(box.vars||previewValues),i,j}};
}
function parentBoxForPath(path){
 let box=transformContext();if(!path)return box;
 for(let i=0;i<path.length-2;i+=2){
  const ancestor=getAt(path.slice(0,i+2));
  if(ancestor?.type==="group")box=groupChildBox(ancestor,box);
  else if(ancestor?.type==="repeat")box=repeatChildBox(ancestor,box);
 }
 return box;
}
function insertionContext(){
 const selected=getAt(selectedPath);
 if(selected&&["group","repeat"].includes(selected.type)){
  const parentBox=parentBoxForPath(selectedPath);
  return{parent:selected,parentPath:selectedPath.slice(),box:selected.type==="group"?groupChildBox(selected,parentBox):repeatChildBox(selected,parentBox)};
 }
 if(selectedPath?.length>=4){
  const parentPath=selectedPath.slice(0,-2),parent=getAt(parentPath);
  if(parent&&["group","repeat"].includes(parent.type)){
   const parentBox=parentBoxForPath(parentPath);
   return{parent,parentPath,box:parent.type==="group"?groupChildBox(parent,parentBox):repeatChildBox(parent,parentBox)};
  }
 }
 return{parent:null,parentPath:null,box:transformContext()};
}
function transformGeometry(n,path=selectedPath){
 const box=parentBoxForPath(path),type=n.type;
 if(type==="repeat")return null;
 const b=selectionBounds(n,box);
 if(type==="hline"){
  const x1=evalN(n.x1??0,box,"x"),x2=evalN(n.x2??"100%",box,"x");
  return{x:box.x+Math.min(x1,x2),y:box.y+evalN(n.y??0,box,"y"),w:Math.abs(x2-x1),h:0.6};
 }
 if(type==="vline"){
  const y1=evalN(n.y1??0,box,"y"),y2=evalN(n.y2??"100%",box,"y");
  return{x:box.x+evalN(n.x??0,box,"x"),y:box.y+Math.min(y1,y2),w:0.6,h:Math.abs(y2-y1)};
 }
 return b;
}
function transformRead(){
 const n=getAt(selectedPath),panel=document.querySelector(".transform-panel"),note=$("transformNote");
 const supported=!!n&&["image","group","rect","text","path","ellipse","circle","dot","line","hline","vline","polyline","polygon"].includes(n.type);
 panel.classList.toggle("hidden",!supported);
 if(!supported)return;
 const g=transformGeometry(n),type=n.type;
 const values={transformX:g.x,transformY:g.y,transformW:g.w,transformH:g.h,transformRotate:Number(n.rotate)||0,transformOpacity:Math.round((n.opacity===undefined?1:Number(n.opacity))*100)};
 const disabled={transformW:["text","vline"].includes(type),transformH:["text","hline"].includes(type),transformRotate:type!=="text"};
 const rotationControls=$("transformRotate").closest("label");
 if(rotationControls)rotationControls.classList.toggle("hidden",type!=="text");
 if(type==="circle"||type==="dot")values.transformH=values.transformW;
 const rotationWheel=$("rotationWheel");
 if(rotationWheel){rotationWheel.disabled=type!=="text";rotationWheel.style.setProperty("--rotation-angle",normalizeDialAngle(values.transformRotate)+"deg");rotationWheel.setAttribute("aria-valuenow",String(normalizeDialAngle(values.transformRotate)));}
 $("transformOpacityValue").textContent=values.transformOpacity+"%";$("elementOpacityValue").textContent=values.transformOpacity+"%";
 for(const [id,v] of Object.entries(values)){const el=$(id);el.disabled=!!disabled[id];if(document.activeElement!==el)el.value=Number.isFinite(v)?Number(v.toFixed(2)):"";const slider=el.parentElement?.querySelector(".number-scrubber");if(slider&&document.activeElement!==slider)slider.value=Number.isFinite(v)?Math.max(Number(slider.min),Math.min(Number(slider.max),v)):0;}
 const repeated=selectedPath.some((part,i)=>part==="children"&&getAt(selectedPath.slice(0,i))?.type==="repeat");
 if(note)note.textContent=repeated?"Dentro de uma repetição: X/Y representam a primeira ocorrência; mudanças na geometria afetam todas as cópias.":"X/Y indicam a caixa do elemento na página. Elementos aninhados mantêm seu contexto de grupo.";
}
function moveBy(n,dx,dy,box=parentBoxForPath(selectedPath)){
 const type=n.type;
 if(["circle","ellipse","dot"].includes(type)){n.cx=(evalN(n.cx??0,box,"x")+dx)+"mm";n.cy=(evalN(n.cy??0,box,"y")+dy)+"mm";}
 else if(type==="line"){n.x1=(evalN(n.x1??0,box,"x")+dx)+"mm";n.x2=(evalN(n.x2??0,box,"x")+dx)+"mm";n.y1=(evalN(n.y1??0,box,"y")+dy)+"mm";n.y2=(evalN(n.y2??0,box,"y")+dy)+"mm";}
 else if(type==="hline"){n.x1=(evalN(n.x1??0,box,"x")+dx)+"mm";n.x2=(evalN(n.x2??"100%",box,"x")+dx)+"mm";n.y=(evalN(n.y??0,box,"y")+dy)+"mm";}
 else if(type==="vline"){n.x=(evalN(n.x??0,box,"x")+dx)+"mm";n.y1=(evalN(n.y1??0,box,"y")+dy)+"mm";n.y2=(evalN(n.y2??"100%",box,"y")+dy)+"mm";}
 else if(["polyline","polygon"].includes(type)){const points=Array.isArray(n.points)?n.points.flat(Infinity):String(n.points??"").trim().split(/[\s,]+/).map(Number);const moved=[];for(let i=0;i+1<points.length;i+=2)moved.push([(evalN(points[i],box,"x")+dx)+"mm",(evalN(points[i+1],box,"y")+dy)+"mm"]);n.points=moved;}
 else{n.x=(evalN(n.x??0,box,"x")+dx)+"mm";n.y=(evalN(n.y??0,box,"y")+dy)+"mm";}
}
function arrangeSelection(action){
 if(selectedPaths.length<2)return;
 const items=selectedPaths.map(path=>({path,bounds:transformGeometry(getAt(path),path)}));
 if(items.some(item=>!item.bounds)){toast("A seleção contém elementos que não podem ser organizados visualmente.");return;}
 const deltas=arrangeBounds(items,action);if(!deltas)return;
 commit(()=>{for(const item of items){const delta=deltas.get(nodeKey(item.path));if(delta&&(delta.dx||delta.dy))moveBy(getAt(item.path),delta.dx,delta.dy,parentBoxForPath(item.path));}});
}
document.querySelectorAll("[data-arrange-selection]").forEach(button=>button.addEventListener("click",()=>arrangeSelection(button.dataset.arrangeSelection)));

function applyTransformChange(n,key,value){
 const g=transformGeometry(n),type=n.type,box=parentBoxForPath(selectedPath),v=Number(value);
 if(key==="rotate"){if(type==="text")n.rotate=Math.round(v/90)*90;return;}
 if(key==="opacity"){n.opacity=Math.max(0,Math.min(1,v/100));return;}
 if(key==="x"||key==="y"){moveBy(n,key==="x"?v-g.x:0,key==="y"?v-g.y:0,box);return;}
 if(key==="w"||key==="h"){
  if(type==="text")return;
  if(type==="circle"||type==="dot"){
   const size=Math.max(1,v),left=g.x-box.x,top=g.y-box.y,diam=size;
   n.r=(diam/2)+"mm";n.cx=(left+diam/2)+"mm";n.cy=(top+diam/2)+"mm";return;
  }
  if(type==="ellipse"){
   if(key==="w"){n.rx=(Math.max(1,v)/2)+"mm";n.cx=(g.x-box.x+Math.max(1,v)/2)+"mm";}
   else{n.ry=(Math.max(1,v)/2)+"mm";n.cy=(g.y-box.y+Math.max(1,v)/2)+"mm";}return;
  }
  if(type==="line"){
   const x1=evalN(n.x1??0,box,"x"),x2=evalN(n.x2??0,box,"x"),y1=evalN(n.y1??0,box,"y"),y2=evalN(n.y2??0,box,"y");
   const sx=Math.sign(x2-x1)||1,sy=Math.sign(y2-y1)||1,left=g.x-box.x,top=g.y-box.y;
   if(key==="w"){n.x1=(sx<0?left+Math.max(1,v):left)+"mm";n.x2=(sx<0?left:left+Math.max(1,v))+"mm";}
   else{n.y1=(sy<0?top+Math.max(1,v):top)+"mm";n.y2=(sy<0?top:top+Math.max(1,v))+"mm";}return;
  }
  if(type==="hline"){if(key==="w"){const x1=evalN(n.x1??0,box,"x"),x2=evalN(n.x2??"100%",box,"x"),left=Math.min(x1,x2);n.x1=left+"mm";n.x2=(left+Math.max(1,v))+"mm";}return;}
  if(type==="vline"){if(key==="h"){const y1=evalN(n.y1??0,box,"y"),y2=evalN(n.y2??"100%",box,"y"),top=Math.min(y1,y2);n.y1=top+"mm";n.y2=(top+Math.max(1,v))+"mm";}return;}
  if(["polyline","polygon"].includes(type)){const points=Array.isArray(n.points)?n.points.flat(Infinity):String(n.points??"").trim().split(/[\s,]+/).map(Number),oldSize=key==="w"?g.w:g.h,newSize=Math.max(1,v),scale=oldSize>0?newSize/oldSize:1,base=key==="w"?g.x-box.x:g.y-box.y,out=[];for(let i=0;i+1<points.length;i+=2){const px=evalN(points[i],box,"x"),py=evalN(points[i+1],box,"y");out.push([key==="w"?base+(px-(g.x-box.x))*scale+"mm":px+"mm",key==="h"?base+(py-(g.y-box.y))*scale+"mm":py+"mm"]);}n.points=out;return;}
  n[key]=Math.max(1,v)+"mm";
 }
}
Object.entries({transformX:"x",transformY:"y",transformW:"w",transformH:"h",transformRotate:"rotate",transformOpacity:"opacity"}).forEach(([id,key])=>{
 const input=$(id);input.addEventListener("change",e=>{const n=getAt(selectedPath);if(!n||e.target.disabled)return;const v=Number(e.target.value);if(!Number.isFinite(v))return;commit(()=>applyTransformChange(n,key,v));});
 if(key==="opacity")input.addEventListener("input",e=>{const n=getAt(selectedPath);if(!n||e.target.disabled)return;n.opacity=Math.max(0,Math.min(1,Number(e.target.value)/100));$("transformOpacityValue").textContent=e.target.value+"%";renderCanvas();});
});
// Compact Adobe-style rotation wheel. Keep exact numeric input for fine tuning.
const rotationWheel=$("rotationWheel");
if(rotationWheel){
 let wheelGesture=null;
 const previewAngle=angle=>{
  const node=getAt(selectedPath);
  if(!node||node.type!=="text")return;
  node.rotate=Math.round(angle/90)*90;$("transformRotate").value=String(angle);
  rotationWheel.style.setProperty("--rotation-angle",normalizeDialAngle(angle)+"deg");
  rotationWheel.setAttribute("aria-valuenow",String(normalizeDialAngle(angle)));
  renderCanvas();
 };
 rotationWheel.addEventListener("pointerdown",e=>{
  if(e.button!==0||getAt(selectedPath)?.type!=="text")return;
  wheelGesture={id:e.pointerId,origin:Number(getAt(selectedPath).rotate)||0};
  rotationWheel.setPointerCapture(e.pointerId);e.preventDefault();
 });
 rotationWheel.addEventListener("pointermove",e=>{
  if(!wheelGesture||wheelGesture.id!==e.pointerId)return;
  const rect=rotationWheel.getBoundingClientRect();
  const angle=rotationFromPointer(e.clientX,e.clientY,rect.x+rect.width/2,rect.y+rect.height/2,e.shiftKey?0.1:1);
  if(angle!==null)previewAngle(angle);
 });
 rotationWheel.addEventListener("pointerup",e=>{
  if(!wheelGesture||wheelGesture.id!==e.pointerId)return;
  wheelGesture=null;commit(()=>{});
 });
 rotationWheel.addEventListener("pointercancel",e=>{
  if(!wheelGesture||wheelGesture.id!==e.pointerId)return;
  previewAngle(wheelGesture.origin);wheelGesture=null;renderCanvas();
 });
 rotationWheel.addEventListener("keydown",e=>{
  if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home"].includes(e.key))return;
  const node=getAt(selectedPath);if(node?.type!=="text")return;
  e.preventDefault();
  const step=e.shiftKey?0.1:1;
  const next=e.key==="Home"?0:Number((Number(node.rotate||0)+(e.key==="ArrowLeft"||e.key==="ArrowDown"?-step:step)).toFixed(2));
  commit(()=>applyTransformChange(node,"rotate",next));
 });
 $("transformRotate").addEventListener("input",()=>{
  const value=Number($("transformRotate").value);
  if(Number.isFinite(value)){
   rotationWheel.style.setProperty("--rotation-angle",normalizeDialAngle(value)+"deg");
   rotationWheel.setAttribute("aria-valuenow",String(normalizeDialAngle(value)));
  }
 });
}
document.querySelectorAll("[data-rotation-preset]").forEach(button=>button.addEventListener("click",()=>{
 const node=getAt(selectedPath);if(node?.type!=="text")return;
 const value=Number(button.dataset.rotationPreset);
 commit(()=>applyTransformChange(node,"rotate",value));
}));
// Photoshop-style scrubby fields: drag the label horizontally to adjust the value in place.
// Geometry is not limited to the paper dimensions: elements can be edited
// outside the page. Only intrinsically bounded fields are clamped.
const scrubConfig={transformX:{step:.1},transformY:{step:.1},transformW:{step:.1,min:0},transformH:{step:.1,min:0},transformRotate:{step:1,min:-360,max:360},transformOpacity:{step:1,min:0,max:100}};
for(const [id,cfg] of Object.entries(scrubConfig)){
 const input=$(id),label=input.closest("label");if(!input||!label)continue;
 label.classList.add("scrubby-field");label.title="Drag the label to adjust · Shift = fine control · Ctrl = fast";
 let state=null;
 label.addEventListener("pointerdown",e=>{
  if(e.button!==0||e.target===input||input.disabled||e.target.closest("button,input,select,textarea"))return;
  const n=getAt(selectedPath);if(!n)return;
  state={pointerId:e.pointerId,startX:e.clientX,startValue:Number(input.value)||0,origin:clone(n),path:selectedPath.slice(),fine:e.shiftKey,fast:e.ctrlKey||e.metaKey,moved:false};
  label.classList.add("scrubbing");label.setPointerCapture(e.pointerId);e.preventDefault();
 });
 label.addEventListener("pointermove",e=>{
  if(!state||state.pointerId!==e.pointerId)return;
  const delta=e.clientX-state.startX;if(Math.abs(delta)<1&&!state.moved)return;state.moved=true;
  const factor=e.shiftKey?0.1:(e.ctrlKey||e.metaKey)?10:1,raw=state.startValue+delta*cfg.step*factor,value=Math.max(cfg.min??-Infinity,Math.min(cfg.max??Infinity,raw)),n=getAt(state.path);
  if(!n)return;Object.assign(n,clone(state.origin));applyTransformChange(n,Object.entries({transformX:"x",transformY:"y",transformW:"w",transformH:"h",transformRotate:"rotate",transformOpacity:"opacity"}).find(([k])=>k===id)[1],value);
  input.value=Number(value.toFixed(2));renderCanvas();
 });
 const finish=e=>{if(!state||state.pointerId!==e.pointerId)return;const changed=state.moved;state=null;label.classList.remove("scrubbing");if(changed)commit(()=>{});};
 label.addEventListener("pointerup",finish);label.addEventListener("pointercancel",finish);label.addEventListener("lostpointercapture",finish);
}

const originalRenderInspector=renderInspector;
renderInspector=function(){originalRenderInspector();transformRead();};
let contextPoint=null;
let confirmationResolver=null;
function requestConfirmation(title,message,actionLabel="Confirm"){
 return new Promise(resolve=>{
  if(confirmationResolver){const previous=confirmationResolver;confirmationResolver=null;previous(false);}
  $("confirmTitle").textContent=title;$("confirmMessage").textContent=message;$("acceptConfirmBtn").textContent=actionLabel;
  confirmationResolver=resolve;$("confirmModal").classList.remove("hidden");$("acceptConfirmBtn").focus();
 });
}
function closeConfirmation(answer){
 $("confirmModal").classList.add("hidden");const resolve=confirmationResolver;confirmationResolver=null;if(resolve)resolve(!!answer);
}
$("acceptConfirmBtn").addEventListener("click",()=>closeConfirmation(true));$("cancelConfirmBtn").addEventListener("click",()=>closeConfirmation(false));
$("confirmModal").querySelectorAll('[data-close-modal="confirmModal"]').forEach(button=>button.addEventListener("click",()=>closeConfirmation(false)));
function closeModal(id){
 $(id)?.classList.add("hidden");
 if(id==="filePropertiesModal"&&selectedPath?.[0]==="__page__"){
  placeDocumentFields(true);setInspectorTab("properties");renderInspector();
 }
}
document.querySelectorAll("[data-close-modal]").forEach(button=>button.addEventListener("click",()=>closeModal(button.dataset.closeModal)));
document.querySelectorAll(".modal-backdrop").forEach(backdrop=>backdrop.addEventListener("pointerdown",e=>{if(e.target===backdrop){if(backdrop.id==="confirmModal")closeConfirmation(false);else closeModal(backdrop.id);}}));
function positionContextSubmenu(){
 const menu=$("contextMenu"),trigger=menu.querySelector(".context-new-trigger"),submenu=menu.querySelector(".context-submenu");if(!trigger||!submenu)return;
 const a=trigger.getBoundingClientRect();submenu.style.left="0px";submenu.style.top="0px";const b=submenu.getBoundingClientRect(),gap=3;
 const left=a.right+b.width<innerWidth-8?a.right-gap:a.left-b.width+gap;
 submenu.style.left=Math.max(8,Math.min(left,innerWidth-b.width-8))+"px";submenu.style.top=Math.max(8,Math.min(a.top,innerHeight-b.height-8))+"px";
}
function openStructureAddMenu(){
 const b=$("addElement"),r=b.getBoundingClientRect();
 prepareContextMenu({preventDefault(){},clientX:r.left,clientY:r.bottom+4},null,false,null);
 const menu=$("contextMenu");menu.classList.add("show-new-submenu","structure-add-only");positionContextSubmenu();menu.querySelector(".context-new-trigger")?.focus();
}
function getClipboardDestination(){
 const n=getAt(selectedPath);
 if(n&&["group","repeat"].includes(n.type)){
  n.children||(n.children=[]);return{array:n.children,parentPath:selectedPath.slice(),index:n.children.length};
 }
 if(n?.type==="page"||!selectedPath){doc.items||(doc.items=[]);return{array:doc.items,parentPath:["items"],index:doc.items.length};}
 const parentPath=selectedPath.slice(0,-1),array=getAt(parentPath),index=selectedPath.at(-1);
 if(Array.isArray(array))return{array,parentPath,index:index+1};
 doc.items||(doc.items=[]);return{array:doc.items,parentPath:["items"],index:doc.items.length};
}
function copySelection(cut=false){
 if(!selectedPaths.length){toast("Select at least one element first.");return;}
 const safePaths=normalizeSelectedPaths(selectedPaths);
 const nodes=safePaths.map(path=>getAt(path)).filter(Boolean);
 if(!nodes.length||nodes.some(node=>node.type==="page")){toast("The Page cannot be copied.");return;}
 clipboardNodes=nodes.map(clone);
 if(cut){
  const paths=safePaths.map(path=>path.slice()).sort((a,b)=>{const pa=nodeKey(a.slice(0,-1)),pb=nodeKey(b.slice(0,-1));return pa===pb?b.at(-1)-a.at(-1):b.length-a.length;});
  for(const path of paths){const arr=getAt(path.slice(0,-1)),index=path.at(-1);if(Array.isArray(arr)&&index>=0&&index<arr.length)arr.splice(index,1);}
  selectedPath=null;selectedPaths=[];commit(()=>{});toast("Elements cut. Select a destination and press Ctrl+V.");
 }else toast(nodes.length+" element"+(nodes.length===1?"":"s")+" copied.");
}
function pasteSelection(){
 if(!clipboardNodes.length){toast("Clipboard is empty. Copy or cut an element first.");return;}
 const dest=getClipboardDestination(),copies=clipboardNodes.map(clone),index=Math.max(0,Math.min(dest.index,dest.array.length));dest.array.splice(index,0,...copies);
 const paths=copies.map((node,i)=>findNodePath(node)).filter(Boolean);selectedPaths=paths;selectedPath=paths.at(-1)||null;
 commit(()=>{});setInspectorTab("properties");toast(copies.length+" element"+(copies.length===1?"":"s")+" pasted.");
}
function moveSelectedLayer(direction){
 const paths=normalizeSelectedPaths(selectedPaths).filter(path=>path?.[0]!=="__page__");
 if(!paths.length)return;
 const markers=snapshotLayerMarkers();
 const moved=nudgeSiblingNodes(doc,paths,direction);
 if(moved===null){toast("Select layers in the same group to reorder them. Drag layers between groups.");return;}
 if(!moved.length)return;
 restoreLayerMarkers(markers);
 selectedPaths=moved;selectedPath=moved.at(-1);commit(()=>{});
}
function renderQuickProperties(){
 const root=$("quickProperties");if(!root)return;root.replaceChildren();
 if(!selectedPaths.length){const empty=document.createElement("span");empty.className="quick-properties-empty";empty.textContent="Quick properties";root.appendChild(empty);return;}
 const node=getAt(selectedPath);if(!node||node.type==="page"){const label=document.createElement("span");label.className="quick-properties-label";label.textContent="PAGE";root.appendChild(label);const info=document.createElement("span");info.textContent=pageSize[0]+" × "+pageSize[1]+" mm";root.appendChild(info);return;}
 const multi=selectedPaths.length>1,g=multi?null:transformGeometry(node,selectedPath),geometryKeys=g?["x","y","w","h"].filter(key=>!(node.type==="text"&&["w","h"].includes(key))&&!(node.type==="hline"&&key==="h")&&!(node.type==="vline"&&key==="w")):[];
 const shared=multi?sharedEditableProperties(selectedPaths.map(path=>getAt(path)).filter(Boolean)):[];
 const fields=multi?(shared.includes("opacity")?[{key:"opacity",label:"Opacity",range:true}]:[]):[...geometryKeys.map(key=>({key,label:key.toUpperCase()})),...(node.type==="text"?[{key:"rotate",label:"Rotation"}]:[]),{key:"opacity",label:"Opacity",range:true}];
 const type=document.createElement("span");type.className="quick-properties-label";type.textContent=multi?selectedPaths.length+" selected":String(node.type||"element").toUpperCase();root.appendChild(type);
 for(const f of fields){const lab=document.createElement("label");lab.className="quick-property";lab.title=f.label;lab.append(document.createTextNode(f.label));const input=document.createElement("input");input.type=f.range?"range":"number";if(f.range){input.min="0";input.max="100";input.step="1";}else input.step="0.1";
  let value;if(f.key==="opacity")value=Number(node.opacity??1)*100;else if(f.key==="rotate")value=Number(node.rotate??0);else value=g?.[f.key];
  input.value=Number.isFinite(value)?String(Number(value.toFixed(2))):"";if(multi)input.disabled=f.key!=="opacity";
  let rangeValue=null;if(f.key==="opacity"){rangeValue=document.createElement("span");rangeValue.className="range-value";rangeValue.textContent=Math.round(value)+"%";}
  if(f.key==="opacity")input.addEventListener("input",()=>{const v=Number(input.value)/100;if(rangeValue)rangeValue.textContent=Math.round(v*100)+"%";for(const path of (multi?selectedPaths:[selectedPath])){const n=getAt(path);if(n)n.opacity=Math.max(0,Math.min(1,v));}renderCanvas();});
  input.addEventListener("change",()=>{const v=Number(input.value);if(!Number.isFinite(v))return;commit(()=>{if(f.key==="opacity"){for(const path of (multi?selectedPaths:[selectedPath])){const n=getAt(path);if(n)n.opacity=Math.max(0,Math.min(1,v/100));}}else{const n=getAt(selectedPath);if(n)applyTransformChange(n,f.key,v);}});});
  lab.appendChild(input);if(rangeValue)lab.appendChild(rangeValue);root.appendChild(lab);
 }
 refreshVariableSuggestions();
}
function buildFileMenuExamples(){
 const root=$("fileMenuExamples"),select=$("topExample");if(!root||!select)return;root.replaceChildren();
 [...select.options].filter(option=>option.value).forEach(option=>{const button=document.createElement("button");button.type="button";button.role="menuitem";button.className="file-menu-example";button.dataset.example=option.value;button.textContent=option.textContent;button.addEventListener("click",()=>{closeFileMenu();loadOfficialExample(option.value,null);});root.appendChild(button);});
}
function closeFileMenu(){
 document.querySelectorAll(".app-menu-wrap").forEach(wrap=>{
  wrap.querySelector(".app-menu")?.classList.add("hidden");
  wrap.querySelector(".app-menu-trigger")?.setAttribute("aria-expanded","false");
 });
}
function updateMenuAvailability(){
 const states={
  undo:history.canUndo,redo:history.canRedo,
  copy:!!selectedPaths.length&&selectedPath?.[0]!=="__page__",
  cut:!!selectedPaths.length&&selectedPath?.[0]!=="__page__",
  paste:clipboardNodes.length>0,
  duplicate:!!selectedPaths.length&&selectedPath?.[0]!=="__page__",
  group:selectedPaths.length>=2,
  delete:!!selectedPaths.length&&selectedPath?.[0]!=="__page__"
 };
 for(const [action,enabled] of Object.entries(states)){
  const button=document.querySelector('#editMenu [data-menu-action="'+action+'"]');
  if(button)button.disabled=!enabled;
 }
}
function openApplicationMenu(trigger){
 const menu=$(trigger.dataset.menu),opening=menu?.classList.contains("hidden");
 closeFileMenu();
 if(!opening||!menu)return;
 menu.classList.remove("hidden");trigger.setAttribute("aria-expanded","true");
 updateMenuAvailability();
 if(menu.id==="insertMenu")buildFileMenuExamples();
}
const menuTriggers=[...document.querySelectorAll(".app-menu-trigger")];
menuTriggers.forEach((trigger,index)=>{
 trigger.addEventListener("click",e=>{e.stopPropagation();openApplicationMenu(trigger);});
 trigger.addEventListener("keydown",e=>{
  if(e.key==="ArrowDown"||e.key==="Enter"||e.key===" "){
   e.preventDefault();if(trigger.getAttribute("aria-expanded")!=="true")openApplicationMenu(trigger);
   $(trigger.dataset.menu)?.querySelector('button:not([disabled]),summary,select')?.focus();
  }else if(e.key==="ArrowRight"||e.key==="ArrowLeft"){
   e.preventDefault();const next=menuTriggers[(index+(e.key==="ArrowRight"?1:-1)+menuTriggers.length)%menuTriggers.length];openApplicationMenu(next);next.focus();
  }else if(e.key==="Escape"){e.preventDefault();closeFileMenu();trigger.focus();}
 });
 trigger.closest(".app-menu-wrap").querySelector(".app-menu").addEventListener("keydown",e=>{
  if(["ArrowDown","ArrowUp","Home","End"].includes(e.key)){
   const choices=[...e.currentTarget.querySelectorAll('button:not([disabled]),summary,select')].filter(el=>el.getClientRects().length>0);
   if(choices.length){
    e.preventDefault();const index=choices.indexOf(document.activeElement);
    const next=e.key==="Home"?0:e.key==="End"?choices.length-1:(index+(e.key==="ArrowDown"?1:-1)+choices.length)%choices.length;
    choices[next].focus();
   }
  }
  if(e.key==="Escape"){e.preventDefault();closeFileMenu();trigger.focus();}
  if(e.key==="ArrowRight"||e.key==="ArrowLeft"){
   e.preventDefault();const next=menuTriggers[(index+(e.key==="ArrowRight"?1:-1)+menuTriggers.length)%menuTriggers.length];openApplicationMenu(next);next.focus();
  }
 });
});
document.addEventListener("pointerdown",e=>{if(!e.target.closest("#appMenubar"))closeFileMenu();});
document.querySelectorAll(".app-menu").forEach(menu=>menu.addEventListener("click",e=>{
 if(e.target.closest("button"))closeFileMenu();
}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeFileMenu();});
document.querySelectorAll('[data-menu-action]').forEach(button=>button.addEventListener("click",()=>{
 const action=button.dataset.menuAction;closeFileMenu();
 switch(action){
  case "undo":undo();break;
  case "redo":redo();break;
  case "copy":copySelection(false);break;
  case "cut":copySelection(true);break;
  case "paste":pasteSelection();break;
  case "duplicate":$("duplicateElement").click();break;
  case "group":groupSelection();break;
  case "delete":$("deleteElement").click();break;
  case "split":toggleSplit();break;
  case "fit":setZoom("fit");break;
  case "zoom-in":$("zoomIn").click();break;
  case "zoom-out":$("zoomOut").click();break;
  case "properties":setInspectorTab("properties");break;
  case "variables":setInspectorTab("params");break;
  case "insert-element":openStructureAddMenu();break;
  case "insert-rect":addNodeAtContext("rect",null);break;
  case "insert-text":addNodeAtContext("text",null);break;
  case "insert-group":addNodeAtContext("group",null);break;
  case "insert-repeat":addNodeAtContext("repeat",null);break;
  case "add-variable":$("addParam").click();break;
  case "export":$("saveBtn").click();break;
 }
}));
const magneticGuidesToggle=$("magneticGuidesToggle");
magneticGuidesToggle.checked=magneticGuidesEnabled;
magneticGuidesToggle.addEventListener('change',()=>{
 magneticGuidesEnabled=magneticGuidesToggle.checked;
 try{localStorage.setItem('xtemplate-magnetic-guides',String(magneticGuidesEnabled));}catch{}
 if(!magneticGuidesEnabled){clearSmartGuides();renderSmartGuideOverlay();}
});
const themeSelect=$("themeSelect");
const THEMES=new Set(["graphite","dusk","midnight"]);
function applyEditorTheme(value){
 const theme=THEMES.has(value)?value:"graphite";
 document.documentElement.dataset.theme=theme;
 themeSelect.value=theme;
 try{localStorage.setItem("xtemplate-theme",theme);}catch{}
}
let savedEditorTheme="graphite";
try{savedEditorTheme=localStorage.getItem("xtemplate-theme")||"graphite";}catch{}
applyEditorTheme(savedEditorTheme);
themeSelect.addEventListener("change",()=>applyEditorTheme(themeSelect.value));
$("fileInfoBtn").addEventListener("click",()=>{closeFileMenu();showFilePropertiesDialog();});
$("openBtn").addEventListener("click",()=>{closeFileMenu();$("fileInput").click();});
$("newBtn").addEventListener("click",async()=>{
 closeFileMenu();if(dirty&&!await requestConfirmation("Discard unsaved changes?","Create a new template and discard the current unsaved changes?","Continue"))return;
 const form=$("newTemplateForm");form.reset();$("newTemplateName").value="Untitled template";$("newTemplateId").value="";$("newTemplatePaper").value=$("paperSize").value||"a4";$("newTemplateModal").classList.remove("hidden");$("newTemplateName").focus();
});
$("newTemplateForm").addEventListener("submit",e=>{
 e.preventDefault();const name=$("newTemplateName").value.trim()||"Untitled template";
 const idRaw=$("newTemplateId").value.trim(),id=idRaw||("xtemplate.custom."+name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").replace(/-$/,""));
 const size=$("newTemplatePaper").value||"a4";
 replaceDocumentAssets(new Map());doc=createBlankTemplate({
  kind:$("newTemplateKind").value,
  id,name,description:$("newTemplateDescription").value.trim(),
  author:$("newTemplateAuthor").value.trim(),
  license:$("newTemplateLicense")?.value.trim()||"",
  version:$("newTemplateVersion")?.value.trim()||"",
  tags:($("newTemplateTags")?.value||"").split(",").map(v=>v.trim()).filter(Boolean)
 });
 pageSize=SIZES[size]||SIZES.a4;$("paperSize").value=size;wrap.style.aspectRatio=pageSize[0]+"/"+pageSize[1];$("inkColor").value=$("quickInkColor").value=$("newTemplateInk").value;$("accentColor").value=$("quickAccentColor").value=$("newTemplateAccent").value;
 resetVectorEditors();selectedPath=["__page__"];selectedPaths=[selectedPath.slice()];previewValues={};resetLayerColors();saveLayerColors();resetHistory();initializePreviewValues();setDirty(true);syncJson();render();setInspectorTab("properties");closeModal("newTemplateModal");toast("New template created.");
});
function prepareExport(){
 try{const current=JSON.parse(jsonEditor.value);validate(current);doc=current;}catch(error){setValidation("error","JSON inválido");toast("Correct the JSON errors before exporting: "+error.message);return;}
 const root=$("exportSummary");root.replaceChildren();const data=[["Name",doc.name||"Untitled"],["Kind",doc.kind==='cover'?'Cover':'Page'],["ID",doc.id||"—"],["Description",doc.description||"—"],["Author",doc.author||"—"],["License",doc.license||"—"],["Version",doc.version||"—"],["Tags",(doc.tags||[]).join(", ")||"—"],["Structure",countNodes(doc.items||[])+" elements"],["Variables",Object.keys(doc.params||{}).length]];
 const sources=[...validateImageAssets(doc,documentAssets)];if(sources.length)data.push(["Embedded images",sources.length+" • ZIP .xtemplate"]);
 const compatibility=xnotesCompatibilityWarnings(doc);
 if(compatibility.length)data.push(["XNotes compatibility",`${compatibility.length} rotation warning(s): non-text rotation may be ignored; text rotation is limited to 90-degree steps. See docs/XNOTES_COMPATIBILITY.md`]);
 data.forEach(([label,value])=>{const row=document.createElement("div");row.className="export-summary-row";const k=document.createElement("span");k.textContent=label;const v=document.createElement("strong");v.textContent=String(value);row.append(k,v);root.appendChild(row);});
 $("exportTemplateModal").classList.remove("hidden");closeFileMenu();
}
async function downloadTemplate(){
 try{
  validate(doc);
  const blob=writeTemplate(doc,documentAssets),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=((doc.name||'template').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'template')+'.xtemplate';
  a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  setDirty(false);closeModal('exportTemplateModal');toast('Template exported.');setStatus('Export complete');
 }catch(error){toast(error.message);}
}
$("saveBtn").addEventListener("click",prepareExport);$("confirmExportBtn").addEventListener("click",downloadTemplate);
$("docName").addEventListener("keydown",e=>{if(e.key==="F2"){e.preventDefault();const r=document.createRange();r.selectNodeContents(e.currentTarget);getSelection().removeAllRanges();getSelection().addRange(r);}});
$("canvasArea").addEventListener("pointerdown",e=>{
 if(e.target.closest("#paperWrap,.canvas-tools,.canvas-footer"))return;
 if(activeTool!=="select"&&activeTool!=="pan")return;
 if(selectedPaths.length){selectedPath=null;selectedPaths=[];render();setInspectorTab("properties");}
});
$("contextMenu").querySelectorAll('[data-action="copy"],[data-action="cut"],[data-action="paste"]').forEach(button=>{button.addEventListener("click",()=>{const action=button.dataset.action;if(action==="copy")copySelection(false);else if(action==="cut")copySelection(true);else pasteSelection();hideContextMenu();});});

window.addEventListener("keydown",e=>{
 const target=e.target instanceof Element?e.target:null,typing=target&&target.closest('input,textarea,select,[contenteditable="true"]');
 if(typing)return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="c"){if(selectedPaths.length){e.preventDefault();copySelection(false);}return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="x"){if(selectedPaths.length){e.preventDefault();copySelection(true);}return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="v"){if(clipboardNodes.length){e.preventDefault();pasteSelection();}return;}
});

function showContextMenu(x,y){
 const menu=$("contextMenu");menu.classList.remove("hidden");menu.style.left="0px";menu.style.top="0px";
 const r=menu.getBoundingClientRect(),pad=8;
 menu.style.left=Math.max(pad,Math.min(x,innerWidth-r.width-pad))+"px";
 menu.style.top=Math.max(pad,Math.min(y,innerHeight-r.height-pad))+"px";
}
function hideContextMenu(){
 const menu=$("contextMenu");menu.classList.remove("show-new-submenu","structure-add-only");menu.classList.add("hidden");menu.style.left="-10000px";menu.style.top="-10000px";contextPoint=null;
}
function prepareContextMenu(e,targetPath=null,blank=false,point=null,fromStructure=false){
 e.preventDefault();contextPoint=point;
 if(targetPath){if(!selectedPaths.some(p=>nodeKey(p)===nodeKey(targetPath)))select(targetPath);$("contextHeading").textContent="ELEMENT · INSERT / EDIT";}
 else if(blank){selectedPath=null;selectedPaths=[];renderTree();renderInspector();$("contextHeading").textContent="STRUCTURE · NEW ELEMENT";}
 const menu=$("contextMenu"),canEdit=!!selectedPath&&selectedPath[0]!=="__page__";
 const structureItem=fromStructure&&targetPath?.[0]!=="__page__";
 for(const action of ['rename','layer-color']){
  const button=menu.querySelector(`[data-action="${action}"]`);
  if(button){button.classList.toggle('hidden',!structureItem);button.disabled=!canEdit||!structureItem;}
 }
 menu.querySelectorAll('[data-action="duplicate"],[data-action="delete"],[data-action="up"],[data-action="down"],[data-action="copy"],[data-action="cut"]').forEach(b=>{b.disabled=!canEdit;});menu.querySelector('[data-action="paste"]').disabled=!clipboardNodes.length;menu.querySelector('[data-action="group"]').disabled=selectedPaths.length<2;
 showContextMenu(e.clientX,e.clientY);
}
$("tree").addEventListener("contextmenu",e=>{
 const item=e.target.closest(".tree-item");prepareContextMenu(e,item?toPath(item.dataset.path):null,!item,null,Boolean(item));
});
document.querySelector(".outline-dock").addEventListener("contextmenu",e=>{
 if(e.target.closest("#tree"))return;
 const item=e.target.closest(".tree-item");prepareContextMenu(e,item?toPath(item.dataset.path):null,!item,null,Boolean(item));
});
paper.addEventListener("contextmenu",e=>{
 const g=e.target.closest("[data-path]");
 // Empty space inside a selected container still belongs to that container.
 const point=(!g||(e.target.closest(".svg-hitbox")&&["group","repeat"].includes(getAt(toPath(g.dataset.path))?.type)))?pagePoint(e):null;
 prepareContextMenu(e,g?toPath(g.dataset.path):null,!g,point);
});
$("contextMenu").querySelector(".context-new-trigger")?.addEventListener("pointerenter",positionContextSubmenu);
$("contextMenu").querySelector(".context-new-trigger")?.addEventListener("focus",positionContextSubmenu);
$("contextMenu").addEventListener("click",e=>{
 const button=e.target.closest("button");if(!button)return;
 if(button.dataset.add){
  const type=button.dataset.add,point=contextPoint?{...contextPoint}:null;hideContextMenu();$("addMenu")?.classList.add("hidden");addNodeAtContext(type,point);return;
 }
 const action=button.dataset.action;if(!action||button.disabled)return;
 const layerPath=selectedPath?.slice();
 hideContextMenu();
 if(action==="rename"){
  const row=$("tree").querySelector(`.tree-item[data-path="${nodeKey(layerPath)}"]`);
  row?.dispatchEvent(new Event("structure-rename"));return;
 }
 if(action==="layer-color"){
  const row=$("tree").querySelector(`.tree-item[data-path="${nodeKey(layerPath)}"]`);
  const anchor=row?.querySelector('.tree-color-control');
  if(anchor)openLayerColorPicker(layerPath,anchor);
  return;
 }
 if(action==="group"){groupSelection();return;}
 if(action==="duplicate")$("duplicateElement").click();
 if(action==="delete")$("deleteElement").click();
 if(action==="up"||action==="down"){moveSelectedLayer(action);return;}
});
document.addEventListener("pointerdown",e=>{const target=e.target instanceof Element?e.target:null;if(!target?.closest("#contextMenu"))hideContextMenu();},true);
document.addEventListener("click",e=>{const target=e.target instanceof Element?e.target:null;if(target&&!target.closest("#contextMenu")&&!target.closest("#tree")&&!target.closest(".outline-dock"))hideContextMenu();});
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;hideContextMenu();$("addMenu")?.classList.add("hidden");const visible=[...document.querySelectorAll(".modal-backdrop:not(.hidden)")].at(-1);if(visible){if(visible.id==="confirmModal")closeConfirmation(false);else closeModal(visible.id);}});
async function loadOfficialExample(file,source){
 if(!file)return;
 if(dirty&&!confirm("Descartar alterações não exportadas e abrir este exemplo?")){if(source)source.value="";return;}
 try{const res=await fetch("./examples/"+encodeURIComponent(file));if(!res.ok)throw Error("Example not found.");const parsed=JSON.parse(await res.text());validate(parsed);replaceDocumentAssets(new Map());doc=parsed;resetVectorEditors();selectedPath=null;selectedPaths=[];collapsedTree.clear();loadLayerColors();resetHistory();previewValues={};initializePreviewValues();setDirty(false);syncJson();render();document.querySelectorAll(".template-card").forEach(b=>b.classList.remove("active"));toast("Template loaded.");setStatus("Template: "+file);}
 catch(err){toast("Could not open template: "+err.message);}
 if(source)source.value="";
}
$("topExample").addEventListener("change",e=>loadOfficialExample(e.target.value,e.target));
function addNodeAtContext(type,point){
 if(type==='image'){$('imageFileInput').click();return;}
 const node=createDefaultNode(type);
 if(!node){toast("Unsupported element type: "+type);return;}
 const {parent,parentPath,box}=insertionContext(),fmt=v=>Number(v.toFixed(2))+"mm";
 if(point){
  const x=(Number(point.x)||0)-box.x,y=(Number(point.y)||0)-box.y;
  if(["rect","path","group","text"].includes(type)){node.x=fmt(x);node.y=fmt(y);}
  else if(["circle","ellipse","dot"].includes(type)){node.cx=fmt(x);node.cy=fmt(y);}
  else if(type==="line"){node.x1=fmt(x);node.y1=fmt(y);node.x2=fmt(x+40);node.y2=fmt(y+20);}
  else if(["polyline","polygon"].includes(type))node.points=node.points.map(([px,py])=>[fmt(x+Number(px)),fmt(y+Number(py))]);
  else if(type==="hline")node.y=fmt(y);
  else if(type==="vline")node.x=fmt(x);
 }
 const items=parent?parent.children:(doc.items||(doc.items=[]));items.push(node);
 selectedPath=parent?parentPath.concat(["children",items.length-1]):["items",items.length-1];
 selectedPaths=[selectedPath.slice()];commit(()=>{});setInspectorTab("properties");
}
// Pointer-activated buttons should not retain keyboard focus. Otherwise a
// subsequent Space press can unintentionally activate the last clicked tool.
// Keyboard-focused buttons deliberately keep focus and retain Space/Enter access.
document.addEventListener("pointerup",e=>{
 if(e.pointerType!=="mouse"||e.button!==0)return;
 const active=document.activeElement;
 if(active instanceof HTMLButtonElement&&active.contains(e.target))active.blur();
},true);
// Alt + wheel zooms; Space + drag pans the paper itself, even when it fits the viewport.
const canvas=$("canvasArea"),paperWrap=$("paperWrap");let spaceDown=false,pan=null,panOffset={x:0,y:0};
$("togglePasteboard").addEventListener("click",()=>{
 pasteboardVisible=!pasteboardVisible;
 canvas.classList.toggle('preview-clipped',!pasteboardVisible);
 const button=$("togglePasteboard");
 button.textContent=pasteboardVisible?'Edit outside':'Page preview';
 button.setAttribute('aria-pressed',String(pasteboardVisible));
 button.title=pasteboardVisible?'Off-page handles remain editable; artwork is always clipped to the page':'Hide off-page handles and return to the page-only preview';
});
function applyPan(){paperWrap.style.transform="translate("+panOffset.x+"px, "+panOffset.y+"px)";}
window.addEventListener("keydown",e=>{
 if(e.code!=="Space"||e.repeat)return;
 const focused=document.activeElement;
 // Space is the accessibility activation key for buttons, menuitems and
 // controls. Only use it as the pan modifier outside interactive widgets.
 if(focused?.closest('button,input,textarea,select,[role="button"],[role="menuitem"],[contenteditable="true"]'))return;
 spaceDown=true;canvas.classList.add("space-ready");e.preventDefault();
});
window.addEventListener("keyup",e=>{if(e.code==="Space"){spaceDown=false;canvas.classList.remove("space-ready");if(pan&&!pan.started)pan=null;}});
window.addEventListener("blur",()=>{spaceDown=false;canvas.classList.remove("space-ready","panning");pan=null;});
canvas.addEventListener("wheel",e=>{if(e.target.closest(".canvas-tools,.canvas-footer,.canvas-hint"))return;e.preventDefault();if(e.altKey){stepZoom(e.deltaY<0?1:-1,{x:e.clientX,y:e.clientY});return;}panOffset.x-=e.deltaX;panOffset.y-=e.deltaY;applyPan();},{passive:false});
canvas.addEventListener("pointerdown",e=>{if((!spaceDown&&activeTool!=="pan")||e.button!==0||e.target.closest("button,input,select,textarea,.canvas-footer,.canvas-hint,.canvas-tools"))return;pan={pointerId:e.pointerId,x:e.clientX,y:e.clientY,originX:panOffset.x,originY:panOffset.y,started:false};e.preventDefault();e.stopPropagation();canvas.setPointerCapture(e.pointerId);},true);
canvas.addEventListener("pointermove",e=>{if(!pan||pan.pointerId!==e.pointerId)return;const dx=e.clientX-pan.x,dy=e.clientY-pan.y;if(!pan.started&&Math.hypot(dx,dy)<4)return;if(!pan.started){pan.started=true;canvas.classList.add("panning");}panOffset.x=pan.originX+dx;panOffset.y=pan.originY+dy;applyPan();});
function finishPan(e){if(!pan||pan.pointerId!==e.pointerId)return;pan=null;canvas.classList.remove("panning");}
canvas.addEventListener("pointerup",finishPan);
canvas.addEventListener("pointercancel",finishPan);
canvas.addEventListener("lostpointercapture",finishPan);
const toolButtons=[...document.querySelectorAll(".canvas-tool")];
let activeTool="select",drawState=null,curveState=null,penMode="path";
function updatePenPicker(){
 const picker=$("penModePicker");picker.classList.toggle("hidden",activeTool!=="pen");
 $("penMode").value=penMode;
 const descriptions={line:"Click two points. Magnetic guides lock horizontal / vertical; Shift locks 45°; Alt temporarily disables snapping.",polyline:"Click vertices; Enter or double-click finishes an open line.",polygon:"Click at least three vertices; click the first point or press Enter to close.",path:"Click for straight nodes, drag for Bézier handles. Enter or double-click finishes."};
 $("penModeHint").textContent=descriptions[penMode]+' Points can be placed outside the page. XNotes clips output at its edges.';
}
function setActiveTool(tool){
 if(tool==="line"||tool==="polygon"||tool==="curve"){penMode=tool==="curve"?"path":tool;tool="pen";}
 if(tool!=="pen"&&curveState){curveState=null;renderPenPreview();}
 activeTool=tool;toolButtons.forEach(b=>{const active=b.dataset.tool===tool;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});
 paper.style.cursor=tool==="select"?"default":tool==="pan"?"grab":tool==="text"?"text":"crosshair";
 updatePenPicker();
}
$("penMode").addEventListener("change",e=>{if(!PEN_MODES.includes(e.target.value))return;penMode=e.target.value;curveState=null;renderPenPreview();setActiveTool("pen");});
$("penCancel").addEventListener("click",()=>{curveState=null;renderPenPreview();setActiveTool("select");});
function pagePoint(e){
 let toLocal=null;
 try{
  const matrix=paper.getScreenCTM();
  if(matrix)toLocal=(x,y)=>{const point=paper.createSVGPoint();point.x=x;point.y=y;return point.matrixTransform(matrix.inverse());};
 }catch{}
 return screenToDocumentPoint({clientX:e.clientX,clientY:e.clientY,rect:paper.getBoundingClientRect(),pageWidth:pageSize[0],pageHeight:pageSize[1],toLocal});
}
function penConstrainPointer(point,last,event){
 const initial={point:{...point},axis:null};
 if(!last)return initial;
 // Shift keeps the existing 45-degree compass constraint. Alt disables
 // magnetic snapping without affecting the original cursor position.
 if(event.shiftKey)return {point:snapPenAngle(last,point),axis:null};
 if(!magneticGuidesEnabled||event.altKey)return initial;
 const rect=paper.getBoundingClientRect();
 return snapPenOrthogonal(last,point,
  7*pageSize[0]/Math.max(1,rect.width),
  7*pageSize[1]/Math.max(1,rect.height));
}
function penGuides(point,last,axis){
 if(!last||!axis){clearSmartGuides();renderSmartGuideOverlay();return;}
 if(axis==='horizontal'){
  smartGuides={x:null,y:last.y};
  smartGuideSegments={x:null,y:{y:last.y,x1:Math.min(last.x,point.x),x2:Math.max(last.x,point.x),kind:'object'}};
 }else{
  smartGuides={x:last.x,y:null};
  smartGuideSegments={x:{x:last.x,y1:Math.min(last.y,point.y),y2:Math.max(last.y,point.y),kind:'object'},y:null};
 }
 renderSmartGuideOverlay();
}
function handlePenPointerDown(e){
 if(e.button!==0)return;
 if(document.activeElement?.matches('select,button'))document.activeElement.blur();
 let pt=pagePoint(e);
 // Before magnetic snapping, check whether the user clicked the original
 // anchor to close: snapping can otherwise shift it and create a duplicate.
 const existing=curveState,firstAnchor=existing?.points[0];
 const hitRadius=Math.max(2,7*pageSize[0]/paper.getBoundingClientRect().width);
 if(firstAnchor&&existing.points.length>=3&&['polygon','path'].includes(existing.mode)&&
    Math.hypot(pt.x-firstAnchor.x,pt.y-firstAnchor.y)<hitRadius){
  existing.closed=true;finishPenPath();return;
 }
 if(magneticGuidesEnabled&&!e.altKey){
  const snap=snapToGuides({x:pt.x,y:pt.y,w:0,h:0},[],null);
  pt={x:pt.x+snap.dx,y:pt.y+snap.dy};smartGuides=snap.guides;smartGuideSegments=snap.segments;
 }
 if(!curveState)curveState={points:[],pointerId:null,activeIndex:-1,closed:false,mode:penMode};
 const state=curveState,last=state.points.at(-1);
 if(last&&state.mode==='path'&&Math.hypot(pt.x-last.x,pt.y-last.y)<hitRadius){
  // Illustrator-like "click last anchor" gesture: retract the outgoing tangent.
  // Keep the anchor and all preceding geometry; the next segment becomes a corner.
  state.points=resetOutgoingTangent(state.points);state.hover=null;renderPenPreview();
  toast('Outgoing tangent reset; preceding curve preserved. Click to continue.');return;
 }
 if(last&&state.points.length>=2&&Math.hypot(pt.x-last.x,pt.y-last.y)<hitRadius){finishPenPath();return;}
 const constrained=penConstrainPointer(pt,last,e);
 pt=constrained.point;
 penGuides(pt,last,constrained.axis);
 state.points.push({x:pt.x,y:pt.y,inHx:0,inHy:0,outHx:0,outHy:0});
 state.activeIndex=state.points.length-1;state.pointerId=e.pointerId;
 if(state.mode==='line'&&state.points.length===2){finishPenPath();return;}
 paper.setPointerCapture(e.pointerId);renderPenPreview();
}
function updatePenFromPointer(e){
 const state=curveState;if(!state||activeTool!=='pen')return;
 const pt=pagePoint(e),last=state.points.at(-1);
 if(state.pointerId===e.pointerId&&state.mode==='path'){
  if(last){const dx=pt.x-last.x,dy=pt.y-last.y;
   last.outHx=dx;last.outHy=dy;last.inHx=-dx;last.inHy=-dy;}
 }else if(state.pointerId===null){
  const proposed=(!e.altKey&&magneticGuidesEnabled)?snapToGuides({x:pt.x,y:pt.y,w:0,h:0},[],null):null;
  const position=proposed?{x:pt.x+proposed.dx,y:pt.y+proposed.dy}:pt;
  const result=penConstrainPointer(position,last,e);
  state.hover=result.point;
  penGuides(result.point,last,result.axis);
 }
 renderPenPreview();
}
/** The page is not the drawing boundary: the pasteboard around it can host
 * XNotes coordinates <0 or >W/H, though Android clips output to paper. */
function isPasteboardPointer(e){
 if(!pasteboardVisible)return false;
 const target=e.target;
 return target instanceof Element&&!target.closest('#paper,.canvas-tools,.pen-mode-picker,.canvas-footer,.canvas-hint,button,input,select,textarea');
}
canvas.addEventListener('pointerdown',e=>{
 if(activeTool!=='pen'||spaceDown||e.button!==0||!isPasteboardPointer(e))return;
 e.preventDefault();e.stopPropagation();handlePenPointerDown(e);
});
canvas.addEventListener('pointermove',e=>{
 if(activeTool!=='pen'||!curveState||!isPasteboardPointer(e))return;
 updatePenFromPointer(e);
});
canvas.addEventListener('dblclick',e=>{
 if(activeTool!=='pen'||!curveState||!isPasteboardPointer(e))return;
 e.preventDefault();e.stopPropagation();
 const pts=curveState.points;
 if(pts.length>2&&Math.hypot(pts.at(-1).x-pts.at(-2).x,pts.at(-1).y-pts.at(-2).y)<1.5)pts.pop();
 finishPenPath();
});
function renderPenPreview(){
 let layer=paper.querySelector('#pen-preview');if(!curveState){layer?.remove();return;}
 if(!layer){layer=svg('g',{id:'pen-preview','pointer-events':'none'});paper.appendChild(layer);}layer.replaceChildren();
 const {points:pts,mode,hover,closed}=curveState;if(!pts.length)return;
 const projection=hover&&pts.length?{...hover}:null;
 const previewPts=projection?[...pts,projection]:pts;
 if(mode==='path')layer.appendChild(svg('path',{d:penPathData(previewPts,closed),fill:'none',stroke:'#6485f5','stroke-width':.65,'stroke-linejoin':'round'}));
 else if(mode==='polygon')layer.appendChild(svg('polygon',{points:previewPts.map(p=>p.x+','+p.y).join(' '),fill:'#6485f51a',stroke:'#6485f5','stroke-width':.7,'stroke-dasharray':'2 1'}));
 else layer.appendChild(svg('polyline',{points:previewPts.map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#6485f5','stroke-width':.7,'stroke-dasharray':'2 1'}));
 pts.forEach((p,i)=>{
  if(mode==='path'){
   const vectors=[['incoming',penIncoming(p)],['outgoing',penOutgoing(p)]];
   for(const [side,v] of vectors){
    if(Math.hypot(v.x,v.y)<.15)continue;
    const target={x:p.x+v.x,y:p.y+v.y};
    layer.appendChild(svg('line',{x1:p.x,y1:p.y,x2:target.x,y2:target.y,stroke:'#6485f5','stroke-width':.5,'stroke-dasharray':'1.5 1'}));
    layer.appendChild(svg('circle',{cx:target.x,cy:target.y,r:1.15,fill:side==='incoming'?'#f4cc86':'#85d3f4',stroke:'#6485f5','stroke-width':.5}));
   }
  }
  layer.appendChild(svg('circle',{cx:p.x,cy:p.y,r:1.25,class:'pen-preview-point',fill:i===pts.length-1?'#6485f5':'#fff'}));
 });
}
function finishPenPath(){
 if(!curveState)return;
 const state=curveState;curveState=null;renderPenPreview();clearSmartGuides();renderSmartGuideOverlay();
 const needed=state.mode==='polygon'?3:2;
 if(state.points.length<needed){toast(`${state.mode} needs at least ${needed} points.`);return;}
 try{
  const {parent,parentPath,box}=insertionContext();
  const node=createPenNode(state.mode,state.points,box,state.mode==='polygon'||state.closed);
  const arr=parent?parent.children:(doc.items||(doc.items=[]));arr.push(node);
  selectedPath=parent?parentPath.concat(['children',arr.length-1]):['items',arr.length-1];selectedPaths=[selectedPath.slice()];
  commit(()=>{});setInspectorTab('properties');
  if(['polygon','polyline'].includes(state.mode)){vectorEditPath=nodeKey(selectedPath);vectorSelection=new Set([state.points.length-1]);}
  else if(state.mode==='path')pathEditPath=nodeKey(selectedPath);
  setActiveTool('select');render();
 }catch(error){toast(error.message);}
}
paper.addEventListener('dblclick',e=>{
 if(activeTool!=='pen'||!curveState)return;e.preventDefault();
 const pts=curveState.points;if(pts.length>2&&Math.hypot(pts.at(-1).x-pts.at(-2).x,pts.at(-1).y-pts.at(-2).y)<1.5)pts.pop();
 finishPenPath();
});
function polygonVertices(a,b,sides=5){
 const left=Math.min(a.x,b.x),top=Math.min(a.y,b.y),w=Math.max(.3,Math.abs(b.x-a.x)),h=Math.max(.3,Math.abs(b.y-a.y));
 return Array.from({length:sides},(_,i)=>{const angle=-Math.PI/2+i*2*Math.PI/sides;return{x:left+w/2+Math.cos(angle)*w/2,y:top+h/2+Math.sin(angle)*h/2};});
}
function insertDrawnNode(type,a,b,points){
 const {parent,parentPath,box}=insertionContext();
 const local=point=>({x:point.x-box.x,y:point.y-box.y,...(point.hx===undefined?{}:{hx:point.hx,hy:point.hy})});
 const from=local(a),to=local(b),trace=(points||[a,b]).map(local);
 const left=Math.min(from.x,to.x),top=Math.min(from.y,to.y),w=Math.max(1,Math.abs(to.x-from.x)),h=Math.max(1,Math.abs(to.y-from.y));
 const f=v=>Number(v.toFixed(2))+"mm";let n;
 if(type==="rect")n={type,x:f(left),y:f(top),w:f(w),h:f(h),stroke:"ink",fill:"none",strokeWidth:"0.3mm"};
 else if(type==="ellipse")n={type,cx:f(left+w/2),cy:f(top+h/2),rx:f(w/2),ry:f(h/2),stroke:"ink",fill:"none",strokeWidth:"0.3mm"};
 else if(type==="line")n={type,x1:f(from.x),y1:f(from.y),x2:f(to.x),y2:f(to.y),stroke:"ink",strokeWidth:"0.3mm"};
 else if(type==="polygon")n={type,points:polygonVertices(from,to,5).map(p=>[f(p.x),f(p.y)]),stroke:"ink",fill:"none",strokeWidth:"0.3mm"};
 else if(type==="polyline")n={type,points:trace.map(p=>[f(p.x),f(p.y)]),stroke:"ink",fill:"none",strokeWidth:"0.5mm"};
 else if(type==="curve"){
  const coords=[];for(const pt of trace)coords.push(pt.x,pt.y,pt.x+(pt.hx||0),pt.y+(pt.hy||0),pt.x-(pt.hx||0),pt.y-(pt.hy||0));
  const x=Math.min(...coords.filter((_,i)=>i%2===0)),y=Math.min(...coords.filter((_,i)=>i%2===1));
  const pw=Math.max(1,Math.max(...coords.filter((_,i)=>i%2===0))-x),ph=Math.max(1,Math.max(...coords.filter((_,i)=>i%2===1))-y);
  n={type:"path",x:f(x),y:f(y),w:f(pw),h:f(ph),viewBox:[0,0,pw,ph],d:penPathData(trace,false,x,y),stroke:"ink",fill:"none",strokeWidth:"0.5mm"};
 }else return;
 const arr=parent?parent.children:(doc.items||(doc.items=[]));arr.push(n);
 selectedPath=parent?parentPath.concat(["children",arr.length-1]):["items",arr.length-1];selectedPaths=[selectedPath.slice()];
 commit(()=>{});setInspectorTab("properties");
}
function renderDrawPreview(){let p=paper.querySelector("#draw-preview");if(!drawState){p?.remove();return;}if(!p){p=svg("g",{id:"draw-preview","pointer-events":"none"});paper.appendChild(p);}p.replaceChildren();const a=drawState.start,b=drawState.current,x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.max(.3,Math.abs(b.x-a.x)),h=Math.max(.3,Math.abs(b.y-a.y));if(drawState.tool==="rect")p.appendChild(svg("rect",{x,y,width:w,height:h,fill:"#6485f522",stroke:"#6485f5","stroke-width":.6,"stroke-dasharray":"2 1"}));else if(drawState.tool==="ellipse")p.appendChild(svg("ellipse",{cx:x+w/2,cy:y+h/2,rx:w/2,ry:h/2,fill:"#6485f522",stroke:"#6485f5","stroke-width":.6,"stroke-dasharray":"2 1"}));else if(drawState.tool==="polygon")p.appendChild(svg("polygon",{points:polygonVertices(a,b,5).map(v=>v.x+","+v.y).join(" "),fill:"#6485f522",stroke:"#6485f5","stroke-width":.6,"stroke-dasharray":"2 1"}));else p.appendChild(svg("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:"#6485f5","stroke-width":.8,"stroke-dasharray":"2 1"}));}
function addPattern(type){const spacing=type==="grid"?"5mm":"8mm",line={type:"repeat",axis:type==="grid"?"xy":"y",period:spacing,fit:"space",children:type==="grid"?[{type:"hline",y:"100%",stroke:"#b5c5df",strokeWidth:"0.15mm"},{type:"vline",x:"100%",stroke:"#b5c5df",strokeWidth:"0.15mm"}]:[{type:"hline",y:"100%",stroke:"#9eb8df",strokeWidth:"0.2mm"}]},node={type:"group",inset:"10mm",children:[line]};const items=doc.items||(doc.items=[]);items.push(node);const path=["items",items.length-1];selectedPath=path;selectedPaths=[path];commit(()=>{});setInspectorTab("properties");toast(type==="grid"?"Grid inserted — adjust the period in properties.":"Ruled lines inserted — adjust spacing in properties.");setActiveTool("select");}
toolButtons.forEach(b=>b.addEventListener("click",()=>{const tool=b.dataset.tool;if(tool==="pen"&&activeTool==="pen"){$("penMode").focus();return;}if(tool==="group"){toast("Para criar um grupo, selecione elements e use Agrupar no menu contextual.");return;}if(tool==="ruled"||tool==="grid"){addPattern(tool);return;}setActiveTool(tool);if(tool==="pan")toast("Click and drag to pan the page; Space + drag also works.");else if(["rect","ellipse","polygon","line"].includes(tool))toast("Drag on the page or outside pasteboard to draw.");else if(tool==="pen")toast("Pen: choose Line, Polyline, Polygon or SVG Path. Enter finishes; Esc cancels.");}));
function startShapeDrawing(e,captureTarget){
 const pt=pagePoint(e);
 drawState={tool:activeTool,start:pt,current:pt,points:[pt],pointerId:e.pointerId};
 captureTarget.setPointerCapture(e.pointerId);
 renderDrawPreview();
}
function updateShapeDrawing(e){
 if(!drawState||drawState.pointerId!==e.pointerId)return;
 drawState.current=pagePoint(e);
 if(e.shiftKey&&["rect","ellipse"].includes(drawState.tool)){
  const dx=drawState.current.x-drawState.start.x,dy=drawState.current.y-drawState.start.y;
  const side=Math.max(Math.abs(dx),Math.abs(dy));
  drawState.current={x:drawState.start.x+Math.sign(dx||1)*side,y:drawState.start.y+Math.sign(dy||1)*side};
 }
 renderDrawPreview();
}
// Paper and surrounding pasteboard share a single gesture lifecycle. The
// capture target is the surface on which the drag began, so crossing the
// paper boundary never interrupts creation of a native rect/ellipse.
canvas.addEventListener('pointerdown',e=>{
 if(!pasteboardVisible||spaceDown||activeTool==='pan'||e.button!==0)return;
 if(!['rect','ellipse'].includes(activeTool)||!isPasteboardPointer(e))return;
 e.preventDefault();e.stopPropagation();startShapeDrawing(e,canvas);
});
canvas.addEventListener('pointermove',e=>{
 if(drawState?.pointerId===e.pointerId)updateShapeDrawing(e);
});
canvas.addEventListener('pointerup',e=>finishDrawing(e));
canvas.addEventListener('pointercancel',e=>{
 if(drawState?.pointerId!==e.pointerId)return;
 drawState=null;renderDrawPreview();
});
paper.addEventListener("pointerdown",e=>{
 if(spaceDown||activeTool==="pan")return;
 if(e.button!==0)return;

 if(activeTool==="text"){
  const pt=pagePoint(e),f=v=>Number(v.toFixed(2))+"mm",{parent,parentPath,box}=insertionContext();
  const n={type:"text",x:f(pt.x-box.x),y:f(pt.y-box.y),text:"Novo texto",size:"4mm",fill:"ink"};
  const arr=parent?parent.children:(doc.items||(doc.items=[]));arr.push(n);
  selectedPath=parent?parentPath.concat(["children",arr.length-1]):["items",arr.length-1];selectedPaths=[selectedPath.slice()];
  commit(()=>{});setInspectorTab("properties");setActiveTool("select");return;
 }
 if(!["rect","ellipse","polygon","line"].includes(activeTool))return;
 e.preventDefault();e.stopPropagation();
 startShapeDrawing(e,paper);
});
paper.addEventListener("pointermove",e=>updateShapeDrawing(e));
function finishDrawing(e){if(!drawState||drawState.pointerId!==e.pointerId)return;const d=drawState;drawState=null;renderDrawPreview();if(Math.hypot(d.current.x-d.start.x,d.current.y-d.start.y)<1){toast("Drag to set the element dimensions.");return;}insertDrawnNode(d.tool,d.start,d.current,d.points);setActiveTool("select");}
paper.addEventListener("pointerup",finishDrawing);
paper.addEventListener("pointercancel",()=>{drawState=null;renderDrawPreview();});
// Additional editor shortcuts. Inputs retain normal text-editing behavior.
window.addEventListener("keydown",e=>{const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||document.activeElement.isContentEditable;if(activeTool==="pen"&&curveState&&!typing&&e.key==="Backspace"){e.preventDefault();if(curveState.pointerId!==null)return;curveState.points.pop();curveState.activeIndex=curveState.points.length-1;if(!curveState.points.length){curveState=null;toast("Path cleared.");}renderPenPreview();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){if(typing)return;e.preventDefault();if(e.shiftKey)redo();else undo();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){if(typing)return;e.preventDefault();redo();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="n"){e.preventDefault();$("newBtn").click();}if(typing)return;
 if(vectorCurrent()&&e.key==='Backspace'){
  e.preventDefault();
  try{
   const n=vectorCurrent(),indices=[...vectorSelection].sort((a,b)=>b-a);if(!indices.length)return;let pairs=readPointPairs(n.points);
   for(const index of indices)pairs=removePoint(pairs,index,n.type==='polygon');
   commit(()=>{n.points=pairs;});vectorSelection=new Set([Math.min(indices.at(-1)??0,pairs.length-1)]);render();
  }catch(err){toast(err.message);}
  return;
 }
 if(vectorCurrent()&&e.key==='Escape'){vectorEditPath=null;vectorSelection.clear();render();return;}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&!e.ctrlKey&&!e.metaKey){
  const step=e.altKey?.1:e.shiftKey?5:.5;
  const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,
   dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
  if(vectorCurrent()&&vectorSelection.size){
   e.preventDefault();const node=vectorCurrent(),indices=[...vectorSelection];
   if(!approveVectorBake(node,indices))return;
   const box=parentBoxForPath(selectedPath);
   commit(()=>{node.points=writeVectorDelta(node,indices,dx,dy,box);});return;
  }
  if(pathCurrent()&&pathPointSelection>=0){
   e.preventDefault();const node=pathCurrent();
   try{const point=editablePathNodes(node.d).nodes[pathPointSelection];
    if(point)commit(()=>{node.d=replaceSvgPathPoint(node.d,point,point.x+dx,point.y+dy);});}
   catch(err){toast(err.message);}return;
  }
 }
 if(pathCurrent()&&e.key==='Backspace'&&pathPointSelection>=0){
  e.preventDefault();const node=pathCurrent();
  try{const next=removeSvgPathAnchor(node.d,pathPointSelection);commit(()=>{node.d=next;});pathPointSelection=-1;render();}
  catch(err){toast(err.message);}return;
 }
 if(selectedPath&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){
  const n=getAt(selectedPath);
  if(n&&draggableTypes.has(n.type)){e.preventDefault();const step=e.shiftKey?10:1,dx=e.key==="ArrowLeft"?-step:e.key==="ArrowRight"?step:0,dy=e.key==="ArrowUp"?-step:e.key==="ArrowDown"?step:0,paths=selectedPaths.length>1?selectedPaths:[selectedPath];
   for(const path of paths){const target=getAt(path);if(target&&draggableTypes.has(target.type))moveBy(target,dx,dy,parentBoxForPath(path));}
   commit(()=>{});
  }return;
 }if(!e.ctrlKey&&!e.metaKey&&!e.altKey){const key=e.key.toLowerCase(),tools={v:"select",r:"rect",o:"ellipse",p:"pen",c:"curve",l:"line",t:"text"};if(tools[key]){setActiveTool(tools[key]);return;}}if(e.key==="Insert"){e.preventDefault();openStructureAddMenu();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"&&selectedPath){e.preventDefault();$("duplicateElement").click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="g"&&selectedPaths.length>1){e.preventDefault();groupSelection();}if(e.key==="Delete"||e.key==="Backspace"){if(selectedPath&&selectedPath[0]!=="__page__"){e.preventDefault();$("deleteElement").click();}}if(e.key==="Enter"&&activeTool==="pen"&&curveState){e.preventDefault();finishPenPath();return;}if(e.key==="Escape"){if(curveState){curveState=null;renderPenPreview();clearSmartGuides();renderSmartGuideOverlay();toast("Drawing cancelled.");return;}hideContextMenu();}if(e.altKey&&["ArrowUp","ArrowDown"].includes(e.key)&&selectedPath){e.preventDefault();moveSelectedLayer(e.key==="ArrowUp"?"up":"down");return;}});

createAlignmentTools({
  getContext(){
    const node=getAt(selectedPath);
    if(!node)return null;
    const type=node.type;
    const parent=parentBoxForPath(selectedPath);
    return {node,type,bounds:transformGeometry(node),pageSize,parent,path:selectedPath};
  },
  getParentBox(){return parentBoxForPath(selectedPath);},
  moveBy(node,dx,dy){moveBy(node,dx,dy);},
  commit(){commit(()=>{});},
  toast(message){toast(message);}
});
const commandPalette=$("commandPalette"),commandSearch=$("commandSearch"),commandResults=$("commandResults");
const commands=[
 {label:"Agrupar elements selecionados",group:"Edit",shortcut:"Ctrl+G",keywords:"join combine group",run:groupSelection},
 {label:"Select tool",group:"Tools",shortcut:"V",keywords:"cursor move transform",run:()=>setActiveTool("select")},
 {label:"Pan canvas",group:"Tools",shortcut:"Espaço",keywords:"pan hand navigate",run:()=>setActiveTool("pan")},
 {label:"Draw rectangle",group:"Tools",shortcut:"R",keywords:"shape square",run:()=>setActiveTool("rect")},
 {label:"Draw ellipse",group:"Tools",shortcut:"O",keywords:"circle oval shape",run:()=>setActiveTool("ellipse")},
 {label:"Draw line",group:"Tools",shortcut:"L",keywords:"stroke",run:()=>setActiveTool("line")},
 {label:"Insert text",group:"Tools",shortcut:"T",keywords:"typography",run:()=>setActiveTool("text")},
 {label:"Bezier pen",group:"Tools",shortcut:"C",keywords:"curve anchor point handle vector illustrator pen",run:()=>setActiveTool("curve")},
 {label:"Insert ruled lines",group:"Tools",keywords:"lines notebook spacing repeat",run:()=>addPattern("ruled")},
 {label:"Insert grid",group:"Tools",keywords:"grid squares math",run:()=>addPattern("grid")},
 {label:"New template",group:"File",shortcut:"Ctrl+N",keywords:"create document",run:()=> $("newBtn").click()},
 {label:"Open .xtemplate file",group:"File",shortcut:"Ctrl+O",keywords:"import load",run:()=> $("openBtn").click()},
 {label:"Export template",group:"File",shortcut:"Ctrl+S",keywords:"save download",run:()=> $("saveBtn").click()},
 {label:"Undo",group:"Edit",shortcut:"Ctrl+Z",keywords:"undo voltar",run:()=>undo()},
 {label:"Redo",group:"Edit",shortcut:"Ctrl+Shift+Z",keywords:"redo repetir",run:()=>redo()},
 {label:"Duplicate element",group:"Edit",shortcut:"Ctrl+D",keywords:"copy clone",run:()=>{if(selectedPath)$("duplicateElement").click();else toast("Select an element first.")}},
 {label:"Delete element",group:"Edit",shortcut:"Delete",keywords:"apagar excluir",run:()=>{if(selectedPath)$("deleteElement").click();else toast("Select an element first.")}},
 {label:"Toggle JSON editor",group:"View",shortcut:"Ctrl+Enter",keywords:"código dividido fonte",run:()=>toggleSplit()},
 {label:"Format JSON",group:"View",keywords:"indentation organize code",run:()=>{if(!split)toggleSplit(true);$("formatJson").click()}},
 {label:"Add element",group:"Structure",shortcut:"Insert",keywords:"node group repeat shape",run:()=>openStructureAddMenu()},
 {label:"Fit page to screen",group:"View",keywords:"zoom fit frame",run:()=>setZoom("fit")}
];
let commandMatches=[],commandIndex=0,previousFocus=null;
function renderCommandResults(){
 const q=commandSearch.value.trim().toLocaleLowerCase("pt-BR");
 commandMatches=commands.map((c,i)=>({...c,index:i})).filter(c=>(c.label+" "+c.group+" "+(c.keywords||"")+" "+(c.shortcut||"")).toLocaleLowerCase("pt-BR").includes(q));
 commandIndex=Math.min(commandIndex,Math.max(0,commandMatches.length-1));
 commandResults.replaceChildren();
 if(!commandMatches.length){const empty=document.createElement("div");empty.className="command-empty";empty.textContent="No commands found";commandResults.appendChild(empty);return;}
 let lastGroup="";
 commandMatches.forEach((c,i)=>{
  if(c.group!==lastGroup){const group=document.createElement("div");group.className="command-group";group.textContent=c.group;commandResults.appendChild(group);lastGroup=c.group;}
  const b=document.createElement("button");b.type="button";b.className="command-result"+(i===commandIndex?" active":"");b.setAttribute("role","option");b.setAttribute("aria-selected",String(i===commandIndex));b.dataset.commandIndex=String(i);
  const label=document.createElement("span");label.textContent=c.label;b.appendChild(label);
  if(c.shortcut){const k=document.createElement("kbd");k.textContent=c.shortcut;b.appendChild(k);}
  b.addEventListener("click",()=>runCommand(c));commandResults.appendChild(b);
 });
 commandResults.querySelector(".command-result.active")?.scrollIntoView({block:"nearest"});
}
function openCommandPalette(){previousFocus=document.activeElement;commandPalette.classList.remove("hidden");commandSearch.value="";commandIndex=0;renderCommandResults();commandSearch.focus();}
function closeCommandPalette(){if(commandPalette.classList.contains("hidden"))return;commandPalette.classList.add("hidden");if(previousFocus?.isConnected)previousFocus.focus();}
function runCommand(command){closeCommandPalette();command.run();}
commandSearch.addEventListener("input",()=>{commandIndex=0;renderCommandResults();});
commandSearch.addEventListener("keydown",e=>{
 if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(commandMatches.length){commandIndex=(commandIndex+(e.key==="ArrowDown"?1:-1)+commandMatches.length)%commandMatches.length;renderCommandResults();}return;}
 if(e.key==="Enter"){e.preventDefault();if(commandMatches[commandIndex])runCommand(commandMatches[commandIndex]);return;}
 if(e.key==="Escape"){e.preventDefault();closeCommandPalette();}
});
commandPalette.addEventListener("pointerdown",e=>{if(e.target===commandPalette)closeCommandPalette();});
window.addEventListener("keydown",e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();e.stopPropagation();if(commandPalette.classList.contains("hidden"))openCommandPalette();else closeCommandPalette();return;}
 if(!commandPalette.classList.contains("hidden")&&e.key==="Escape"){closeCommandPalette();}
},true);
loadLayerColors();initializePreviewValues();syncJson();render();setInspectorTab("properties");setLeftTab("layers");resetHistory();
})();
