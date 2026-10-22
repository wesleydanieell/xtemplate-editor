/** Compact Character panel inspired by professional image/graphic editors.
 * These controls proxy existing .xtemplate fields rather than duplicating
 * the document model, so legacy keyboard editing and export stay intact. */
import {icon} from './icons.js';
const choices={font:{sans:'Sans serif',serif:'Serif',mono:'Monospace'},baseline:{alphabetic:'Alphabetic',middle:'Middle',top:'Top'}};
function group(title,className){
 const row=document.createElement('div');row.className='character-action-row '+className;
 const heading=document.createElement('span');heading.className='character-action-caption';heading.textContent=title;
 const tools=document.createElement('div');tools.className='character-segmented';tools.setAttribute('role','group');tools.setAttribute('aria-label',title);
 row.append(heading,tools);return {row,tools};
}
function buttonFor({label,name,pressed,onClick}){
 const btn=document.createElement('button');btn.type='button';btn.className='character-segment';btn.setAttribute('aria-label',label);
 btn.setAttribute('title',label);btn.setAttribute('aria-pressed',String(pressed));btn.append(icon(name,{size:16}));
 btn.addEventListener('click',onClick);return btn;
}
export function enhanceCharacterPanel(root){
 if(!root||root.dataset.characterReady)return;
 root.dataset.characterReady='true';
 for(const [key,names] of Object.entries(choices)){
  const select=root.querySelector(`[data-character-field="${key}"] select`);
  if(select)for(const option of select.options)if(names[option.value])option.textContent=names[option.value];
 }
 const weight=root.querySelector('[data-character-field="weight"] select');
 const italic=root.querySelector('[data-character-field="italic"] input[type="checkbox"]');
 const alignment=root.querySelector('[data-character-field="align"] select');
 if(!weight||!italic||!alignment)return;
 for(const key of ['weight','italic','align']){
  const field=root.querySelector(`[data-character-field="${key}"]`);
  field.classList.add('character-native-proxy');
  // Only the display affordance is replaced: the native field still owns the
  // event bindings and remains script-addressable for older editor workflows.
  field.querySelector('input,select')?.setAttribute('tabindex','-1');
 }
 // Keep both short, related option groups in one compact two-column row.
 const compact=document.createElement('div');compact.className='character-compact-actions';
 const styles=group('Style','character-style-row');
 styles.tools.append(
  buttonFor({label:'Bold',name:'bold',pressed:weight.value==='bold',onClick:()=>{
   weight.value=weight.value==='bold'?'normal':'bold';weight.dispatchEvent(new Event('change',{bubbles:true}));
  }}),
  buttonFor({label:'Italic',name:'italic',pressed:italic.checked,onClick:()=>{
   italic.checked=!italic.checked;italic.dispatchEvent(new Event('change',{bubbles:true}));
  }})
 );
 compact.append(styles.row);
 const align=group('Text anchor','character-alignment-row');
 for(const [value,label,iconName] of [
  ['start','Align left','align-left'],['middle','Align center','align-center'],['end','Align right','align-right']]){
  align.tools.append(buttonFor({label,name:iconName,pressed:alignment.value===value,onClick:()=>{
   if(alignment.value===value)return;
   alignment.value=value;alignment.dispatchEvent(new Event('change',{bubbles:true}));
  }}));
 }
 compact.append(align.row);
 root.append(compact);
 const place=group('Place on page','character-page-align-row');
 for(const [command,label,iconName] of [
  ['left','Page left','align-start-vertical'],['center-x','Page horizontal center','align-center-vertical'],
  ['right','Page right','align-end-vertical'],['top','Page top','align-start-horizontal'],
  ['center-y','Page vertical center','align-center-horizontal'],['bottom','Page bottom','align-end-horizontal']]){
  const control=buttonFor({label,name:iconName,pressed:false,onClick:()=>{
   // Use the existing document-aware alignment command, including geometry,
   // Undo and text baseline semantics. No duplicated alignment calculations.
   document.querySelector(`.alignment-tools [data-align="${command}"]`)?.click();
  }});
  control.removeAttribute('aria-pressed');control.dataset.pageAlign=command;
  place.tools.append(control);
 }
 root.append(place.row);
}
