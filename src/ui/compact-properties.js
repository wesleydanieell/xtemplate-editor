/** Compact, capability-driven Inspector controls.
 * Reuse the existing native inputs/events rather than introducing a second
 * source of truth for .xtemplate values and the undo stack. */
import {icon} from './icons.js';

function shortTitle(label,text){
 const name=document.createElement('span');
 name.className='compact-property-label';
 name.textContent=text;
 label.append(name);
 return name;
}
function glyph(name){
 const span=document.createElement('span');
 span.className='compact-property-icon';
 span.setAttribute('aria-hidden','true');
 span.append(icon(name,{size:14}));
 return span;
}
export function decorateValueField(field,{name,iconName}){
 if(!field||field.dataset.compactValue)return field;
 const input=field.querySelector('input,select,textarea');
 if(!input)return field;
 field.dataset.compactValue='true';
 field.classList.add('compact-value-field');
 // The original input retains its focus, scrubbing, variable completion and change listeners.
 field.replaceChildren(glyph(iconName),shortTitle(document.createDocumentFragment(),name),input);
 input.setAttribute('aria-label',name);
 field.title=field.title||name;
 return field;
}
export function makePaintControl(input,name){
 const original=input.closest('label.field');
 const row=document.createElement('div');
 row.className='compact-paint-row';
 row.dataset.paintKey=input.dataset.property || (input.id==='elementFill'?'fill':'stroke');
 row.append(glyph(name==='Fill'?'paintbrush':'minus'));
 const label=document.createElement('label');
 label.className='compact-paint-label';label.htmlFor=input.id;label.textContent=name;
 const inputBox=document.createElement('div');inputBox.className='compact-paint-inputs';
 const picker=document.createElement('input');picker.type='color';picker.className='compact-paint-picker';
 picker.setAttribute('aria-label',name+' color picker');
 picker.title='Choose '+name.toLowerCase()+' color';
 input.classList.add('compact-paint-text');input.dataset.property=row.dataset.paintKey;
 input.setAttribute('aria-label',name+' color or template variable');
 const none=document.createElement('button');
 none.type='button';none.className='compact-paint-none';none.textContent='×';
 none.setAttribute('aria-label','Set '+name.toLowerCase()+' to none');none.title='No '+name.toLowerCase();
 picker.addEventListener('input',()=>{input.value=picker.value;row.dataset.empty='false';});
 picker.addEventListener('change',()=>{
  input.value=picker.value;
  input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 none.addEventListener('click',()=>{
  input.value='none';input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 inputBox.append(picker,input,none);
 row.append(label,inputBox);
 original?.replaceWith(row);
 return row;
}
export function decorateOpacity(field){
 if(!field||field.dataset.compactOpacity)return;
 const slider=field.querySelector('#transformOpacity, input[type="range"][data-property="opacity"]');
 const output=field.querySelector('#transformOpacityValue');
 if(!slider)return;
 field.dataset.compactOpacity='true';
 field.classList.add('compact-opacity');
 const heading=document.createElement('div');heading.className='compact-opacity-heading';
 heading.append(glyph('sliders-horizontal'),shortTitle(document.createDocumentFragment(),'Opacity'));
 const value=document.createElement('div');value.className='compact-opacity-value';
 const number=document.createElement('input');
 number.type='number';number.min='0';number.max='100';number.step='1';number.value=slider.value;
 number.id=slider.id==='transformOpacity'?'compactOpacityValue':'compactMultiOpacityValue';number.className='compact-opacity-input';
 number.setAttribute('aria-label','Opacity percentage');
 const unit=document.createElement('span');unit.textContent='%';
 value.append(number,unit);heading.append(value);
 if(output)output.hidden=true;
 field.replaceChildren(heading,slider,...(output?[output]:[]));
 slider.setAttribute('aria-label','Opacity slider');
 slider.addEventListener('input',()=>{number.value=slider.value;});
 number.addEventListener('change',()=>{
  const parsed=Number(number.value);
  if(!Number.isFinite(parsed)){number.value=slider.value;return;}
  slider.value=String(Math.max(0,Math.min(100,Math.round(parsed))));
  slider.dispatchEvent(new Event('input',{bubbles:true}));
  slider.dispatchEvent(new Event('change',{bubbles:true}));
 });
}
function pickerHex(value){
 if(typeof value!=='string')return null;
 const hex=value.trim();
 if(/^#[0-9a-f]{6}$/i.test(hex))return hex;
 if(/^#[0-9a-f]{3}$/i.test(hex))return '#'+[...hex.slice(1)].map(x=>x+x).join('');
 return null;
}
export function syncCompactControls(root,resolveColor){
 for(const row of root.querySelectorAll('.compact-paint-row')){
  const field=row.querySelector('.compact-paint-text');
  const picker=row.querySelector('.compact-paint-picker');
  const source=field.value.trim();
  const resolved=pickerHex(resolveColor(source));
  const active=pickerHex(source);
  if(document.activeElement!==picker)picker.value=active||resolved||'#666666';
  row.dataset.empty=source.toLowerCase()==='none'?'true':'false';
  row.dataset.reference=active?'false':'true';
  picker.disabled=field.disabled;
  row.querySelector('.compact-paint-none').disabled=field.disabled;
 }
 for(const field of root.querySelectorAll('.compact-opacity')){
  const slider=field.querySelector('input[type="range"]');
  const numeric=field.querySelector('.compact-opacity-input');
  if(numeric&&slider&&document.activeElement!==numeric)numeric.value=slider.value;
 }
}

/** Same controls for intersections of compatible multi-selection properties. */
export function enhanceMultiInspector(root,resolveColor){
 for(const key of ['fill','stroke']){
  const input=root.querySelector(`input[data-property="${key}"]`);
  if(input)makePaintControl(input,key==='fill'?'Fill':'Stroke');
 }
 const width=root.querySelector('input[data-property="strokeWidth"]')?.closest('label.field');
 if(width)decorateValueField(width,{name:'Width',iconName:'minus'});
 const opacity=root.querySelector('input[type="range"][data-property="opacity"]')?.closest('label.field');
 if(opacity)decorateOpacity(opacity);
 syncCompactControls(root,resolveColor);
}
