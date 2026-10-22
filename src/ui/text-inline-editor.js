/** Text editing belongs next to the SVG glyph, never to a generic floating
 * form. Only a temporary DOM overlay is created; the document is committed
 * once on Apply and rolled back on Escape/Cancel. */
export function createTextInlineEditor({onPreview,onApply,onCancel}){
 let session=null;
 const shell=document.createElement('div');shell.className='canvas-text-edit-shell';
 shell.dataset.canvasTextEditor='true';shell.hidden=true;
 const field=document.createElement('textarea');field.className='canvas-inline-text-editor';
 field.setAttribute('aria-label','Edit text directly on the page');field.setAttribute('spellcheck','false');field.rows=1;
 field.setAttribute('wrap','off');
 const controls=document.createElement('div');controls.className='canvas-inline-text-actions';
 const done=document.createElement('button');done.type='button';done.textContent='Done';done.dataset.textApply='true';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.dataset.textCancel='true';
 controls.append(done,cancel);shell.append(field,controls);document.body.append(shell);
 const commit=apply=>{
  if(!session)return;
  const previous=session;session=null;shell.hidden=true;
  // Do not leave a hidden textarea focused: Ctrl+Z/shortcuts would target its
  // private native input history instead of the Studio document history.
  if(document.activeElement===field)field.blur();
  if(apply)onApply(previous.path,field.value,previous.original);
  else onCancel(previous.path,previous.original);
 };
 // Keep pointer focus inside the editor until the button's click is handled.
 for(const button of [done,cancel])button.addEventListener('pointerdown',e=>e.preventDefault());
 done.addEventListener('click',()=>commit(true));cancel.addEventListener('click',()=>commit(false));
 const reposition=()=>{
  if(!session)return;
  const {glyph,point}=session;
  const bounds=glyph.getBoundingClientRect();
  if(!Number.isFinite(bounds.left)||bounds.width<0)return;
  const style=getComputedStyle(glyph),matrix=glyph.getScreenCTM();
  const factor=Math.max(.1,Math.hypot(matrix?.a??1,matrix?.b??0));
  const nativeSize=Number(glyph.getAttribute('font-size'))||parseFloat(style.fontSize)||6;
  const size=Math.max(12,Math.min(80,nativeSize*factor));
  const requested=Math.max(Math.ceil(bounds.width)+12,Math.ceil(field.value.length*size*.57)+16,50);
  const width=Math.min(Math.max(80,requested),Math.max(120,innerWidth-24));
  field.style.fontFamily=style.fontFamily;field.style.fontWeight=style.fontWeight;
  field.style.fontStyle=style.fontStyle;field.style.fontSize=size+'px';
  field.style.letterSpacing='normal';
  const anchor=style.textAnchor||glyph.getAttribute('text-anchor')||'start';
  const rotation=matrix?Math.atan2(matrix.b,matrix.a)*180/Math.PI:0;
  const rotated=Math.abs(((rotation%180)+180)%180)>30;
  field.style.textAlign=anchor==='middle'?'center':anchor==='end'?'right':'left';
  const anchorX=anchor==='middle'?bounds.left+bounds.width/2:anchor==='end'?bounds.right:bounds.left;
  let left=anchor==='middle'?anchorX-width/2:anchor==='end'?anchorX-width:anchorX;
  // Keep the edit control inside the phone viewport even near page edges.
  left=Math.min(Math.max(9,left-4),Math.max(9,innerWidth-width-9));
  const height=Math.max(34,Math.ceil(size*1.38)+8);
  let top=bounds.top-(height-Math.max(bounds.height,1))/2;
  if(rotated)top=bounds.top; // Upright keyboard/caret for vertical text.
  top=Math.max(10,Math.min(innerHeight-height-68,top));
  shell.style.left=left+'px';shell.style.top=top+'px';shell.style.width=width+'px';
  field.style.height=height+'px';
  shell.dataset.rotated=String(rotated);
 };
 field.addEventListener('input',()=>{
  if(!session)return;
  // Re-render the actual text while typing, then follow its new bounds.
  onPreview(session.path,field.value);
  const nextGlyph=session.findGlyph?.();if(nextGlyph)session.glyph=nextGlyph;
  reposition();
 });
 field.addEventListener('keydown',event=>{
  if(event.isComposing)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();commit(false);return;}
  if(event.key==='Enter'){
   event.preventDefault();event.stopPropagation();commit(true);return;
  }
  if(event.key==='Tab'){event.preventDefault();event.stopPropagation();commit(true);return;}
  // Typing, Backspace, clipboard and IME must not trigger canvas shortcuts.
  event.stopPropagation();
 });
 field.addEventListener('keyup',event=>event.stopPropagation());
 field.addEventListener('blur',()=>{
  // Focus might move to a toolbar action. Let click run before committing.
  queueMicrotask(()=>{if(session&&!shell.contains(document.activeElement))commit(true);});
 });
 const open=({path,value,glyph,findGlyph,caret='all',clientX})=>{
  if(!glyph||!Array.isArray(path))return false;
  if(session)commit(true);
  field.value=String(value??'');
  session={path:path.slice(),original:value,glyph,findGlyph};
  shell.hidden=false;reposition();
  field.focus({preventScroll:true});
  if(caret==='all')field.select();
  else if(Number.isFinite(clientX)){
   // Use actual browser caret placement when possible, with proportional
   // fallback for native textarea contents.
   const r=field.getBoundingClientRect();const relative=Math.max(0,Math.min(1,(clientX-r.left)/Math.max(1,r.width)));
   const position=Math.round(field.value.length*relative);
   field.setSelectionRange(position,position);
  }else field.setSelectionRange(field.value.length,field.value.length);
  return true;
 };
 return {open,close:()=>commit(true),cancel:()=>commit(false),get active(){return !!session;},element:field,shell};
}
