import { createAlignmentTools } from "./src/features/alignment.js";
import { validateTemplate } from "./src/core/validate-template.js";
import { createDefaultNode } from "./src/core/template-schema.js";
import { anchoredPan, nextZoomLevel } from "./src/features/zoom.js";
(() => {
"use strict";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
const SIZES={a4:[210,297],a5:[148,210],letter:[216,279]};
const clone=o=>JSON.parse(JSON.stringify(o));
const samples={
ruled:{xtemplate:1,id:"xtemplate.studio.ruled",name:"Folha pautada",description:"Linhas horizontais para escrita.",license:"MIT",tags:["lines","writing"],params:{spacing:{type:"length",default:"8mm",min:"4mm",max:"14mm",label:"Espaçamento entre linhas",role:"spacing"}},items:[{type:"group",inset:"12mm",children:[{type:"repeat",axis:"y",period:"spacing",fit:"space",children:[{type:"hline",y:"100%",stroke:"#9eb8df",strokeWidth:"0.2mm"}]}]}]},
grid:{xtemplate:1,id:"xtemplate.studio.grid",name:"Folha quadriculada",description:"Grade regular com espaçamento configurável.",license:"MIT",tags:["grid","math"],params:{spacing:{type:"length",default:"5mm",min:"2mm",max:"15mm",label:"Tamanho do quadrado",role:"spacing"}},items:[{type:"group",inset:"10mm",children:[{type:"repeat",axis:"xy",period:"spacing",fit:"space",children:[{type:"hline",y:"100%",stroke:"#b5c5df",strokeWidth:"0.15mm"},{type:"vline",x:"100%",stroke:"#b5c5df",strokeWidth:"0.15mm"}]}]}]},
cornell:{xtemplate:1,id:"xtemplate.examples.cornell",name:"Cornell notes",description:"A cue column, a ruled note area and a summary box at the bottom.",license:"MIT",tags:["lines","study"],params:{spacing:{type:"length",default:"8mm",min:"5mm",max:"12mm",label:"Line spacing",role:"spacing"},cue:{type:"number",default:0.3,min:0.15,max:0.45,step:0.05,label:"Cue column width"},summary:{type:"length",default:"50mm",min:"25mm",max:"90mm",label:"Summary height"}},items:[{type:"group",stroke:"accent",strokeWidth:"0.35mm",children:[{type:"hline",y:"22mm"},{type:"hline",y:"100% - summary"},{type:"vline",x:"W * cue",y1:"22mm",y2:"100% - summary"}]},{type:"group",x:"W * cue",y:"22mm",w:"100% - W * cue",h:"100% - 22mm - summary",children:[{type:"repeat",axis:"y",period:"spacing",children:[{type:"hline",y:"100%"}]}]},{type:"group",y:"100% - summary",h:"summary",children:[{type:"repeat",axis:"y",period:"spacing",children:[{type:"hline",y:"100%"}]}]},{type:"group",fill:"accent",size:"3mm",children:[{type:"text",text:"Cues",x:"4mm",y:"28mm"},{type:"text",text:"Notes",x:"W * cue + 4mm",y:"28mm"},{type:"text",text:"Summary",x:"4mm",y:"100% - summary + 6mm"}]}]},
engineering:{xtemplate:1,id:"xtemplate.examples.engineering",name:"Engineering paper",description:"Fine squares grouped into heavier blocks, centred on the sheet.",license:"MIT",tags:["grid","math","engineering"],params:{minor:{type:"length",default:"2mm",min:"1mm",max:"5mm",label:"Small square",role:"spacing"},every:{type:"integer",default:5,min:2,max:10,label:"Squares per block"}},items:[{type:"group",inset:"10mm",children:[{type:"repeat",axis:"xy",period:"minor * every",fit:"center",children:[{type:"group",opacity:0.45,strokeWidth:"0.15mm",children:[{type:"repeat",axis:"y",count:"every",children:[{type:"hline"}]},{type:"repeat",axis:"x",count:"every",children:[{type:"vline"}]}]},{type:"rect",strokeWidth:"0.3mm"}]}]}]},
todo:{xtemplate:1,id:"xtemplate.examples.todo",name:"Checklist",description:"Rows with a tick box each, stretched slightly so the rows fill the page exactly.",license:"MIT",tags:["planner","lists"],params:{row:{type:"length",default:"9mm",min:"6mm",max:"14mm",label:"Row height",role:"spacing"}},items:[{type:"text",text:"To do",x:"15mm",y:"18mm",size:"5mm",weight:"bold"},{type:"group",inset:["25mm","15mm","15mm","15mm"],children:[{type:"repeat",axis:"y",period:"row",fit:"round",children:[{type:"rect",y:"50% - 2.25mm",w:"4.5mm",h:"4.5mm",rx:"0.8mm"},{type:"hline",y:"100%",x1:"8mm"}]}]}]}
};
let doc=clone(samples.ruled),selectedPath=null,selectedPaths=[],dirty=false,drag=null,marqueeState=null,split=false,activeInspector="properties",suppressJson=false,toastTimer;
let smartGuides={x:null,y:null};
const undoStack=[],redoStack=[];let historyState=JSON.stringify(doc),historyRestoring=false;
let pageSize=[210,297],zoomMode="fit",previewValues={},lastValidJson="",expanded=true,clipSerial=0;
const collapsedTree=new Set();
const paper=$("paper"),wrap=$("paperWrap"),jsonEditor=$("jsonEditor");
function toast(msg){const e=$("toast");e.textContent=msg;e.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),2300);$("statusMessage").textContent=msg;}
function setDirty(v=true){dirty=v;$("dirtyMark").classList.toggle("hidden",!v);$("dirtyMark").title=v?"Alterações não exportadas":"Salvo";}
function setStatus(msg){$("statusMessage").textContent=msg;}
function fmt(){return JSON.stringify(doc,null,2);}
function syncJson(){suppressJson=true;jsonEditor.value=fmt();lastValidJson=jsonEditor.value;updateLineNumbers();suppressJson=false;setValidation("ok","JSON válido");}
function setValidation(type,msg){const e=$("validationStatus");e.textContent=(type==="ok"?"● ":type==="error"?"● ":"⚠ ")+msg;e.className="validation "+type;}
function updateLineNumbers(){const n=(jsonEditor.value.match(/\n/g)||[]).length+1;$("lineNumbers").textContent=Array.from({length:n},(_,i)=>i+1).join("\n");}
function mm(v,dim=1,axis="short",ctx=null){if(typeof v==="number")return v;if(typeof v!=="string")return null;const s=v.trim(),m=s.match(/^([-+]?(?:\d+(?:\.\d*)?|\.\d+))\s*(mm|cm|in|pt|deg)?$/i);if(m){const u=(m[2]||"mm").toLowerCase(),n=Number(m[1]);return n*(u==="cm"?10:u==="in"?25.4:u==="pt"?25.4/72:1);}return null;}
function lexExpr(s){s=s.trim();const re=/\s*(?:(\d+(?:\.\d*)?|\.\d+)(%|mm|cm|in|pt|deg)?|([A-Za-z_][A-Za-z0-9_]*)|([()+\-*/ ,]))/gy,t=[];let p=0;while(p<s.length){re.lastIndex=p;const m=re.exec(s);if(!m)throw Error("Expressão inválida perto de "+s.slice(p,p+12));p=re.lastIndex;if(m[1]!==undefined)t.push({type:"num",v:Number(m[1]),u:m[2]||""});else if(m[3])t.push({type:"name",v:m[3]});else if(m[4]&&m[4]!==",")t.push({type:m[4],v:m[4]});else if(m[4]===",")t.push({type:",",v:","});}return t;}
function evalExpr(expr,ctx,axis="x",fallback=0){if(typeof expr==="number")return expr;if(typeof expr!=="string")return fallback;const literal=mm(expr);if(literal!==null)return literal;try{const t=lexExpr(expr);let i=0;const dim=axis==="y"?ctx.h:axis==="x"?ctx.w:axis==="short"?Math.min(ctx.w,ctx.h):1;const vars={W:ctx.w,H:ctx.h,i:ctx.i||0,j:ctx.j||0,pi:Math.PI,...(ctx.vars||{})};function atom(){const a=t[i++];if(!a)throw Error();if(a.type==="-")return-atom();if(a.type==="+")return atom();if(a.type==="("){const v=sum();if(t[i++]?.type!==")")throw Error();return v;}if(a.type==="num"){const u=a.u;return a.v*(u==="%"?dim/100:u==="cm"?10:u==="in"?25.4:u==="pt"?25.4/72:1);}if(a.type==="name"){if(t[i]?.type==="("){i++;const args=[];if(t[i]?.type!==")"){do{args.push(sum());if(t[i]?.type!==",")break;i++;}while(true);}if(t[i++]?.type!==")")throw Error();const f={abs:Math.abs,floor:Math.floor,ceil:Math.ceil,round:Math.round,sqrt:Math.sqrt,sin:v=>Math.sin(v*Math.PI/180),cos:v=>Math.cos(v*Math.PI/180),tan:v=>Math.tan(v*Math.PI/180),log10:Math.log10,min:Math.min,max:Math.max,mod:(a,b)=>a-Math.floor(a/b)*b,pow:Math.pow}[a.v];if(!f)throw Error();return f(...args);}if(!(a.v in vars))throw Error();return vars[a.v];}throw Error();}function product(){let v=atom();while(t[i]?.type==="*"||t[i]?.type==="/"){const op=t[i++].type,b=atom();v=op==="*"?v*b:v/b;}return v;}function sum(){let v=product();while(t[i]?.type==="+"||t[i]?.type==="-"){const op=t[i++].type,b=product();v=op==="+"?v+b:v-b;}return v;}const v=sum();if(i!==t.length||!Number.isFinite(v))return fallback;return v;}catch{return fallback;}}
function ctxVars(c){return{...previewValues,...(c.vars||{}),W:c.w,H:c.h,i:c.i??c.vars?.i??0,j:c.j??c.vars?.j??0};}
function resolveColor(v){if(v==null)return null;if(v==="ink")return $("inkColor").value;if(v==="accent")return $("accentColor").value;if(v==="none")return"none";if(Object.prototype.hasOwnProperty.call(previewValues,"$"+v))return previewValues["$"+v];return v;}
const COLOR_SWATCHES=["#262626","#ffffff","#4f7cff","#e5484d","#f59e0b","#16a34a","#0ea5e9","#8b5cf6","#ec4899","#9ca3af"];
function emitColorChange(input){input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));}
function renderColorChoices(inputId,mode="style"){
 const input=$(inputId),host=$(inputId+"Choices");if(!input||!host)return;host.replaceChildren();
 if(mode==="style"){
  const select=document.createElement("select");select.setAttribute("aria-label","Escolher tinta, destaque ou parâmetro de cor");
  const choices=[["","Aplicar cor…"],["ink","Tinta (ink)"],["accent","Destaque (accent)"]];choices.push(["none",inputId==="elementFill"?"Sem preenchimento (none)":"Sem traço (none)"]);
  for(const [name,p] of Object.entries(doc.params||{}))if(p.type==="color")choices.push([name,(p.label||name)+" · parâmetro"]);
  choices.forEach(([value,label])=>{const o=document.createElement("option");o.value=value;o.textContent=label;select.appendChild(o);});
  select.addEventListener("change",()=>{if(!select.value)return;input.value=select.value;emitColorChange(input);select.value="";});host.appendChild(select);
 }
 const palette=document.createElement("span");palette.className="color-swatch-row";
 COLOR_SWATCHES.forEach(color=>{const b=document.createElement("button");b.type="button";b.className="color-swatch";b.style.backgroundColor=color;b.title=color;b.setAttribute("aria-label","Usar cor "+color);b.addEventListener("click",()=>{input.value=color;emitColorChange(input);});palette.appendChild(b);});host.appendChild(palette);
}
function renderAllColorChoices(){[["elementStroke","style"],["elementFill","style"],["inkColor","literal"],["accentColor","literal"],["newParamDefault","literal"]].forEach(([id,mode])=>renderColorChoices(id,mode));$("newParamDefaultChoices")?.classList.toggle("hidden",$("newParamType").value!=="color");}
function mergedStyle(n,p={}){const out={...p};for(const k of ["stroke","strokeWidth","dash","fill","opacity","font","size","weight","italic","align","baseline","rotate"])if(n[k]!==undefined)out[k]=n[k];return out;}
function svgStyle(s){const o={};if(s.stroke!==undefined)o.stroke=resolveColor(s.stroke);if(s.strokeWidth!==undefined)o["stroke-width"]=evalExpr(s.strokeWidth,{w:1,h:1,vars:previewValues},"short",.25);if(s.fill!==undefined)o.fill=resolveColor(s.fill);if(s.opacity!==undefined)o.opacity=Math.max(0,Math.min(1,Number(s.opacity)));if(Array.isArray(s.dash)&&s.dash.length===2)o["stroke-dasharray"]=s.dash.map(v=>evalExpr(v,{w:1,h:1,vars:previewValues},"short",0)).join(" ");if(s.dash==="none")o["stroke-dasharray"]="none";if(s.size!==undefined)o["font-size"]=evalExpr(s.size,{w:1,h:1,vars:previewValues},"short",3.5);if(s.font)o["font-family"]=s.font==="mono"?"monospace":s.font==="serif"?"serif":"sans-serif";if(s.weight)o["font-weight"]=s.weight==="bold"?"700":s.weight;if(s.italic!==undefined)o["font-style"]=s.italic?"italic":"normal";if(s.align)o["text-anchor"]=s.align==="middle"?"middle":s.align==="end"?"end":"start";if(s.baseline)o["dominant-baseline"]=s.baseline==="middle"?"middle":s.baseline==="top"?"hanging":"alphabetic";return o;}
function svg(tag,attrs={},txt){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))if(v!==undefined&&v!==null)e.setAttribute(k,String(v));if(txt!==undefined)e.textContent=txt;return e;}
function applyClip(element,b){const id="xstudio-clip-"+(++clipSerial);let defs=paper.querySelector("defs");if(!defs){defs=svg("defs");paper.insertBefore(defs,paper.firstChild);}const cp=svg("clipPath",{id,clipPathUnits:"userSpaceOnUse"});cp.appendChild(svg("rect",{x:b.x,y:b.y,width:Math.max(0,b.w),height:Math.max(0,b.h)}));defs.appendChild(cp);element.setAttribute("clip-path","url(#"+id+")");return element;}
function nodeKey(path){return path.join(".");}
function getAt(path){return path?.reduce((o,k)=>o?.[k],doc);}
function toPath(s){return s.split(".").map((v,i)=>i%2===1&&/^\d+$/.test(v)?Number(v):v);}
function exprContext(box){return{...box,vars:{...previewValues,W:box.w,H:box.h,i:box.i||0,j:box.j||0}};}
function evalN(v,box,axis="x",fallback=0){return evalExpr(v,{...box,vars:ctxVars(box)},axis,fallback);}
function childrenRender(n,path,box,style){const g=svg("g");(n.children||[]).forEach((c,i)=>{const e=renderNode(c,path.concat(["children",i]),box,style);if(e)g.appendChild(e);});return g;}
function repeatPositions(start,size,period,count,fit,limit=500,extended=null,shift=0){
 if(period==null){const n=Math.floor(Number(count));if(!Number.isFinite(n)||n<1||n>limit)return[];const cell=size/n;return Array.from({length:n},(_,i)=>({index:i,pos:start+shift+i*cell,size:cell}));}
 if(period<.5||!Number.isFinite(period))return[];
 if(count!=null&&(!Number.isFinite(Number(count))||Number(count)<1||Number(count)>limit))return[];
 let n=Math.floor(size/period+1e-7);if(count!=null)n=Math.min(n,Math.floor(Number(count)));
 if(fit==="round"){n=count==null?Math.max(1,Math.round(size/period)):Math.floor(Number(count));if(n<1||n>limit)return[];const cell=size/n;return Array.from({length:n},(_,i)=>({index:i,pos:start+shift+i*cell,size:cell}));}
 if(fit==="space"){if(n<1)return[];if(n===1)return[{index:0,pos:start+shift+(size-period)/2,size:period}];const gap=(size-n*period)/(n-1);return Array.from({length:n},(_,i)=>({index:i,pos:start+shift+i*(period+gap),size:period}));}
 if(fit==="center"){if(n<1)return[];const off=(size-n*period)/2;return Array.from({length:n},(_,i)=>({index:i,pos:start+shift+off+i*period,size:period}));}
 let first=0,last=count==null?Math.ceil((size-shift)/period-1e-7):Math.floor(Number(count));
 if(extended){first=Math.floor((extended.lo-start-shift)/period+1e-7);last=Math.ceil((extended.hi-start-shift)/period-1e-7)-1;}
 const total=last-first+1;if(total<1||total>limit)return[];
 return Array.from({length:total},(_,i)=>{const k=first+i;return{index:k,pos:start+shift+k*period,size:period};});
}
function renderNode(n,path,box,parentStyle={stroke:"ink",strokeWidth:0.25,fill:null,opacity:1,font:"sans",size:3.5,weight:"normal",italic:false,align:"start",baseline:"alphabetic"}){if(!n||typeof n!=="object")return null;const type=n.type,st=mergedStyle(n,parentStyle),attrs=svgStyle(st),key=nodeKey(path),isSelected=selectedPaths.some(p=>nodeKey(p)===key),g=svg("g",{"data-path":key,class:"svg-node",tabindex:0,role:"button","aria-label":type||"element"});const x=evalN(n.x??0,box,"x"),y=evalN(n.y??0,box,"y"),w=evalN(n.w??"100%",box,"x",box.w),h=evalN(n.h??"100%",box,"y",box.h);
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
case"line":g.appendChild(svg("line",{...attrs,x1:box.x+evalN(n.x1??0,box,"x"),y1:box.y+evalN(n.y1??0,box,"y"),x2:box.x+evalN(n.x2??0,box,"x"),y2:box.y+evalN(n.y2??0,box,"y")}));break;
case"hline":{const yy=box.y+evalN(n.y??0,box,"y");g.appendChild(svg("line",{...attrs,x1:box.x+evalN(n.x1??0,box,"x"),y1:yy,x2:box.x+evalN(n.x2??"100%",box,"x"),y2:yy}));break;}
case"vline":{const xx=box.x+evalN(n.x??0,box,"x");g.appendChild(svg("line",{...attrs,x1:xx,y1:box.y+evalN(n.y1??0,box,"y"),x2:xx,y2:box.y+evalN(n.y2??"100%",box,"y")}));break;}
case"rect":g.appendChild(svg("rect",{...attrs,x:box.x+x,y:box.y+y,width:w,height:h,rx:evalN(n.rx??0,box,"short")}));break;
case"circle":case"ellipse":case"dot":{const cx=box.x+evalN(n.cx??0,box,"x"),cy=box.y+evalN(n.cy??0,box,"y"),rx=evalN(n.r??n.rx??"0.35mm",box,"short"),ry=type==="ellipse"?evalN(n.ry??"2mm",box,"short"):rx;const a={...attrs,cx,cy,rx,ry};if(type==="dot"){a.fill=resolveColor(n.fill||n.stroke||"ink");a.stroke="none";}g.appendChild(svg("ellipse",a));break;}
case"polyline":case"polygon":{let pts=n.points;if(typeof pts==="string")pts=pts.trim().split(/[\s,]+/).map(Number);if(Array.isArray(pts)){const values=[];for(const p of pts){if(Array.isArray(p))values.push(...p);else values.push(p);}const points=[];for(let i=0;i+1<values.length;i+=2)points.push((box.x+evalN(values[i],box,"x"))+","+(box.y+evalN(values[i+1],box,"y")));g.appendChild(svg(type,{...attrs,points:points.join(" ")}));}break;}
case"text":{const all=Array.isArray(n.text)?n.text:String(n.text??"");let text=Array.isArray(all)?all[Math.max(0,Math.min(all.length-1,Math.floor(evalN(n.select??"i",box,"plain"))))]||"":all;text=String(text).replace(/{{/g,"\u0001").replace(/}}/g,"\u0002").replace(/\{([^{}]+)\}/g,(_,expr)=>String(evalN(expr,box,"plain",0))).replace(/\u0001/g,"{").replace(/\u0002/g,"}");const tx=box.x+x,ty=box.y+y;const textAttrs={...attrs,x:tx,y:ty,fill:resolveColor(st.fill||st.stroke||"ink"),stroke:"none"};const t=svg("text",textAttrs);if(n.rotate!==undefined||st.rotate!==undefined)t.setAttribute("transform","rotate("+evalN(n.rotate??st.rotate,box,"plain")+" "+tx+" "+ty+")");t.textContent=text;g.appendChild(t);break;}
case"hatch":{const period=Math.max(.5,evalN(n.period,box,"short",4)),angle=evalN(n.angle??0,box,"plain"),offset=evalN(n.offset??0,box,"short"),theta=angle*Math.PI/180,dx=Math.cos(theta),dy=-Math.sin(theta),nx=Math.sin(theta),ny=Math.cos(theta),length=(n.extend?Math.hypot(pageSize[0],pageSize[1]):Math.hypot(box.w,box.h))*2;for(let k=-500;k<=500;k++){const d=k*period+offset,cx=box.x+box.w/2+nx*d,cy=box.y+box.h/2+ny*d;g.appendChild(svg("line",{...attrs,x1:cx-dx*length,y1:cy-dy*length,x2:cx+dx*length,y2:cy+dy*length}));if(d>length)break;}applyClip(g,n.extend?{x:0,y:0,w:pageSize[0],h:pageSize[1]}:box);break;}
case"path":{if(typeof n.d==="string"){const vb=Array.isArray(n.viewBox)?n.viewBox:typeof n.viewBox==="string"?n.viewBox.split(/[\s,]+/).map(Number):null;let transform="translate("+box.x+" "+box.y+")";if(vb&&vb.length===4&&vb[2]>0&&vb[3]>0){let sx=w/vb[2],sy=h/vb[3],tx=box.x+x,ty=box.y+y;if(n.aspect!=="stretch"){const scale=Math.min(sx,sy);sx=sy=scale;tx+=(w-vb[2]*scale)/2;ty+=(h-vb[3]*scale)/2;}tx-=vb[0]*sx;ty-=vb[1]*sy;transform="translate("+tx+" "+ty+") scale("+sx+" "+sy+")";}g.appendChild(svg("path",{...attrs,d:n.d,transform}));}break;}
}
if(n.rotate!==undefined&&type!=="text"){const rb=selectionBounds(n,box);g.setAttribute("transform","rotate("+evalN(n.rotate,box,"plain")+" "+(rb.x+rb.w/2)+" "+(rb.y+rb.h/2)+")");}const hitTypes=["rect","text","path","ellipse","circle","dot","line","hline","vline","polygon","polyline"];if(hitTypes.includes(type)||(isSelected&&["group","repeat"].includes(type))){const hb=selectionBounds(n,box);g.insertBefore(svg("rect",{class:"svg-hitbox",x:hb.x,y:hb.y,width:Math.max(2,hb.w),height:Math.max(2,hb.h),fill:"transparent",stroke:"none","pointer-events":"all"}),g.firstChild);}if(isSelected){const b=selectionBounds(n,box);g.appendChild(svg("rect",{class:"svg-selection",x:b.x,y:b.y,width:Math.max(1,b.w),height:Math.max(1,b.h)}));if(path.length===2&&["group","rect","path","ellipse","circle","dot","line","hline","vline","polyline","polygon"].includes(type)&&(b.w>1||b.h>1)){const hs=1.7,pts=[[b.x,b.y,"nw"],[b.x+b.w/2,b.y,"n"],[b.x+b.w,b.y,"ne"],[b.x+b.w,b.y+b.h/2,"e"],[b.x+b.w,b.y+b.h,"se"],[b.x+b.w/2,b.y+b.h,"s"],[b.x,b.y+b.h,"sw"],[b.x,b.y+b.h/2,"w"]],visiblePts=type==="hline"?pts.filter(p=>["e","w"].includes(p[2])):type==="vline"?pts.filter(p=>["n","s"].includes(p[2])):pts;for(const [hx,hy,id] of visiblePts)g.appendChild(svg("rect",{class:"transform-handle handle-"+id,"data-handle":id,x:hx-hs/2,y:hy-hs/2,width:hs,height:hs,rx:.25}));g.appendChild(svg("line",{class:"rotation-stem",x1:b.x+b.w/2,y1:b.y,x2:b.x+b.w/2,y2:b.y-5}));g.appendChild(svg("circle",{class:"transform-handle rotate-handle","data-handle":"rotate",cx:b.x+b.w/2,cy:b.y-5,r:1.5}));}}
return g;}
function selectionBounds(n,b){const t=n.type,x=b.x+evalN(n.x??0,b,"x"),y=b.y+evalN(n.y??0,b,"y"),w=evalN(n.w??"100%",b,"x",b.w),h=evalN(n.h??"100%",b,"y",b.h);if(t==="hline")return{x:b.x,y:b.y+evalN(n.y??0,b,"y"),w:b.w,h:0.6};if(t==="vline")return{x:b.x+evalN(n.x??0,b,"x"),y:b.y,w:0.6,h:b.h};if(t==="line"){const x1=evalN(n.x1??0,b,"x"),y1=evalN(n.y1??0,b,"y"),x2=evalN(n.x2??0,b,"x"),y2=evalN(n.y2??0,b,"y");return{x:b.x+Math.min(x1,x2),y:b.y+Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1)};}if(t==="text")return{x,y,w:Math.max(10,String(n.text||"").length*1.8),h:5};if(t==="ellipse"){const rx=evalN(n.rx??"15mm",b,"short"),ry=evalN(n.ry??"8mm",b,"short");return{x:b.x+evalN(n.cx??0,b,"x")-rx,y:b.y+evalN(n.cy??0,b,"y")-ry,w:2*rx,h:2*ry};}if(["circle","dot"].includes(t)){const r=evalN(n.r??"0.35mm",b,"short");return{x:b.x+evalN(n.cx??0,b,"x")-r,y:b.y+evalN(n.cy??0,b,"y")-r,w:2*r,h:2*r};}if(["polyline","polygon"].includes(t)){let values=n.points;if(typeof values==="string")values=values.trim().split(/[\s,]+/).map(Number);if(Array.isArray(values)){const flat=values.flat(Infinity),xs=[],ys=[];for(let i=0;i+1<flat.length;i+=2){xs.push(b.x+evalN(flat[i],b,"x"));ys.push(b.y+evalN(flat[i+1],b,"y"));}if(xs.length)return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}}return{x,y,w,h};}
function initializePreviewValues(){const previous=previewValues,next={};for(const [name,p] of Object.entries(doc.params||{})){const d=p.default;if(p.type==="color")next["$"+name]=previous["$"+name]||d||"#333333";else next[name]=previous[name]!==undefined?previous[name]:(typeof d==="number"?d:(mm(d,1) ?? (Number(d)||0)));}previewValues=next;}
function renderCanvas(){paper.replaceChildren();paper.setAttribute("viewBox","0 0 "+pageSize[0]+" "+pageSize[1]);paper.appendChild(svg("rect",{x:0,y:0,width:pageSize[0],height:pageSize[1],fill:"#fffefa"}));const box={x:0,y:0,w:pageSize[0],h:pageSize[1],vars:{...previewValues,W:pageSize[0],H:pageSize[1],i:0,j:0}};(doc.items||[]).forEach((n,i)=>{const e=renderNode(n,["items",i],box);if(e)paper.appendChild(e);});
if(smartGuides.x!==null)paper.appendChild(svg("line",{class:"smart-guide",x1:smartGuides.x,y1:0,x2:smartGuides.x,y2:pageSize[1]}));
if(smartGuides.y!==null)paper.appendChild(svg("line",{class:"smart-guide",x1:0,y1:smartGuides.y,x2:pageSize[0],y2:pageSize[1]}));}
function render(){renderCanvas();
$("pageDimensions").textContent=pageSize[0]+" × "+pageSize[1]+" mm";$("docName").textContent=doc.name||"Sem título";$("nodeStatus").textContent=countNodes(doc.items||[])+" nós";if(document.activeElement!==$("metaName"))$("metaName").value=doc.name||"";if(document.activeElement!==$("metaId"))$("metaId").value=doc.id||"";if(document.activeElement!==$("metaDescription"))$("metaDescription").value=doc.description||"";if(document.activeElement!==$("metaAuthor"))$("metaAuthor").value=doc.author||"";if(document.activeElement!==$("metaLicense"))$("metaLicense").value=doc.license||"";if(document.activeElement!==$("metaVersion"))$("metaVersion").value=doc.version||"";if(document.activeElement!==$("metaTags"))$("metaTags").value=(doc.tags||[]).join(", ");renderTree();renderInspector();renderParams();renderAllColorChoices();fitPaper();}
function countNodes(items){return items.reduce((sum,n)=>sum+1+((n.type==="group"||n.type==="repeat")?countNodes(n.children||[]):0),0);}
function renderTree(){
 const tree=$("tree");tree.replaceChildren();
 const branchTypes=new Set(["group","repeat"]);
 const roots=doc.items||[];
 if(!roots.length){
  const empty=document.createElement("div");empty.className="tree-empty";
  empty.textContent="Nenhum elemento. Use + ou clique com o botão direito para criar.";
  tree.appendChild(empty);
 }
 function add(n,path,depth){
  const key=nodeKey(path),children=branchTypes.has(n.type)?(n.children||[]):[],canExpand=children.length>0;
  const b=document.createElement("button");
  b.type="button";b.className="tree-item"+(selectedPaths.some(p=>nodeKey(p)===key)?" active":"");b.setAttribute("aria-pressed",String(selectedPaths.some(p=>nodeKey(p)===key)));
  b.dataset.path=key;b.draggable=true;b.style.paddingLeft=(6+depth*13)+"px";
  b.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",key);e.dataTransfer.effectAllowed="move";b.classList.add("tree-dragging");});
  b.addEventListener("dragend",()=>{b.classList.remove("tree-dragging");tree.querySelectorAll(".tree-drop-target").forEach(el=>el.classList.remove("tree-drop-target"));});
  b.addEventListener("dragover",e=>{const source=toPath(e.dataTransfer.getData("text/plain"));if(!source.length||nodeKey(source)===key||key.startsWith(nodeKey(source)+"."))return;e.preventDefault();e.dataTransfer.dropEffect="move";b.classList.add("tree-drop-target");});
  b.addEventListener("dragleave",()=>b.classList.remove("tree-drop-target"));
  b.addEventListener("drop",e=>{e.preventDefault();b.classList.remove("tree-drop-target");const source=toPath(e.dataTransfer.getData("text/plain")),target=toPath(b.dataset.path);if(!source.length||nodeKey(source)===nodeKey(target)||nodeKey(target).startsWith(nodeKey(source)+"."))return;moveTreeNode(source,target,branchTypes.has(n.type)&&(e.altKey||e.offsetY>b.clientHeight*.65));});
  const disclosure=document.createElement("span");disclosure.className="tree-disclosure";
  disclosure.textContent=canExpand?(collapsedTree.has(key)?"▸":"▾"):"";
  disclosure.title=canExpand?(collapsedTree.has(key)?"Expandir":"Recolher"):"";
  disclosure.setAttribute("aria-hidden","true");
  const symbols={group:"▣",repeat:"⠿",hline:"━",vline:"┃",line:"／",rect:"▱",circle:"○",ellipse:"◉",dot:"•",text:"T",path:"⌁",polygon:"⬡",polyline:"⌁",hatch:"⁄"};
  const icon=document.createElement("span");icon.className="tree-symbol";icon.textContent=symbols[n.type]||"◇";
  const label=document.createElement("span");label.className="tree-label";
  label.textContent=n.type==="text"?"Texto · "+(Array.isArray(n.text)?n.text[0]:n.text||""):n.type==="group"?"Grupo":n.type==="repeat"?"Repetição · "+(n.axis||"y"):n.type;
  const idx=document.createElement("span");idx.className="tree-index";idx.textContent=path[path.length-1];
  b.append(disclosure,icon,label,idx);
  b.addEventListener("click",e=>{
   if(canExpand&&e.target.closest(".tree-disclosure")){
    if(collapsedTree.has(key))collapsedTree.delete(key);else collapsedTree.add(key);
    renderTree();return;
   }
   selectFromTree(path,e);
  });
  tree.appendChild(b);
  if(canExpand&&!collapsedTree.has(key))children.forEach((c,i)=>add(c,path.concat(["children",i]),depth+1));
 }
 roots.forEach((n,i)=>add(n,["items",i],0));
 $("treeCount").textContent=selectedPaths.length>1?selectedPaths.length+" selecionados · "+countNodes(roots)+" elementos":countNodes(roots)+" elementos";
 const expand=$("expandTree");expand.textContent=collapsedTree.size?"＋":"−";
 expand.title=collapsedTree.size?"Expandir toda a estrutura":"Recolher os grupos";
}
function findNodePath(target){let found=null;function visit(items,parentPath){for(let i=0;i<items.length&&!found;i++){const n=items[i],path=parentPath.concat(i);if(n===target){found=path;return;}if(["group","repeat"].includes(n.type))visit(n.children||[],path.concat("children"));}}visit(doc.items||[],["items"]);return found;}
function moveTreeNode(source,target,intoTarget=false){
 const sourceArr=getAt(source.slice(0,-1)),targetArr=getAt(target.slice(0,-1));if(!Array.isArray(sourceArr)||!Array.isArray(targetArr))return;
 const sourceIndex=source.at(-1),targetIndex=target.at(-1),node=sourceArr[sourceIndex];if(!node)return;
 if(intoTarget){const parent=getAt(target);if(!parent||!["group","repeat"].includes(parent.type))return;sourceArr.splice(sourceIndex,1);(parent.children||(parent.children=[])).push(node);const newPath=findNodePath(node);selectedPath=newPath;selectedPaths=newPath?[newPath]:[];commit(()=>{});toast("Elemento movido para dentro do contêiner");return;}
 if(sourceArr!==targetArr){toast("Para reordenar, solte no mesmo nível; segure Alt ao soltar em um grupo para aninhar.");return;}
 sourceArr.splice(sourceIndex,1);const insertion=sourceIndex<targetIndex?targetIndex-1:targetIndex;sourceArr.splice(insertion,0,node);const parent=source.slice(0,-1),newPath=parent.concat(insertion);selectedPath=newPath;selectedPaths=[newPath];commit(()=>{});
}
function select(path){
 selectedPath=path;selectedPaths=path?[path.slice()]:[];
 if(path)for(let i=2;i<path.length;i+=2)collapsedTree.delete(nodeKey(path.slice(0,i)));
 render();setInspectorTab("properties");
}
function sameParent(a,b){return a.length===b.length&&a.slice(0,-1).every((v,i)=>v===b[i]);}
function selectFromTree(path,e){
 if(e.shiftKey&&selectedPath&&sameParent(path,selectedPath)){
  const siblings=[...$("tree").querySelectorAll(".tree-item")].map(b=>toPath(b.dataset.path)).filter(p=>sameParent(p,path));
  const a=siblings.findIndex(p=>nodeKey(p)===nodeKey(selectedPath)),b=siblings.findIndex(p=>nodeKey(p)===nodeKey(path));
  if(a>=0&&b>=0)selectedPaths=siblings.slice(Math.min(a,b),Math.max(a,b)+1);else selectedPaths=[path.slice()];
 }else if(e.ctrlKey||e.metaKey){
  const key=nodeKey(path),i=selectedPaths.findIndex(p=>nodeKey(p)===key);
  if(i>=0)selectedPaths.splice(i,1);else selectedPaths.push(path.slice());
 }else selectedPaths=[path.slice()];
 selectedPath=selectedPaths.length?selectedPaths[selectedPaths.length-1]:null;
 for(const p of selectedPaths)for(let i=2;i<p.length;i+=2)collapsedTree.delete(nodeKey(p.slice(0,i)));
 render();setInspectorTab("properties");
}
function getSiblingSelection(){
 if(!selectedPaths.length)return null;
 const paths=selectedPaths.slice().sort((a,b)=>a.at(-1)-b.at(-1));
 if(paths.some(p=>!sameParent(p,paths[0])))return null;
 const parentPath=paths[0].slice(0,-1),array=getAt(parentPath);
 if(!Array.isArray(array))return null;
 return {paths,parentPath,array,indices:paths.map(p=>p.at(-1))};
}
function groupSelection(){
 const s=getSiblingSelection();if(!s||s.indices.length<2){toast("Selecione ao menos dois elementos irmãos para agrupar.");return;}
 const nodes=s.indices.map(i=>s.array[i]),first=s.indices[0],group={type:"group",children:nodes};
 for(const i of [...s.indices].sort((a,b)=>b-a))s.array.splice(i,1);
 s.array.splice(first,0,group);selectedPath=s.parentPath.concat(first);selectedPaths=[selectedPath.slice()];commit(()=>{});setInspectorTab("properties");toast("Elementos agrupados.");
}
function getValue(n,k){if(n[k]===undefined)return"";return typeof n[k]==="object"?JSON.stringify(n[k]):String(n[k]);}
function renderInspector(){
 const n=getAt(selectedPath),has=!!n;
 $("emptySelection").classList.toggle("hidden",has);$("elementInspector").classList.toggle("hidden",!has);
 $("selectedType").textContent=has?(n.type||"NODE").toUpperCase():"—";if(!has){$("advancedInspector").replaceChildren();return;}
 $("elementType").value=n.type||"";
 for(const [id,k] of [["elementX","x"],["elementY","y"],["elementW","w"],["elementH","h"],["elementStroke","stroke"],["elementFill","fill"],["elementStrokeWidth","strokeWidth"],["elementOpacity","opacity"],["elementText","text"]])if(document.activeElement!==$(id))$(id).value=getValue(n,k);
 const dims={elementX:["group","repeat","rect","text","path"],elementY:["group","repeat","rect","text","path"],elementW:["group","rect","path"],elementH:["group","rect","path"]};
 for(const [id,types] of Object.entries(dims))$(id).disabled=!types.includes(n.type);
 $("elementText").disabled=n.type!=="text";renderAdvanced(n);
}
function renderAdvanced(n){
 const root=$("advancedInspector");root.replaceChildren();
 const heading=document.createElement("div");heading.className="advanced-heading";heading.textContent="GEOMETRIA E OPÇÕES";root.appendChild(heading);
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
   }catch(e){toast("Valor inválido: "+e.message);}
  });
  lab.appendChild(inp);root.appendChild(lab);
 }
 const row=(a,b)=>{const wrap=document.createElement("div");wrap.className="field-row";root.appendChild(wrap);function fieldIn(label,key,opt={}){const lab=document.createElement("label");lab.className="field";lab.append(document.createTextNode(label));const inp=document.createElement("input");inp.value=getValue(n,key);inp.addEventListener("change",()=>{if(inp.value.trim()==="")delete n[key];else if(opt.numeric&&Number.isFinite(Number(inp.value)))n[key]=Number(inp.value);else n[key]=inp.value;commit(()=>{});});lab.appendChild(inp);wrap.appendChild(lab);}fieldIn(a[0],a[1],a[2]||{});fieldIn(b[0],b[1],b[2]||{});};
 if(n.type==="group"){addField("Margem interna (inset)","inset",{wide:true,json:Array.isArray(n.inset)});addField("Recortar conteúdo (clip)","clip",{checkbox:true});}
 if(n.type==="repeat"){addField("Eixo","axis",{select:["x","y","xy","none"]});addField("Período (period)","period",{wide:true,json:Array.isArray(n.period)});addField("Contagem (count)","count",{wide:true,json:Array.isArray(n.count)});addField("Ajuste (fit)","fit",Array.isArray(n.fit)?{wide:true,json:true}:{select:["repeat","space","round","center"]});addField("Índice (alias)","index",{wide:true,json:Array.isArray(n.index)});addField("Deslocamento alternado (stagger)","stagger");addField("Estender até o papel (extend)","extend",{checkbox:true});}
 if(n.type==="line"){row(["X inicial","x1"],["Y inicial","y1"]);row(["X final","x2"],["Y final","y2"]);}
 if(n.type==="hline"){addField("Posição Y","y");row(["X inicial","x1"],["X final","x2"]);}
 if(n.type==="vline"){addField("Posição X","x");row(["Y inicial","y1"],["Y final","y2"]);}
 if(n.type==="rect")addField("Raio dos cantos (rx)","rx");
 if(["circle","dot"].includes(n.type)){row(["Centro X","cx"],["Centro Y","cy"]);addField("Raio (r)","r");}
 if(n.type==="ellipse"){row(["Centro X","cx"],["Centro Y","cy"]);row(["Raio X","rx"],["Raio Y","ry"]);}
 if(n.type==="text")addField("Índice do texto (select)","select");
 if(["polyline","polygon"].includes(n.type))addField("Pontos (lista de pares [x,y])","points",{wide:true,area:true,json:true});
 if(n.type==="path"){addField("Dados SVG (d)","d",{wide:true,area:true});addField("ViewBox [x,y,w,h]","viewBox",{wide:true,json:true});addField("Proporção","aspect",{select:["contain","stretch"]});}
 if(n.type==="hatch"){addField("Período","period",{json:Array.isArray(n.period)});addField("Ângulo (graus)","angle",{numeric:true});addField("Deslocamento","offset");addField("Estender além da caixa","extend",{checkbox:true});}
 const styleHead=document.createElement("div");styleHead.className="advanced-heading";styleHead.textContent="TIPOGRAFIA E TRAÇO";root.appendChild(styleHead);
 if(n.type==="text"){addField("Tamanho da fonte","size");addField("Peso","weight",{select:["normal","bold"]});addField("Fonte","font",{select:["sans","serif","mono"]});addField("Alinhamento","align",{select:["start","middle","end"]});addField("Linha de base","baseline",{select:["alphabetic","middle","top"]});addField("Itálico","italic",{checkbox:true});}
 addField("Rotação (graus)","rotate");
 addField("Tracejado [traço, espaço]","dash",{wide:true,json:Array.isArray(n.dash)});
}
function commit(fn){try{fn();validate(doc);const next=JSON.stringify(doc);if(!historyRestoring&&next!==historyState){undoStack.push(historyState);if(undoStack.length>100)undoStack.shift();redoStack.length=0;historyState=next;updateHistoryButtons();}setDirty(true);syncJson();render();setStatus("Alterações aplicadas");}catch(e){toast(e.message);}}
function updateHistoryButtons(){const u=$("undoBtn"),r=$("redoBtn");if(u)u.disabled=!undoStack.length;if(r)r.disabled=!redoStack.length;}
function resetHistory(){undoStack.length=0;redoStack.length=0;historyState=JSON.stringify(doc);updateHistoryButtons();}
function restoreHistory(target,source,label){if(!target.length)return;source.push(JSON.stringify(doc));const state=target.pop();historyRestoring=true;try{doc=JSON.parse(state);historyState=state;selectedPath=null;selectedPaths=[];setDirty(true);initializePreviewValues();syncJson();render();setInspectorTab("properties");setStatus(label);updateHistoryButtons();}finally{historyRestoring=false;}}
function undo(){restoreHistory(undoStack,redoStack,"Desfeito");}
function redo(){restoreHistory(redoStack,undoStack,"Refeito");}
$("undoBtn")?.addEventListener("click",undo);$("redoBtn")?.addEventListener("click",redo);
function updateNode(k,v){const n=getAt(selectedPath);if(!n)return;if(v.trim()===""){delete n[k];return;}if(["opacity"].includes(k)&&Number.isFinite(Number(v)))n[k]=Number(v);else if(k==="text")n[k]=v;else n[k]=v;}
[["elementX","x"],["elementY","y"],["elementW","w"],["elementH","h"],["elementStroke","stroke"],["elementFill","fill"],["elementStrokeWidth","strokeWidth"],["elementOpacity","opacity"],["elementText","text"]].forEach(([id,k])=>$(id).addEventListener("change",e=>commit(()=>updateNode(k,e.target.value))));
function setInspectorTab(tab){activeInspector=tab;document.querySelectorAll(".right-tab").forEach(b=>b.classList.toggle("active",b.dataset.inspector===tab));$("propertiesPanel").classList.toggle("hidden",tab!=="properties");$("paramsPanel").classList.toggle("hidden",tab!=="params");$("documentPanel").classList.toggle("hidden",tab!=="document");}
document.querySelectorAll(".right-tab").forEach(b=>b.addEventListener("click",()=>setInspectorTab(b.dataset.inspector)));
function renderParams(){const root=$("paramsEditor");root.replaceChildren();const params=doc.params||(doc.params={});const entries=Object.entries(params);if(!entries.length){const p=document.createElement("p");p.className="param-empty";p.textContent="Este template não define parâmetros. Adicione um para expor valores configuráveis sem editar a estrutura dos elementos.";root.appendChild(p);}entries.forEach(([name,p])=>{const card=document.createElement("div");card.className="param-card";const head=document.createElement("div");head.className="param-card-head";const code=document.createElement("code");code.textContent=name;const del=document.createElement("button");del.textContent="×";del.title="Remover parâmetro";del.addEventListener("click",()=>{if(!confirm("Remover o parâmetro "+name+"?"))return;delete doc.params[name];delete previewValues[name];delete previewValues["$"+name];commit(()=>{});});head.append(code,del);card.appendChild(head);const grid=document.createElement("div");grid.className="param-grid";function field(label,value,key,wide=false,type="text"){const lab=document.createElement("label");if(wide)lab.className="wide";lab.append(document.createTextNode(label));const inp=document.createElement("input");inp.type=type;const isLength=p.type==="length"&&["default","min","max","step"].includes(key);inp.type=isLength?"number":type;if(isLength)inp.step="any";inp.value=isLength&&value!==undefined&&value!==""?(mm(value)??(Number.isFinite(Number(value))?Number(value):"")):value??"";if(key==="default"&&p.type==="color")inp.type="text";if(key==="default"&&["number","integer"].includes(p.type))inp.type="number";if(["min","max","step"].includes(key)&&["number","integer"].includes(p.type))inp.type="number";inp.addEventListener("change",()=>{commit(()=>{if(inp.value===""){if(key==="default"&&p.type==="color")throw Error("Informe uma cor hexadecimal, por exemplo #4f7cff.");delete p[key];}else if(isLength&&Number.isFinite(Number(inp.value)))p[key]=Number(inp.value)+"mm";else if(["min","max","step"].includes(key)&&p.type!=="color"&&Number.isFinite(Number(inp.value)))p[key]=Number(inp.value);else if(key==="default"&&p.type==="color"){if(!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(inp.value))throw Error("Use uma cor hexadecimal, por exemplo #4f7cff.");p[key]=inp.value;}else if(key==="default"&&["number","integer"].includes(p.type)&&Number.isFinite(Number(inp.value)))p[key]=p.type==="integer"?Math.round(Number(inp.value)):Number(inp.value);else p[key]=inp.value;if(key==="default"){delete previewValues[name];delete previewValues["$"+name];initializePreviewValues();}});});lab.appendChild(inp);if(key==="default"&&p.type==="color"){const palette=document.createElement("span");palette.className="color-swatch-row";COLOR_SWATCHES.forEach(color=>{const b=document.createElement("button");b.type="button";b.className="color-swatch";b.style.backgroundColor=color;b.title=color;b.setAttribute("aria-label","Usar cor "+color);b.addEventListener("click",()=>{inp.value=color;emitColorChange(inp);});palette.appendChild(b);});lab.appendChild(palette);}grid.appendChild(lab);}const typelab=document.createElement("label");typelab.textContent="Tipo";const sel=document.createElement("select");["length","number","integer","color"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o);});sel.value=p.type||"length";sel.addEventListener("change",()=>commit(()=>{p.type=sel.value;p.default=sel.value==="color"?"#4f7cff":sel.value==="length"?"5mm":1;delete previewValues[name];delete previewValues["$"+name];initializePreviewValues();}));typelab.appendChild(sel);grid.appendChild(typelab);field("Rótulo",p.label||"", "label",true);const roleLabel=document.createElement("label");roleLabel.className="wide";roleLabel.append(document.createTextNode("Papel no template"));const roleSelect=document.createElement("select");[["","Padrão"],["spacing","Espaçamento principal"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;roleSelect.appendChild(option);});roleSelect.value=p.role||"";const spacingOwner=Object.entries(doc.params||{}).find(([otherName,other])=>other.role==="spacing"&&otherName!==name);roleSelect.querySelector('option[value="spacing"]').disabled=p.type!=="length"||!!spacingOwner;if(p.type!=="length")roleSelect.value="";roleSelect.addEventListener("change",()=>commit(()=>{if(roleSelect.value)p.role=roleSelect.value;else delete p.role;}));roleLabel.appendChild(roleSelect);grid.appendChild(roleLabel);field("Padrão",p.default??"", "default",true,"text");if(p.type!=="color"){field("Mínimo",p.min??"","min");field("Máximo",p.max??"","max");field("Passo",p.step??"","step");}const live=document.createElement("label");live.className="wide";live.textContent=p.type==="length"?"Valor de pré-visualização (mm)":"Valor de pré-visualização";if(p.type==="color"){const row=document.createElement("span");row.className="param-color";const inp=document.createElement("input");inp.type="text";inp.value=previewValues["$"+name]||p.default||"#4f7cff";const val=document.createElement("code");val.textContent=inp.value;const choices=document.createElement("span");choices.className="color-swatch-row";COLOR_SWATCHES.forEach(color=>{const b=document.createElement("button");b.type="button";b.className="color-swatch";b.style.backgroundColor=color;b.title=color;b.setAttribute("aria-label","Usar cor "+color);b.addEventListener("click",()=>{inp.value=color;inp.dispatchEvent(new Event("input",{bubbles:true}));});choices.appendChild(b);});inp.addEventListener("input",()=>{if(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(inp.value)){previewValues["$"+name]=inp.value;val.textContent=inp.value;renderCanvas();}else val.textContent="Hex inválido";});row.append(inp,val,choices);live.appendChild(row);}else{const inp=document.createElement("input");inp.type="number";inp.step=p.type==="integer"?"1":"any";inp.min=p.min!==undefined?String(p.type==="length"?(mm(p.min)??p.min):p.min):"";inp.max=p.max!==undefined?String(p.type==="length"?(mm(p.max)??p.max):p.max):"";inp.value=previewValues[name]??p.default??"";inp.addEventListener("change",()=>{let v=p.type==="length"?(mm(inp.value)??(Number(inp.value)||0)):Number(inp.value);const low=p.min===undefined?null:(p.type==="length"?(mm(p.min)??Number(p.min)):Number(p.min)),high=p.max===undefined?null:(p.type==="length"?(mm(p.max)??Number(p.max)):Number(p.max));if(Number.isFinite(low))v=Math.max(low,v);if(Number.isFinite(high))v=Math.min(high,v);if(p.type==="integer")v=Math.round(v);previewValues[name]=Number.isFinite(v)?v:0;renderCanvas();});live.appendChild(inp);}grid.appendChild(live);card.appendChild(grid);const usage=document.createElement("div");usage.className="param-usage";const uses=[];function scanUses(nodes,path="items"){(nodes||[]).forEach((node,index)=>{if(!node||typeof node!=="object")return;const nodePath=path+"["+index+"]";for(const prop of ["stroke","fill"]){if(p.type==="color"&&node[prop]===name)uses.push({type:node.type,prop,nodePath});}if(p.type!=="color"){for(const [prop,value] of Object.entries(node)){if(["children","type","stroke","fill","font","weight","align","baseline"].includes(prop)||typeof value!=="string")continue;const re=new RegExp("(^|[^A-Za-z0-9_])"+name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^A-Za-z0-9_]|$)");if(re.test(value))uses.push({type:node.type,prop,nodePath});}}if(Array.isArray(node.children))scanUses(node.children,nodePath+".children");});}scanUses(doc.items);const usageTitle=document.createElement("b");usageTitle.textContent=uses.length?"Onde é usado":"Ainda não está vinculado";usage.appendChild(usageTitle);const usageText=document.createElement("p");usageText.textContent=uses.length?uses.slice(0,5).map(u=>u.type+" · "+u.prop+" · "+u.nodePath).join("\n")+(uses.length>5?"\n+ "+(uses.length-5)+" uso(s)":""):(p.type==="color"?"Para vincular, selecione um elemento e escolha este parâmetro no campo Traço ou Preenchimento.":"Para vincular, use o nome "+name+" em uma medida ou expressão de um elemento, por exemplo: "+name+" * 2.");usage.appendChild(usageText);card.appendChild(usage);root.appendChild(card);});}
const paramCreateForm=$("paramCreateForm");
function syncParamRoleOption(){const option=$("newParamRole").querySelector('option[value="spacing"]');if(!option)return;const name=$("newParamName").value.trim(),owner=Object.entries(doc.params||{}).some(([key,p])=>key!==name&&p.role==="spacing");option.disabled=$("newParamType").value!=="length"||owner;if(option.disabled&&$("newParamRole").value==="spacing")$("newParamRole").value="";}
function resetParamForm(){paramCreateForm.reset();$("newParamName").value="";$("newParamLabel").value="";$("newParamType").value="length";$("newParamDefault").value=5;$("newParamMin").value="";$("newParamMax").value="";$("newParamDefault").type="number";$("newParamDefault").min="0";$("newParamDefault").step="any";["newParamMin","newParamMax"].forEach(id=>{const input=$(id);input.type="number";input.step="any";input.min="0";input.placeholder="mm";});$("newParamRole").value="";$("newParamError").classList.add("hidden");$("newParamLimits").classList.remove("hidden");renderColorChoices("newParamDefault","literal");$("newParamDefaultChoices").classList.add("hidden");syncParamRoleOption();}
function updateParamFormType(){const type=$("newParamType").value,defaults={length:"5mm",color:"#4f7cff",number:"1",integer:"1"};$("newParamDefault").type=type==="color"?"text":(["number","integer","length"].includes(type)?"number":"text");$("newParamDefault").step=type==="integer"?"1":"any";$("newParamDefault").min=type==="length"?"0":"";$("newParamDefault").value=type==="length"?5:defaults[type];renderColorChoices("newParamDefault","literal");$("newParamDefaultChoices").classList.toggle("hidden",type!=="color");["newParamMin","newParamMax"].forEach(id=>{const input=$(id);input.type=type==="color"?"text":"number";input.step="any";input.min=type==="length"?"0":"";input.placeholder=type==="length"?"mm":"Opcional";});$("newParamLimits").classList.toggle("hidden",type==="color");syncParamRoleOption();}
$("addParam").addEventListener("click",()=>{resetParamForm();paramCreateForm.classList.remove("hidden");$("newParamName").focus();});
$("cancelAddParam").addEventListener("click",()=>paramCreateForm.classList.add("hidden"));
$("newParamType").addEventListener("change",updateParamFormType);
paramCreateForm.addEventListener("submit",e=>{e.preventDefault();const name=$("newParamName").value.trim(),label=$("newParamLabel").value.trim(),type=$("newParamType").value,rawDefault=$("newParamDefault").value.trim(),rawMin=$("newParamMin").value.trim(),rawMax=$("newParamMax").value.trim(),error=$("newParamError");let message="";
 if(!/^[A-Za-z_][A-Za-z0-9_]{0,47}$/.test(name))message="Use um nome iniciado por letra ou _, sem espaços.";
 else if(["W","H","i","j","pi"].includes(name))message="Esse nome é reservado pelo mecanismo de expressões.";
 else if(Object.hasOwn(doc.params||{},name))message="Já existe um parâmetro com esse nome.";
 let def=rawDefault,min,max;
 if(!message&&type==="length"&&(!Number.isFinite(Number(rawDefault))||Number(rawDefault)<0))message="Informe uma medida em milímetros maior ou igual a zero.";
 if(!message&&type==="color"&&!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(rawDefault))message="Informe uma cor hexadecimal, por exemplo #4f7cff.";
 if(!message&&["number","integer"].includes(type)&&!Number.isFinite(Number(rawDefault)))message="O valor padrão precisa ser numérico.";
 if(!message&&type==="integer"&&!Number.isInteger(Number(rawDefault)))message="O valor padrão precisa ser um número inteiro.";
 const parseLimit=(v,which)=>{if(!v)return null;const n=Number(v);return Number.isFinite(n)?n:null;};
 if(!message&&type!=="color"){min=parseLimit(rawMin,"min");max=parseLimit(rawMax,"max");if(rawMin&&min===null)message="O mínimo não é válido para esse tipo.";else if(rawMax&&max===null)message="O máximo não é válido para esse tipo.";else if(min!==null&&max!==null&&min>max)message="O mínimo não pode ser maior que o máximo.";else if(min!==null&&Number(rawDefault)<min)message="O padrão está abaixo do mínimo.";else if(max!==null&&Number(rawDefault)>max)message="O padrão está acima do máximo.";}
 if(message){error.textContent=message;error.classList.remove("hidden");return;}
 const param={type,default:type==="length"?Number(rawDefault)+"mm":type==="color"?rawDefault:(type==="integer"?Math.round(Number(rawDefault)):Number(rawDefault)),label:label||name};if(min!==null&&min!==undefined)param.min=type==="length"?min+"mm":min;if(max!==null&&max!==undefined)param.max=type==="length"?max+"mm":max;if($("newParamRole").value)param.role=$("newParamRole").value;
 if(!doc.params)doc.params={};doc.params[name]=param;initializePreviewValues();commit(()=>{});paramCreateForm.classList.add("hidden");setInspectorTab("params");toast("Parâmetro '"+name+"' criado.");});
const validate = validateTemplate;
function renderJsonInput(){
 const source=jsonEditor.value;
 try{
  const next=JSON.parse(source);
  validate(next);
  const serialized=JSON.stringify(next);
  if(serialized!==JSON.stringify(doc)){
   if(!historyRestoring&&serialized!==historyState){
    undoStack.push(historyState);
    if(undoStack.length>100)undoStack.shift();
    redoStack.length=0;
    historyState=serialized;
   }
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
$("formatJson").addEventListener("click",()=>{try{const next=JSON.parse(jsonEditor.value);validate(next);doc=next;syncJson();initializePreviewValues();render();setDirty(true);toast("JSON formatado.");}catch(e){toast("JSON inválido: "+e.message);}});
$("resetJson").addEventListener("click",()=>{syncJson();initializePreviewValues();render();toast("Editor JSON revertido para a última versão válida.");});
function toggleSplit(force){split=force===undefined?!split:force;$("jsonPane").classList.toggle("hidden",!split);$("splitToggle").classList.toggle("active",split);$("splitToggle").querySelector("span").textContent=split?"Fechar JSON":"Editor dividido";if(split){syncJson();$("jsonEditor").focus();}fitPaper();}
$("splitToggle").addEventListener("click",()=>toggleSplit());
$("metaName").addEventListener("change",e=>commit(()=>doc.name=e.target.value.trim()||"Untitled"));$("metaId").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.id=e.target.value;else delete doc.id;}));$("metaDescription").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.description=e.target.value;else delete doc.description;}));$("metaAuthor").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.author=e.target.value;else delete doc.author;}));$("metaLicense").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.license=e.target.value;else delete doc.license;}));$("metaVersion").addEventListener("change",e=>commit(()=>{if(e.target.value)doc.version=e.target.value;else delete doc.version;}));$("metaTags").addEventListener("change",e=>commit(()=>{doc.tags=e.target.value.split(",").map(s=>s.trim()).filter(Boolean);}));
["inkColor","accentColor"].forEach(id=>$(id).addEventListener("input",()=>{if(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test($(id).value))renderCanvas();}));
function addNode(type){const n=createDefaultNode(type);if(!n){toast("Tipo de elemento não suportado: "+type);return;}const parent=selectedPath&&["group","repeat"].includes(getAt(selectedPath)?.type)?getAt(selectedPath):null;const arr=parent?parent.children:(doc.items||(doc.items=[]));arr.push(n);selectedPath=parent?selectedPath.concat(["children",arr.length-1]):["items",arr.length-1];selectedPaths=[selectedPath.slice()];commit(()=>{});setInspectorTab("properties");setStatus("Elemento adicionado");}
$("addElement").addEventListener("click",()=>$("addMenu").classList.toggle("hidden"));$("addMenu").addEventListener("click",e=>{if(e.target.dataset.add)addNode(e.target.dataset.add);});
$("deleteElement").addEventListener("click",()=>{if(!selectedPaths.length)return;const s=getSiblingSelection();if(selectedPaths.length>1&&!s){toast("Para remover vários elementos juntos, selecione itens do mesmo grupo.");return;}if(s&&selectedPaths.length>1){for(const i of [...s.indices].sort((a,b)=>b-a))s.array.splice(i,1);}else{const pp=selectedPath.slice(0,-1),idx=selectedPath.at(-1),parent=getAt(pp);if(!Array.isArray(parent))return;parent.splice(idx,1);}selectedPath=null;selectedPaths=[];commit(()=>{});});
$("duplicateElement").addEventListener("click",()=>{if(!selectedPaths.length)return;const s=getSiblingSelection();if(selectedPaths.length>1&&!s){toast("Para duplicar vários elementos juntos, selecione itens do mesmo grupo.");return;}if(s&&selectedPaths.length>1){const copies=s.indices.map(i=>clone(s.array[i])),at=s.indices.at(-1)+1;s.array.splice(at,0,...copies);selectedPaths=copies.map((_,i)=>s.parentPath.concat(at+i));selectedPath=selectedPaths.at(-1);commit(()=>{});toast(copies.length+" elementos duplicados.");return;}const pp=selectedPath.slice(0,-1),idx=selectedPath.at(-1),parent=getAt(pp);if(!Array.isArray(parent))return;parent.splice(idx+1,0,clone(getAt(selectedPath)));selectedPath=pp.concat([idx+1]);selectedPaths=[selectedPath.slice()];commit(()=>{});});
$("expandTree").addEventListener("click",()=>{
 if(collapsedTree.size)collapsedTree.clear();
 else{
  function walk(items,path=[]){items.forEach((n,i)=>{const p=path.concat(path.length?["children",i]:["items",i]);if(["group","repeat"].includes(n.type)&&(n.children||[]).length){collapsedTree.add(nodeKey(p));walk(n.children,p);}});}
  walk(doc.items||[]);
 }
 renderTree();
});

function snapToGuides(proposed,excludedPaths=[]){
 const tolerance=2.4,ignored=new Set(excludedPaths.map(nodeKey)),xEdges=[proposed.x,proposed.x+proposed.w/2,proposed.x+proposed.w],yEdges=[proposed.y,proposed.y+proposed.h/2,proposed.y+proposed.h];
 const targetsX=[0,pageSize[0]/2,pageSize[0]],targetsY=[0,pageSize[1]/2,pageSize[1]];
 (doc.items||[]).forEach((node,i)=>{const path=["items",i];if(ignored.has(nodeKey(path)))return;const b=transformGeometry(node,path);if(!b)return;targetsX.push(b.x,b.x+b.w/2,b.x+b.w);targetsY.push(b.y,b.y+b.h/2,b.y+b.h);});
 let bestX=null,bestY=null;for(const x of xEdges)for(const target of targetsX){const shift=target-x;if(Math.abs(shift)<=tolerance&&(!bestX||Math.abs(shift)<Math.abs(bestX.shift)))bestX={shift,guide:target};}for(const y of yEdges)for(const target of targetsY){const shift=target-y;if(Math.abs(shift)<=tolerance&&(!bestY||Math.abs(shift)<Math.abs(bestY.shift)))bestY={shift,guide:target};}
 return{dx:bestX?.shift||0,dy:bestY?.shift||0,guides:{x:bestX?.guide??null,y:bestY?.guide??null}};
}
const draggableTypes=new Set(["group","rect","path","text","ellipse","circle","dot","line","hline","vline","polyline","polygon"]);
paper.addEventListener("pointerdown",e=>{
 if(activeTool==="curve"){
  e.preventDefault();e.stopImmediatePropagation();handlePenPointerDown(e);return;
 }
 const g=e.target.closest("[data-path]");
 if(!g){if(activeTool!=="select"||e.button!==0)return;const r=paper.getBoundingClientRect(),pt={x:(e.clientX-r.left)*pageSize[0]/r.width,y:(e.clientY-r.top)*pageSize[1]/r.height};marqueeState={pointerId:e.pointerId,start:pt,current:pt};const rect=svg("rect",{id:"marquee-selection",class:"marquee-selection",x:pt.x,y:pt.y,width:0,height:0});paper.appendChild(rect);paper.setPointerCapture(e.pointerId);e.preventDefault();return;}
 const path=toPath(g.dataset.path),n=getAt(path),handle=e.target.closest("[data-handle]")?.dataset.handle,key=nodeKey(path);
 if(e.ctrlKey||e.metaKey||e.shiftKey){selectFromTree(path,e);return;}
 const multi= !handle&&selectedPaths.length>1&&selectedPaths.some(p=>nodeKey(p)===key)&&selectedPaths.every(p=>p.length===2)&&selectedPaths.every(p=>sameParent(p,selectedPaths[0]));
 if(!multi)select(path);
 if(!n||path.length!==2||!draggableTypes.has(n.type))return;
 const box=paper.getBoundingClientRect(),bounds=transformGeometry(n);
 const sx=pageSize[0]/box.width,sy=pageSize[1]/box.height;
 const paths=multi?selectedPaths.map(p=>p.slice()):[path.slice()];
 const items=paths.map(p=>({path:p,origin:clone(getAt(p)),bounds:transformGeometry(getAt(p),p)}));
 drag={path,mode:handle?"transform":"move",handle,startX:e.clientX,startY:e.clientY,sx,sy,bounds,origin:clone(n),items,moved:false,
  startAngle:Math.atan2((e.clientY-box.top)*sy-(bounds.y+bounds.h/2),(e.clientX-box.left)*sx-(bounds.x+bounds.w/2))*180/Math.PI};
 paper.setPointerCapture(e.pointerId);if(handle)e.preventDefault();
});
paper.addEventListener("pointermove",e=>{
 if(curveState&&curveState.pointerId===e.pointerId){const p=curveState.points[curveState.activeIndex];if(p){const pt=pagePoint(e);p.hx=pt.x-p.x;p.hy=pt.y-p.y;renderPenPreview();}e.stopImmediatePropagation();return;}
 if(marqueeState&&marqueeState.pointerId===e.pointerId){const r=paper.getBoundingClientRect();marqueeState.current={x:(e.clientX-r.left)*pageSize[0]/r.width,y:(e.clientY-r.top)*pageSize[1]/r.height};const a=marqueeState.start,b=marqueeState.current,el=paper.querySelector("#marquee-selection");if(el){el.setAttribute("x",Math.min(a.x,b.x));el.setAttribute("y",Math.min(a.y,b.y));el.setAttribute("width",Math.abs(b.x-a.x));el.setAttribute("height",Math.abs(b.y-a.y));}return;}
 if(!drag)return;const n=getAt(drag.path);if(!n)return;
 const dx=(e.clientX-drag.startX)*drag.sx,dy=(e.clientY-drag.startY)*drag.sy;
 if(Math.abs(dx)+Math.abs(dy)>.4)drag.moved=true;if(!drag.moved)return;
 if(drag.mode==="move"&&drag.items?.length>1){
  for(const item of drag.items)Object.assign(getAt(item.path),clone(item.origin));
  const g=drag.bounds,proposed={x:g.x+dx,y:g.y+dy,w:g.w,h:g.h},snap=snapToGuides(proposed,drag.items.map(item=>item.path));
  dx+=snap.dx;dy+=snap.dy;smartGuides=snap.guides;
  for(const item of drag.items)moveBy(getAt(item.path),dx,dy,parentBoxForPath(item.path));render();return;
 }
 const base=drag.origin,g=drag.bounds,type=base.type,fmt=v=>Number(v.toFixed(2))+"mm",box=transformContext();
 Object.assign(n,clone(base));
 if(drag.mode==="move"){
  const proposed={x:g.x+dx,y:g.y+dy,w:g.w,h:g.h},snap=snapToGuides(proposed,[drag.path]);dx+=snap.dx;dy+=snap.dy;smartGuides=snap.guides;
  moveBy(n,dx,dy);
}
 else if(drag.handle==="rotate"){
  const r=paper.getBoundingClientRect(),px=(e.clientX-r.left)*drag.sx,py=(e.clientY-r.top)*drag.sy,cx=g.x+g.w/2,cy=g.y+g.h/2;
  const angle=Math.atan2(py-cy,px-cx)*180/Math.PI;
  n.rotate=Math.round((Number(base.rotate)||0)+angle-drag.startAngle);
 }else{
  let left=g.x,right=g.x+g.w,top=g.y,bottom=g.y+g.h,h=drag.handle;
  if(h.includes("w"))left=Math.min(right-1,left+dx);
  if(h.includes("e"))right=Math.max(left+1,right+dx);
  if(h.includes("n"))top=Math.min(bottom-1,top+dy);
  if(h.includes("s"))bottom=Math.max(top+1,bottom+dy);
  if(type==="circle"||type==="dot"){
   const size=Math.max(1,right-left,bottom-top);
   const cx=h.includes("w")?g.x+g.w:g.x;
   const cy=h.includes("n")?g.y+g.h:g.y;
   const x0=h.includes("w")?cx-size:cx, y0=h.includes("n")?cy-size:cy;
   n.r=fmt(size/2);n.cx=fmt(x0+size/2);n.cy=fmt(y0+size/2);
  }else if(type==="ellipse"){
   n.rx=fmt(Math.max(1,right-left)/2);n.ry=fmt(Math.max(1,bottom-top)/2);
   n.cx=fmt(left+(right-left)/2);n.cy=fmt(top+(bottom-top)/2);
  }else if(type==="line"){
   const src=drag.origin,srcX1=evalN(src.x1??0,box,"x"),srcX2=evalN(src.x2??0,box,"x"),srcY1=evalN(src.y1??0,box,"y"),srcY2=evalN(src.y2??0,box,"y");
   const xs=Math.sign(srcX2-srcX1)||1,ys=Math.sign(srcY2-srcY1)||1,w=right-left,hg=bottom-top;
   n.x1=fmt(xs<0?left+w:left);n.x2=fmt(xs<0?left:left+w);n.y1=fmt(ys<0?top+hg:top);n.y2=fmt(ys<0?top:top+hg);
  }else if(type==="hline"){if(!h.includes("n")&&!h.includes("s")){n.x1=fmt(left);n.x2=fmt(right);}}
  else if(type==="vline"){if(!h.includes("e")&&!h.includes("w")){n.y1=fmt(top);n.y2=fmt(bottom);}}
  else if(["polyline","polygon"].includes(type)){const points=Array.isArray(base.points)?base.points.flat(Infinity):String(base.points??"").trim().split(/[\s,]+/).map(Number),out=[];for(let i=0;i+1<points.length;i+=2){const px=evalN(points[i],box,"x"),py=evalN(points[i+1],box,"y"),nx=g.w>0?left+(px-g.x)*((right-left)/g.w):left,ny=g.h>0?top+(py-g.y)*((bottom-top)/g.h):top;out.push([fmt(nx-box.x),fmt(ny-box.y)]);}n.points=out;}
  else{n.x=fmt(left);n.y=fmt(top);n.w=fmt(right-left);n.h=fmt(bottom-top);}
 }
 render();
});
paper.addEventListener("pointerup",e=>{if(curveState&&curveState.pointerId===e.pointerId){curveState.pointerId=null;e.stopImmediatePropagation();return;}if(marqueeState&&marqueeState.pointerId===e.pointerId){const state=marqueeState;marqueeState=null;$("marquee-selection")?.remove();const a=state.start,b=state.current,box={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)};selectedPaths=box.w<1&&box.h<1?[]:(doc.items||[]).map((n,i)=>({n,path:["items",i]})).filter(({n,path})=>{const g=transformGeometry(n,path);return g&&g.x+g.w>=box.x&&g.x<=box.x+box.w&&g.y+g.h>=box.y&&g.y<=box.y+box.h;}).map(x=>x.path);selectedPath=selectedPaths.at(-1)||null;render();setInspectorTab("properties");return;}if(drag){const moved=drag.moved;drag=null;smartGuides={x:null,y:null};if(moved)commit(()=>{});render();}});
paper.addEventListener("pointercancel",e=>{if(marqueeState&&marqueeState.pointerId===e.pointerId){marqueeState=null;$("marquee-selection")?.remove();}if(drag){drag=null;smartGuides={x:null,y:null};render();}});
$("openBtn").addEventListener("click",()=>$("fileInput").click());$("fileInput").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;if(dirty&&!confirm("Há alterações não exportadas. Abrir outro arquivo mesmo assim?")){e.target.value="";return;}try{if(f.size>1048576)throw Error("O arquivo excede 1 MiB.");const parsed=JSON.parse(await f.text());validate(parsed);doc=parsed;selectedPath=null;selectedPaths=[];setDirty(false);resetHistory();previewValues={};initializePreviewValues();syncJson();render();document.querySelectorAll(".template-card").forEach(b=>b.classList.remove("active"));setStatus("Arquivo aberto: "+f.name);toast("Template carregado.");}catch(err){toast("Não foi possível abrir: "+err.message);}e.target.value="";});
$("saveBtn").addEventListener("click",()=>{try{const current=JSON.parse(jsonEditor.value);validate(current);doc=current;const blob=new Blob([JSON.stringify(doc,null,2)+"\n"],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=((doc.name||"template").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"template")+".xtemplate";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setDirty(false);toast("Template exportado.");setStatus("Exportação concluída");}catch(e){toast(e.message);}});
$("newBtn").addEventListener("click",()=>{if(dirty&&!confirm("Há alterações não exportadas. Criar novo template?"))return;doc={xtemplate:1,id:"xtemplate.custom.new",name:"Novo template",description:"",license:"MIT",tags:[],params:{},items:[{type:"group",inset:"10mm",children:[{type:"hline",y:"50%",stroke:"ink",strokeWidth:"0.2mm"}]}]};selectedPath=null;selectedPaths=[];resetHistory();initializePreviewValues();setDirty(true);syncJson();render();setInspectorTab("document");document.querySelectorAll(".template-card").forEach(b=>b.classList.remove("active"));});
document.querySelectorAll(".template-card").forEach(b=>b.addEventListener("click",()=>{const key=b.dataset.template;if(dirty&&!confirm("Descartar alterações não exportadas e abrir este modelo?"))return;doc=clone(samples[key]);selectedPath=null;selectedPaths=[];resetHistory();previewValues={};initializePreviewValues();setDirty(false);syncJson();render();document.querySelectorAll(".template-card").forEach(x=>x.classList.toggle("active",x===b));}));
$("paperSize").addEventListener("change",e=>{pageSize=SIZES[e.target.value]||SIZES.a4;wrap.style.aspectRatio=pageSize[0]+"/"+pageSize[1];render();});
const ZOOM_LEVELS=[25,50,75,100,125,150,200,300];
function fitWidth(){const canvas=$("canvasArea"),availableW=Math.max(100,canvas.clientWidth-75),availableH=Math.max(150,canvas.clientHeight-70);return Math.max(100,Math.min(availableW,availableH*pageSize[0]/pageSize[1],500));}
function currentPaperWidth(){return wrap.getBoundingClientRect().width||fitWidth();}
function fitPaper(){const canvas=$("canvasArea"),fit=fitWidth();let w=zoomMode==="fit"?fit:pageSize[0]*2*(Number(zoomMode)/100);wrap.style.width=Math.max(60,w)+"px";$("zoom").value=zoomMode;const actual=zoomMode==="fit"?Math.round(fit/(pageSize[0]*2)*100):Number(zoomMode);$("zoomLabel").textContent=zoomMode==="fit"?"Ajustar · "+actual+"%":actual+"%";canvas.classList.toggle("zoomed-in",zoomMode!=="fit"&&w>fit+1);}
function setZoom(next,anchor=null){const oldWidth=currentPaperWidth(),oldRect=wrap.getBoundingClientRect(),oldPan={...panOffset};zoomMode=next;fitPaper();const newWidth=currentPaperWidth(),newRect=wrap.getBoundingClientRect();if(next==="fit"){panOffset.x=0;panOffset.y=0;applyPan();return;}if(anchor&&oldWidth>0){panOffset=anchoredPan({pan:oldPan,anchor,oldRect,newRect,scale:newWidth/oldWidth});applyPan();}}
function stepZoom(direction,anchor=null){setZoom(nextZoomLevel(zoomMode,direction,ZOOM_LEVELS),anchor);}
$("zoom").addEventListener("change",e=>setZoom(e.target.value));$("zoomOut").addEventListener("click",()=>stepZoom(-1));$("zoomIn").addEventListener("click",()=>stepZoom(1));
window.addEventListener("resize",fitPaper);
window.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();$("saveBtn").click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="o"){e.preventDefault();$("openBtn").click();}if(e.key==="Escape")$("addMenu").classList.add("hidden");if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();toggleSplit();}});
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
 const supported=!!n&&["group","rect","text","path","ellipse","circle","dot","line","hline","vline","polyline","polygon"].includes(n.type);
 panel.classList.toggle("hidden",!supported);
 if(!supported)return;
 const g=transformGeometry(n),type=n.type;
 const values={transformX:g.x,transformY:g.y,transformW:g.w,transformH:g.h,transformRotate:Number(n.rotate)||0,transformOpacity:Math.round((n.opacity===undefined?1:Number(n.opacity))*100)};
 const disabled={transformW:["text","vline"].includes(type),transformH:["text","hline"].includes(type)};
 if(type==="circle"||type==="dot")values.transformH=values.transformW;
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
function applyTransformChange(n,key,value){
 const g=transformGeometry(n),type=n.type,box=parentBoxForPath(selectedPath),v=Number(value);
 if(key==="rotate"){n.rotate=v;return;}
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
Object.entries({transformX:"x",transformY:"y",transformW:"w",transformH:"h",transformRotate:"rotate",transformOpacity:"opacity"}).forEach(([id,key])=>$(id).addEventListener("change",e=>{
 const n=getAt(selectedPath);if(!n||e.target.disabled)return;const v=Number(e.target.value);if(!Number.isFinite(v))return;
 commit(()=>applyTransformChange(n,key,v));
}));
// Photoshop-style scrubby fields: drag the label horizontally to adjust the value in place.
const scrubConfig={transformX:{step:.1,min:-300,max:300},transformY:{step:.1,min:-420,max:420},transformW:{step:.1,min:0,max:300},transformH:{step:.1,min:0,max:420},transformRotate:{step:1,min:-360,max:360},transformOpacity:{step:1,min:0,max:100}};
for(const [id,cfg] of Object.entries(scrubConfig)){
 const input=$(id),label=input.closest("label");if(!input||!label)continue;
 label.classList.add("scrubby-field");label.title="Arraste o rótulo para ajustar · Shift = precisão · Ctrl = rápido";
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
  const factor=e.shiftKey?0.1:(e.ctrlKey||e.metaKey)?10:1,raw=state.startValue+delta*cfg.step*factor,value=Math.max(cfg.min,Math.min(cfg.max,raw)),n=getAt(state.path);
  if(!n)return;Object.assign(n,clone(state.origin));applyTransformChange(n,Object.entries({transformX:"x",transformY:"y",transformW:"w",transformH:"h",transformRotate:"rotate",transformOpacity:"opacity"}).find(([k])=>k===id)[1],value);
  input.value=Number(value.toFixed(2));renderCanvas();
 });
 const finish=e=>{if(!state||state.pointerId!==e.pointerId)return;const changed=state.moved;state=null;label.classList.remove("scrubbing");if(changed)commit(()=>{});};
 label.addEventListener("pointerup",finish);label.addEventListener("pointercancel",finish);
}

const originalRenderInspector=renderInspector;
renderInspector=function(){originalRenderInspector();transformRead();};
let contextPoint=null;
function showContextMenu(x,y){
 const menu=$("contextMenu");menu.classList.remove("hidden");menu.style.left="0px";menu.style.top="0px";
 const r=menu.getBoundingClientRect(),pad=8;
 menu.style.left=Math.max(pad,Math.min(x,innerWidth-r.width-pad))+"px";
 menu.style.top=Math.max(pad,Math.min(y,innerHeight-r.height-pad))+"px";
}
function hideContextMenu(){
 const menu=$("contextMenu");menu.classList.add("hidden");menu.style.left="-10000px";menu.style.top="-10000px";contextPoint=null;
}
function prepareContextMenu(e,targetPath=null,blank=false,point=null){
 e.preventDefault();contextPoint=point;
 if(targetPath){if(!selectedPaths.some(p=>nodeKey(p)===nodeKey(targetPath)))select(targetPath);$("contextHeading").textContent="ELEMENTO · INSERIR / EDITAR";}
 else if(blank){selectedPath=null;selectedPaths=[];renderTree();renderInspector();$("contextHeading").textContent="ESTRUTURA · NOVO ELEMENTO";}
 const menu=$("contextMenu");
 menu.querySelectorAll('[data-action="duplicate"],[data-action="delete"],[data-action="up"],[data-action="down"]').forEach(b=>{b.disabled=!selectedPath;});menu.querySelector('[data-action="group"]').disabled=selectedPaths.length<2;
 showContextMenu(e.clientX,e.clientY);
}
$("tree").addEventListener("contextmenu",e=>{
 const item=e.target.closest(".tree-item");prepareContextMenu(e,item?toPath(item.dataset.path):null,!item,null);
});
document.querySelector(".outline-dock").addEventListener("contextmenu",e=>{
 if(e.target.closest("#tree"))return;
 const item=e.target.closest(".tree-item");prepareContextMenu(e,item?toPath(item.dataset.path):null,!item,null);
});
paper.addEventListener("contextmenu",e=>{
 let g=e.target.closest("[data-path]");
 if(g&&e.target.closest(".svg-hitbox")&&["group","repeat"].includes(getAt(toPath(g.dataset.path))?.type))g=null;
 let point=null;
 if(!g){const r=paper.getBoundingClientRect();point={x:(e.clientX-r.left)*pageSize[0]/r.width,y:(e.clientY-r.top)*pageSize[1]/r.height};}
 prepareContextMenu(e,g?toPath(g.dataset.path):null,!g,point);
});
$("contextMenu").addEventListener("click",e=>{
 const button=e.target.closest("button");if(!button)return;
 if(button.dataset.add){
  const type=button.dataset.add,point=contextPoint?{...contextPoint}:null;hideContextMenu();$("addMenu").classList.add("hidden");addNodeAtContext(type,point);return;
 }
 const action=button.dataset.action;if(!action||button.disabled)return;hideContextMenu();
 if(action==="group"){groupSelection();return;}
 if(action==="duplicate")$("duplicateElement").click();
 if(action==="delete")$("deleteElement").click();
 if(action==="up"||action==="down"){if(!selectedPath)return;const pp=selectedPath.slice(0,-1),idx=selectedPath.at(-1),arr=getAt(pp),next=idx+(action==="up"?-1:1);if(!Array.isArray(arr)||next<0||next>=arr.length)return;[arr[idx],arr[next]]=[arr[next],arr[idx]];selectedPath=pp.concat(next);commit(()=>{});}
});
document.addEventListener("pointerdown",e=>{const target=e.target instanceof Element?e.target:null;if(!target?.closest("#contextMenu"))hideContextMenu();},true);
document.addEventListener("click",e=>{const target=e.target instanceof Element?e.target:null;if(target&&!target.closest("#contextMenu")&&!target.closest("#tree")&&!target.closest(".outline-dock"))hideContextMenu();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){hideContextMenu();$("addMenu").classList.add("hidden");}});
$("structureAddBtn").addEventListener("click",()=>{
 hideContextMenu();const menu=$("addMenu");menu.classList.toggle("hidden");
 if(!menu.classList.contains("hidden"))menu.scrollIntoView({block:"nearest"});
});
async function loadOfficialExample(file,source){
 if(!file)return;
 if(dirty&&!confirm("Descartar alterações não exportadas e abrir este exemplo?")){if(source)source.value="";return;}
 try{const res=await fetch("./examples/"+encodeURIComponent(file));if(!res.ok)throw Error("Exemplo não encontrado.");const parsed=JSON.parse(await res.text());validate(parsed);doc=parsed;selectedPath=null;selectedPaths=[];collapsedTree.clear();resetHistory();previewValues={};initializePreviewValues();setDirty(false);syncJson();render();document.querySelectorAll(".template-card").forEach(b=>b.classList.remove("active"));setStatus("Exemplo: "+file);toast("Template carregado.");}
 catch(err){toast("Falha ao abrir exemplo: "+err.message);}
 if(source)source.value="";
}
$("topExample").addEventListener("change",e=>loadOfficialExample(e.target.value,e.target));
function addNodeAtContext(type,point){
 addNode(type);
 const n=getAt(selectedPath);
 if(!point||!n)return;
 const mx=(Number(point.x)||0),my=(Number(point.y)||0);
 const fmt=v=>Number(v.toFixed(2))+"mm";
 if(["rect","path","group","text"].includes(type)){n.x=fmt(mx);n.y=fmt(my);}
 else if(["circle","ellipse","dot"].includes(type)){n.cx=fmt(mx);n.cy=fmt(my);}
 else if(type==="line"){n.x1=fmt(mx);n.y1=fmt(my);n.x2=fmt(mx+40);n.y2=fmt(my+20);}
 else if(["polyline","polygon"].includes(type))n.points=n.points.map(([x,y])=>[fmt(mx+Number(x)),fmt(my+Number(y))]);
 else if(type==="hline")n.y=fmt(my);
 else if(type==="vline")n.x=fmt(mx);
 setDirty(true);syncJson();render();
}
// Alt + wheel zooms; Space + drag pans the paper itself, even when it fits the viewport.
const canvas=$("canvasArea"),paperWrap=$("paperWrap");let spaceDown=false,pan=null,panOffset={x:0,y:0};
function applyPan(){paperWrap.style.transform="translate("+panOffset.x+"px, "+panOffset.y+"px)";}
window.addEventListener("keydown",e=>{if(e.code==="Space"&&!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){spaceDown=true;canvas.classList.add("space-ready");e.preventDefault();}});
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
let activeTool="select",drawState=null,curveState=null;
function setActiveTool(tool){activeTool=tool;toolButtons.forEach(b=>{const active=b.dataset.tool===tool;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});paper.style.cursor=tool==="select"?"default":tool==="pan"?"grab":tool==="text"?"text":"crosshair";}
function pagePoint(e){const r=paper.getBoundingClientRect();return{x:(e.clientX-r.left)*pageSize[0]/r.width,y:(e.clientY-r.top)*pageSize[1]/r.height};}
function handlePenPointerDown(e){
 if(e.button!==0)return;
 const pt=pagePoint(e);
 if(!curveState)curveState={points:[],pointerId:null,activeIndex:-1,closed:false};
 const state=curveState,first=state.points[0],last=state.points.at(-1);
 const hitRadius=Math.max(2.5,5*pageSize[0]/paper.getBoundingClientRect().width);
 if(last&&state.points.length>=2&&Math.hypot(pt.x-last.x,pt.y-last.y)<hitRadius){finishPenPath();return;}
 if(first&&state.points.length>=3&&Math.hypot(pt.x-first.x,pt.y-first.y)<hitRadius){
  state.closed=true;finishPenPath();return;
 }
 state.points.push({x:pt.x,y:pt.y,hx:0,hy:0});state.activeIndex=state.points.length-1;state.pointerId=e.pointerId;
 paper.setPointerCapture(e.pointerId);renderPenPreview();
}
function penPathData(points,closed=false,offsetX=0,offsetY=0){
 if(!points.length)return "";
 const f=v=>Number(v.toFixed(2)),p=points[0];let d=`M ${f(p.x-offsetX)} ${f(p.y-offsetY)}`;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  d+=` C ${f(a.x+a.hx-offsetX)} ${f(a.y+a.hy-offsetY)} ${f(b.x-b.hx-offsetX)} ${f(b.y-b.hy-offsetY)} ${f(b.x-offsetX)} ${f(b.y-offsetY)}`;
 }
 if(closed&&points.length>2){const a=points.at(-1),b=points[0];d+=` C ${f(a.x+a.hx-offsetX)} ${f(a.y+a.hy-offsetY)} ${f(b.x-b.hx-offsetX)} ${f(b.y-b.hy-offsetY)} ${f(b.x-offsetX)} ${f(b.y-offsetY)} Z`;}
 return d;
}
function renderPenPreview(){
 let layer=paper.querySelector("#pen-preview");if(!curveState){layer?.remove();return;}
 if(!layer){layer=svg("g",{id:"pen-preview","pointer-events":"none"});paper.appendChild(layer);}layer.replaceChildren();
 const pts=curveState.points;if(!pts.length)return;
 layer.appendChild(svg("path",{d:penPathData(pts,curveState.closed),fill:"none",stroke:"#6485f5","stroke-width":.65,"stroke-linecap":"round","stroke-linejoin":"round"}));
 pts.forEach((p,i)=>{
  if(Math.hypot(p.hx,p.hy)>.15){layer.appendChild(svg("line",{x1:p.x-p.hx,y1:p.y-p.hy,x2:p.x+p.hx,y2:p.y+p.hy,stroke:"#6485f5","stroke-width":.45,"stroke-dasharray":"1.5 1"}));layer.appendChild(svg("circle",{cx:p.x-p.hx,cy:p.y-p.hy,r:.85,fill:"#fff",stroke:"#6485f5","stroke-width":.45}));layer.appendChild(svg("circle",{cx:p.x+p.hx,cy:p.y+p.hy,r:.85,fill:"#fff",stroke:"#6485f5","stroke-width":.45}));
  }
  layer.appendChild(svg("rect",{x:p.x-.85,y:p.y-.85,width:1.7,height:1.7,fill:i===pts.length-1?"#6485f5":"#fff",stroke:"#6485f5","stroke-width":.5}));
 });
}
function finishPenPath(){
 if(!curveState)return;const state=curveState;curveState=null;renderPenPreview();
 if(state.points.length<2){toast("A caneta precisa de pelo menos dois pontos. Clique para adicionar pontos e arraste para criar curvas.");return;}
 const pts=state.points,coords=[];for(const p of pts){coords.push(p.x,p.y,p.x+p.hx,p.y+p.hy,p.x-p.hx,p.y-p.hy);}
 const minX=Math.min(...coords.filter((_,i)=>i%2===0)),minY=Math.min(...coords.filter((_,i)=>i%2===1)),maxX=Math.max(...coords.filter((_,i)=>i%2===0)),maxY=Math.max(...coords.filter((_,i)=>i%2===1));
 const x=minX,y=minY,w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY),f=v=>Number(v.toFixed(2))+"mm";
 const n={type:"path",x:f(x),y:f(y),w:f(w),h:f(h),viewBox:[0,0,w,h],d:penPathData(pts,state.closed,x,y),stroke:"ink",fill:"none",strokeWidth:"0.5mm"};
 const parent=selectedPath&&["group","repeat"].includes(getAt(selectedPath)?.type)?getAt(selectedPath):null,arr=parent?parent.children:(doc.items||(doc.items=[]));arr.push(n);
 selectedPath=parent?selectedPath.concat(["children",arr.length-1]):["items",arr.length-1];selectedPaths=[selectedPath.slice()];commit(()=>{});setInspectorTab("properties");setActiveTool("select");
}
paper.addEventListener("dblclick",e=>{if(activeTool!=="curve"||!curveState)return;e.preventDefault();const pts=curveState.points;if(pts.length>1&&Math.hypot(pts.at(-1).x-pts.at(-2).x,pts.at(-1).y-pts.at(-2).y)<1.5)pts.pop();finishPenPath();});
function insertDrawnNode(type,a,b,points){
 const left=Math.min(a.x,b.x),top=Math.min(a.y,b.y),w=Math.max(1,Math.abs(b.x-a.x)),h=Math.max(1,Math.abs(b.y-a.y));
 const f=v=>Number(v.toFixed(2))+"mm";let n;
 if(type==="rect")n={type,x:f(left),y:f(top),w:f(w),h:f(h),stroke:"ink",fill:"none",strokeWidth:"0.3mm"};
 else if(type==="ellipse")n={type,cx:f(left+w/2),cy:f(top+h/2),rx:f(w/2),ry:f(h/2),stroke:"ink",fill:"none",strokeWidth:"0.3mm"};
 else if(type==="line")n={type,x1:f(a.x),y1:f(a.y),x2:f(b.x),y2:f(b.y),stroke:"ink",strokeWidth:"0.3mm"};
 else if(type==="polygon")n={type,points:[[f(left),f(top)],[f(left+w),f(top)],[f(left+w),f(top+h)],[f(left),f(top+h)]],stroke:"ink",fill:"none",strokeWidth:"0.3mm"};
 else if(type==="polyline")n={type,points:(points||[a,b]).map(p=>[f(p.x),f(p.y)]),stroke:"ink",fill:"none",strokeWidth:"0.5mm"};
 else if(type==="curve"){const pts=points||[a,b],minX=Math.min(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),pw=Math.max(1,Math.max(...pts.map(p=>p.x))-minX),ph=Math.max(1,Math.max(...pts.map(p=>p.y))-minY),local=pts.map(p=>({x:p.x-minX,y:p.y-minY}));let d=`M ${local[0].x.toFixed(2)} ${local[0].y.toFixed(2)}`;for(let i=1;i<local.length-1;i++){const midX=(local[i].x+local[i+1].x)/2,midY=(local[i].y+local[i+1].y)/2;d+=` Q ${local[i].x.toFixed(2)} ${local[i].y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;}if(local.length>1){const last=local.at(-1);d+=` T ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;}n={type:"path",x:f(minX),y:f(minY),w:f(pw),h:f(ph),viewBox:[0,0,pw,ph],d,stroke:"ink",fill:"none",strokeWidth:"0.5mm"};}
 else return;
 const parent=selectedPath&&["group","repeat"].includes(getAt(selectedPath)?.type)?getAt(selectedPath):null;
 const arr=parent?parent.children:(doc.items||(doc.items=[]));arr.push(n);
 selectedPath=parent?selectedPath.concat(["children",arr.length-1]):["items",arr.length-1];selectedPaths=[selectedPath.slice()];
 commit(()=>{});setInspectorTab("properties");
}
function renderDrawPreview(){let p=paper.querySelector("#draw-preview");if(!drawState){p?.remove();return;}if(!p){p=svg("g",{id:"draw-preview","pointer-events":"none"});paper.appendChild(p);}p.replaceChildren();const a=drawState.start,b=drawState.current,x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.max(.3,Math.abs(b.x-a.x)),h=Math.max(.3,Math.abs(b.y-a.y));if(drawState.tool==="rect")p.appendChild(svg("rect",{x,y,width:w,height:h,fill:"#6485f522",stroke:"#6485f5","stroke-width":.6,"stroke-dasharray":"2 1"}));else if(drawState.tool==="ellipse")p.appendChild(svg("ellipse",{cx:x+w/2,cy:y+h/2,rx:w/2,ry:h/2,fill:"#6485f522",stroke:"#6485f5","stroke-width":.6,"stroke-dasharray":"2 1"}));else if(drawState.tool==="polygon")p.appendChild(svg("polygon",{points:`${x},${y} ${x+w},${y} ${x+w},${y+h} ${x},${y+h}`,fill:"#6485f522",stroke:"#6485f5","stroke-width":.6,"stroke-dasharray":"2 1"}));else p.appendChild(svg("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:"#6485f5","stroke-width":.8,"stroke-dasharray":"2 1"}));}
function addPattern(type){const spacing=type==="grid"?"5mm":"8mm",line={type:"repeat",axis:type==="grid"?"xy":"y",period:spacing,fit:"space",children:type==="grid"?[{type:"hline",y:"100%",stroke:"#b5c5df",strokeWidth:"0.15mm"},{type:"vline",x:"100%",stroke:"#b5c5df",strokeWidth:"0.15mm"}]:[{type:"hline",y:"100%",stroke:"#9eb8df",strokeWidth:"0.2mm"}]},node={type:"group",inset:"10mm",children:[line]};const items=doc.items||(doc.items=[]);items.push(node);const path=["items",items.length-1];selectedPath=path;selectedPaths=[path];commit(()=>{});setInspectorTab("properties");toast(type==="grid"?"Grade inserida — ajuste o período nas propriedades.":"Pautado inserido — ajuste o espaçamento nas propriedades.");setActiveTool("select");}
toolButtons.forEach(b=>b.addEventListener("click",()=>{const tool=b.dataset.tool;if(tool==="group"){toast("Para criar um grupo, selecione elementos e use Agrupar no menu contextual.");return;}if(tool==="ruled"||tool==="grid"){addPattern(tool);return;}setActiveTool(tool);if(tool==="pan")toast("Segure e arraste para mover a página; Espaço + arraste também funciona.");else if(["rect","ellipse","polygon","line"].includes(tool))toast("Clique e arraste sobre a página para desenhar.");else if(tool==="curve")toast("Caneta: clique para criar pontos, arraste para criar alças e pressione Enter ou dê duplo clique para concluir.");}));
paper.addEventListener("pointerdown",e=>{
 if(spaceDown||activeTool==="pan")return;
 if(e.button!==0)return;

 if(activeTool==="text"){
  const pt=pagePoint(e),f=v=>Number(v.toFixed(2))+"mm",n={type:"text",x:f(pt.x),y:f(pt.y),text:"Novo texto",size:"4mm",fill:"ink"};
  const parent=selectedPath&&["group","repeat"].includes(getAt(selectedPath)?.type)?getAt(selectedPath):null;
  const arr=parent?parent.children:(doc.items||(doc.items=[]));arr.push(n);selectedPath=parent?selectedPath.concat(["children",arr.length-1]):["items",arr.length-1];selectedPaths=[selectedPath.slice()];commit(()=>{});setInspectorTab("properties");setActiveTool("select");return;
 }
 if(!["rect","ellipse","polygon","line"].includes(activeTool))return;
 e.preventDefault();e.stopPropagation();
 const pt=pagePoint(e);drawState={tool:activeTool,start:pt,current:pt,points:[pt],pointerId:e.pointerId};paper.setPointerCapture(e.pointerId);renderDrawPreview();
});
paper.addEventListener("pointermove",e=>{if(!drawState||drawState.pointerId!==e.pointerId)return;drawState.current=pagePoint(e);if(e.shiftKey&&["rect","ellipse"].includes(drawState.tool)){const dx=drawState.current.x-drawState.start.x,dy=drawState.current.y-drawState.start.y,side=Math.max(Math.abs(dx),Math.abs(dy));drawState.current={x:drawState.start.x+Math.sign(dx||1)*side,y:drawState.start.y+Math.sign(dy||1)*side};}renderDrawPreview();});
function finishDrawing(e){if(!drawState||drawState.pointerId!==e.pointerId)return;const d=drawState;drawState=null;renderDrawPreview();if(Math.hypot(d.current.x-d.start.x,d.current.y-d.start.y)<1){toast("Arraste para definir a dimensão do elemento.");return;}insertDrawnNode(d.tool,d.start,d.current,d.points);setActiveTool("select");}
paper.addEventListener("pointerup",finishDrawing);
paper.addEventListener("pointercancel",()=>{drawState=null;renderDrawPreview();});
// Additional editor shortcuts. Inputs retain normal text-editing behavior.
window.addEventListener("keydown",e=>{const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);if(activeTool==="curve"&&curveState&&!typing&&e.key==="Backspace"){e.preventDefault();if(curveState.pointerId!==null)return;curveState.points.pop();curveState.activeIndex=curveState.points.length-1;if(!curveState.points.length){curveState=null;toast("Traçado limpo.");}renderPenPreview();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){if(typing)return;e.preventDefault();if(e.shiftKey)redo();else undo();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){if(typing)return;e.preventDefault();redo();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="n"){e.preventDefault();$("newBtn").click();}if(typing)return;if(selectedPath&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){const n=getAt(selectedPath);if(n&&["group","rect","text","path"].includes(n.type)){e.preventDefault();const step=e.shiftKey?10:1,dx=e.key==="ArrowLeft"?-step:e.key==="ArrowRight"?step:0,dy=e.key==="ArrowUp"?-step:e.key==="ArrowDown"?step:0;n.x=numericMm(n.x)+dx+"mm";n.y=numericMm(n.y)+dy+"mm";commit(()=>{});}return;}if(!e.ctrlKey&&!e.metaKey&&!e.altKey){const key=e.key.toLowerCase(),tools={v:"select",r:"rect",o:"ellipse",p:"polygon",c:"curve",l:"line",t:"text"};if(tools[key]){setActiveTool(tools[key]);return;}}if(e.key==="Insert"){e.preventDefault();$("addMenu").classList.toggle("hidden");}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"&&selectedPath){e.preventDefault();$("duplicateElement").click();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="g"&&selectedPaths.length>1){e.preventDefault();groupSelection();}if(e.key==="Delete"||e.key==="Backspace"){if(selectedPath){e.preventDefault();$("deleteElement").click();}}if(e.key==="Enter"&&activeTool==="curve"&&curveState){e.preventDefault();finishPenPath();return;}if(e.key==="Escape"){if(curveState){curveState=null;renderPenPreview();toast("Traçado cancelado.");return;}hideContextMenu();}if(e.altKey&&["ArrowUp","ArrowDown"].includes(e.key)&&selectedPath){e.preventDefault();const menuAction=e.key==="ArrowUp"?"up":"down";$("contextMenu").querySelector(`[data-action="${menuAction}"]`).click();}});

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
 {label:"Agrupar elementos selecionados",group:"Editar",shortcut:"Ctrl+G",keywords:"juntar combinar grupo",run:groupSelection},
 {label:"Selecionar ferramenta",group:"Ferramentas",shortcut:"V",keywords:"cursor mover transformar",run:()=>setActiveTool("select")},
 {label:"Mover tela",group:"Ferramentas",shortcut:"Espaço",keywords:"pan mão navegar",run:()=>setActiveTool("pan")},
 {label:"Desenhar retângulo",group:"Ferramentas",shortcut:"R",keywords:"forma quadrado",run:()=>setActiveTool("rect")},
 {label:"Desenhar elipse",group:"Ferramentas",shortcut:"O",keywords:"círculo oval forma",run:()=>setActiveTool("ellipse")},
 {label:"Desenhar linha",group:"Ferramentas",shortcut:"L",keywords:"traço",run:()=>setActiveTool("line")},
 {label:"Inserir texto",group:"Ferramentas",shortcut:"T",keywords:"tipografia",run:()=>setActiveTool("text")},
 {label:"Caneta Bézier",group:"Ferramentas",shortcut:"C",keywords:"curva ponto de ancoragem alça vetor illustrator pen",run:()=>setActiveTool("curve")},
 {label:"Inserir linhas pautadas",group:"Ferramentas",keywords:"linhas caderno espaçamento repetição",run:()=>addPattern("ruled")},
 {label:"Inserir grade quadriculada",group:"Ferramentas",keywords:"grade quadrados matemática grid",run:()=>addPattern("grid")},
 {label:"Novo template",group:"Arquivo",shortcut:"Ctrl+N",keywords:"criar documento",run:()=> $("newBtn").click()},
 {label:"Abrir arquivo .xtemplate",group:"Arquivo",shortcut:"Ctrl+O",keywords:"importar carregar",run:()=> $("openBtn").click()},
 {label:"Exportar template",group:"Arquivo",shortcut:"Ctrl+S",keywords:"salvar baixar",run:()=> $("saveBtn").click()},
 {label:"Desfazer",group:"Editar",shortcut:"Ctrl+Z",keywords:"undo voltar",run:()=>undo()},
 {label:"Refazer",group:"Editar",shortcut:"Ctrl+Shift+Z",keywords:"redo repetir",run:()=>redo()},
 {label:"Duplicar elemento",group:"Editar",shortcut:"Ctrl+D",keywords:"cópia clonar",run:()=>{if(selectedPath)$("duplicateElement").click();else toast("Selecione um elemento primeiro.")}},
 {label:"Remover elemento",group:"Editar",shortcut:"Delete",keywords:"apagar excluir",run:()=>{if(selectedPath)$("deleteElement").click();else toast("Selecione um elemento primeiro.")}},
 {label:"Alternar editor JSON",group:"Visualização",shortcut:"Ctrl+Enter",keywords:"código dividido fonte",run:()=>toggleSplit()},
 {label:"Formatar JSON",group:"Visualização",keywords:"indentação organizar código",run:()=>{if(!split)toggleSplit(true);$("formatJson").click()}},
 {label:"Adicionar elemento",group:"Estrutura",shortcut:"Insert",keywords:"nó grupo repetição forma",run:()=>{$("addMenu").classList.toggle("hidden");}},
 {label:"Ajustar página à tela",group:"Visualização",keywords:"zoom fit enquadrar",run:()=>setZoom("fit")}
];
let commandMatches=[],commandIndex=0,previousFocus=null;
function renderCommandResults(){
 const q=commandSearch.value.trim().toLocaleLowerCase("pt-BR");
 commandMatches=commands.map((c,i)=>({...c,index:i})).filter(c=>(c.label+" "+c.group+" "+(c.keywords||"")+" "+(c.shortcut||"")).toLocaleLowerCase("pt-BR").includes(q));
 commandIndex=Math.min(commandIndex,Math.max(0,commandMatches.length-1));
 commandResults.replaceChildren();
 if(!commandMatches.length){const empty=document.createElement("div");empty.className="command-empty";empty.textContent="Nenhum comando encontrado";commandResults.appendChild(empty);return;}
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
initializePreviewValues();syncJson();render();setInspectorTab("document");resetHistory();
})();