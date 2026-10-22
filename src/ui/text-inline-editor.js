/** Genuine on-page typography editing. The visible editable node is a
 * foreignObject in the SAME SVG coordinate system and transformation as the
 * text glyph. There is no viewport-positioned textarea, modal or action bar.
 * Browser contenteditable supplies native caret, selection, clipboard and IME.
 * The original SVG text is transparent during editing and restored on close.
 */
const SVG_NS='http://www.w3.org/2000/svg';
const HTML_NS='http://www.w3.org/1999/xhtml';
const insertNode=(tag,ns)=>document.createElementNS(ns,tag);
export function createTextInlineEditor({onPreview,onApply,onCancel}){
 let session=null;
 // Kept as a stable reference for existing code and regression checks, but
 // never inserted into document until editing begins.
 let field=null;
 const editorValue=()=>field?.textContent??'';
 const finish=apply=>{
  if(!session)return;
  const previous=session;
  const next=editorValue();
  session=null;
  const editing=previous.foreignObject;
  editing.remove();
  previous.glyph.style.removeProperty('opacity');
  if(document.activeElement===field)field.blur();
  field=null;
  if(apply)onApply(previous.path,next,previous.original);
  else onCancel(previous.path,previous.original);
 };
 function selection(position){
  if(!field)return;
  const text=field.firstChild;
  if(!text||text.nodeType!==Node.TEXT_NODE)return;
  const range=document.createRange();
  range.setStart(text,Math.max(0,Math.min(text.textContent.length,position)));
  range.collapse(true);
  const sel=window.getSelection();sel?.removeAllRanges();sel?.addRange(range);
 }
 const open=({path,value,glyph,caret='all',clientX,clientY})=>{
  if(!glyph||!Array.isArray(path))return false;
  if(session)finish(true);
  const parent=glyph.parentNode;
  if(!parent)return false;
  const original=String(value??'');
  const size=Number(glyph.getAttribute('font-size'))||4;
  const x=Number(glyph.getAttribute('x'))||0;
  const y=Number(glyph.getAttribute('y'))||0;
  const bbox=glyph.getBBox();
  const styles=getComputedStyle(glyph);
  const anchor=glyph.getAttribute('text-anchor')||styles.textAnchor||'start';
  // The edit surface is a transparent, non-repainting part of the SVG itself.
  // Position with the text's authored x anchor, not its painted bbox, so
  // start/middle/end stay anchored during live typing and text expansion.
  const width=Math.max(size*8,bbox.width+size*1.8);
  const top=Number.isFinite(bbox.y)&&bbox.height>0?bbox.y:y-size*.84;
  const height=Math.max(size*1.8,bbox.height+size*.65);
  const fo=insertNode('foreignObject',SVG_NS);
  fo.classList.add('svg-text-edit');
  fo.dataset.canvasTextEditor='true';
  fo.setAttribute('x',String(anchor==='middle'?x-width/2:anchor==='end'?x-width:x));
  fo.setAttribute('y',String(top-size*.15));
  fo.setAttribute('width',String(width));
  fo.setAttribute('height',String(height));
  if(glyph.hasAttribute('transform'))fo.setAttribute('transform',glyph.getAttribute('transform'));
  fo.setAttribute('overflow','visible');
  const editor=insertNode('div',HTML_NS);
  editor.className='svg-text-edit-content canvas-inline-text-editor';
  editor.setAttribute('contenteditable','plaintext-only');
  editor.setAttribute('role','textbox');
  editor.setAttribute('aria-label','Edit text on page; Enter to apply, Escape to cancel');
  editor.setAttribute('spellcheck','false');
  editor.setAttribute('data-inline-text-input','true');
  editor.style.fontFamily=styles.fontFamily||'sans-serif';
  editor.style.fontSize=size+'px';
  editor.style.fontWeight=styles.fontWeight;
  editor.style.fontStyle=styles.fontStyle;
  editor.style.color=glyph.getAttribute('fill')||styles.fill||'#20252e';
  editor.style.textAlign=anchor==='middle'?'center':anchor==='end'?'right':'left';
  editor.style.width=width+'px';
  editor.style.minHeight=size*1.25+'px';
  editor.append(document.createTextNode(original));
  fo.append(editor);
  // Add this only after the glyph so its selection/caret paints above the
  // transparent original; the canvas transformation is inherited naturally.
  parent.insertBefore(fo,glyph.nextSibling);
  glyph.style.setProperty('opacity','0');
  field=editor;
  session={path:path.slice(),original,glyph,foreignObject:fo};
  // Do not let SVG hit targets initiate move/resize while typing.
  for(const eventName of ['pointerdown','pointerup','click','dblclick','mousedown','mouseup']){
   fo.addEventListener(eventName,e=>e.stopPropagation());
  }
  editor.addEventListener('input',()=>{
   if(!session)return;
   const next=editorValue();
   onPreview(session.path,next,session.glyph);
   // Keep the same anchor but widen symmetrically when content grows.
   const effective=Math.max(width,next.length*size*.68+size*2);
   if(effective>Number(fo.getAttribute('width'))){
    fo.setAttribute('width',String(effective));
    fo.setAttribute('x',String(anchor==='middle'?x-effective/2:anchor==='end'?x-effective:x));
    editor.style.width=effective+'px';
   }
  });
  editor.addEventListener('keydown',event=>{
   if(event.isComposing){event.stopPropagation();return;}
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false);return;}
   if(event.key==='Enter'||event.key==='Tab'){
    event.preventDefault();event.stopPropagation();finish(true);return;
   }
   event.stopPropagation();
  });
  editor.addEventListener('keyup',e=>e.stopPropagation());
  editor.addEventListener('paste',e=>{
   const text=e.clipboardData?.getData('text/plain');
   if(text===undefined)return;
   e.preventDefault();document.execCommand('insertText',false,text.replace(/[\r\n]+/g,' '));
  });
  editor.addEventListener('blur',()=>{
   queueMicrotask(()=>{if(session&&document.activeElement!==editor)finish(true);});
  });
  editor.focus({preventScroll:true});
  if(caret==='all'&&original){
   const r=document.createRange();r.selectNodeContents(editor);
   const sel=window.getSelection();sel?.removeAllRanges();sel?.addRange(r);
  }else if(caret==='end'||!original)selection(original.length);
  else if(Number.isFinite(clientX)){
   // Unlike a textarea's large rectangle, per-character SVG geometry stays
   // accurate for center/end anchors, kerning and 90°/270° rotation.
   let closest=0,best=Infinity;
   try{
    const m=glyph.getScreenCTM();
    if(m){
     for(let i=0;i<original.length;i++){
      const start=glyph.getStartPositionOfChar(i);
      const end=glyph.getEndPositionOfChar(i);
      for(const [index,pos] of [[i,start],[i+1,end]]){
       const xy=new DOMPoint(pos.x,pos.y).matrixTransform(m);
       const delta=Math.hypot(clientX-xy.x,Number.isFinite(clientY)?clientY-xy.y:0);
       if(delta<best){best=delta;closest=index;}
      }
     }
    }
   }catch{closest=original.length;}
   selection(closest);
  }else selection(original.length);
  return true;
 };
 return {
  open,close:()=>finish(true),cancel:()=>finish(false),
  get active(){return !!session;},
  get element(){return field;},
  get shell(){return session?.foreignObject||null;}
 };
}
