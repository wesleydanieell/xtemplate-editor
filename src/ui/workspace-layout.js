/** Navigation density: keep both docks accessible, but let the canvas take focus.
 * Two user-controlled panel toggles replace hidden-on-small-screen controls.
 */
export function initWorkspacePanels({app=document.querySelector('.app'),container=document.querySelector('.top-actions')}={}){
 if(!app||!container)throw Error('Workspace layout needs an app and actions bar');
 if(container.querySelector('[data-toggle-panel]'))return;
 const slot=document.createElement('div');slot.className='dock-toggle-group';slot.setAttribute('role','group');slot.setAttribute('aria-label','Workspace panels');
 for(const [name,label,shortcut] of [['layers','Layers','Alt+1'],['properties','Properties','Alt+2']]){
  const button=document.createElement('button');button.type='button';button.dataset.togglePanel=name;
  button.className='dock-toggle';button.textContent=label;
  button.title=`Show or hide ${label} panel (${shortcut})`;
  button.setAttribute('aria-controls',name==='layers'?'leftWorkspacePanel':'rightWorkspacePanel');
  const update=()=>{const visible=!app.classList.contains('app--hide-'+name);button.setAttribute('aria-pressed',String(visible));button.classList.toggle('is-active',visible);};
  button.addEventListener('click',()=>{app.classList.toggle('app--hide-'+name);update();});
  slot.append(button);update();
 }
 container.prepend(slot);
 const compact=window.matchMedia('(max-width: 720px)');
 // Phone layout starts with the canvas, not two stacked editor docks.
 if(compact.matches){
  app.classList.add('app--hide-layers','app--hide-properties');
  for(const button of slot.querySelectorAll('[data-toggle-panel]')){
   button.setAttribute('aria-pressed','false');button.classList.remove('is-active');
  }
 }
 // Docks behave as exclusive drawers on phones; no simultaneous overlays.
 for(const button of slot.querySelectorAll('[data-toggle-panel]')){
  button.addEventListener('click',()=>{
   if(!compact.matches)return;
   const name=button.dataset.togglePanel,other=name==='layers'?'properties':'layers';
   if(!app.classList.contains('app--hide-'+other)){
    app.classList.add('app--hide-'+other);
    const otherButton=slot.querySelector(`[data-toggle-panel="${other}"]`);
    otherButton.setAttribute('aria-pressed','false');otherButton.classList.remove('is-active');
   }
  });
 }
 document.querySelector('#topExample')?.addEventListener('change',()=>{
  if(compact.matches&&!app.classList.contains('app--hide-layers'))slot.querySelector('[data-toggle-panel="layers"]').click();
 });
 document.querySelector('#tree')?.addEventListener('click',e=>{
  if(compact.matches&&e.target.closest('.tree-item')&&!e.target.closest('.tree-disclosure')&&!app.classList.contains('app--hide-layers')){
   slot.querySelector('[data-toggle-panel="layers"]').click();
  }
 });
 window.addEventListener('keydown',event=>{
  if(!event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  const name=event.code==='Digit1'?'layers':event.code==='Digit2'?'properties':null;
  if(name){event.preventDefault();slot.querySelector(`[data-toggle-panel="${name}"]`).click();}
 });
}
