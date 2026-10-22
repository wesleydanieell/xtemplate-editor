/** Native fields are moved (never cloned) into a contextual property system.
 * Element content and shared paint controls appear early; geometry and
 * technical expressions remain fully editable with their existing handlers. */
import {makePaintControl,decorateValueField,decorateOpacity} from './compact-properties.js';

function section(id,title){
 const element=document.createElement('section');
 element.className='property-block';element.dataset.block=id;
 const heading=document.createElement('h3');heading.className='property-block-title';
 heading.textContent=title;element.append(heading);return element;
}
export function buildInspectorLayout(root){
 if(root.querySelector('[data-inspector-layout]'))return;
 const context=root.querySelector('#contextualElementTools');
 const transform=root.querySelector('.transform-panel');
 const expressions=root.querySelector('.expression-settings');
 const paints=root.querySelector('.appearance-section');
 const legacy=[...root.querySelectorAll(':scope > .inspector-details')].find(el=>!el.classList.contains('expression-settings'));
 const width=legacy?.querySelector('#elementStrokeWidth')?.closest('label.field');
 const text=legacy?.querySelector('#elementText')?.closest('label.field');
 const opacity=root.querySelector('#transformOpacity')?.closest('label.field');
 const advanced=root.querySelector('#advancedInspector'),actions=root.querySelector('.inspector-actions');
 const tip=root.querySelector(':scope > .inspector-tip');
 if(!transform||!expressions||!paints||!width||!text||!opacity||!advanced||!actions)
  throw Error('Inspector DOM contract changed');
 const align=transform.querySelector('.alignment-tools');if(align)transform.append(align);
 // Preserve the original #elementStroke and #elementFill inputs and change handlers.
 const fill=makePaintControl(root.querySelector('#elementFill'),'Fill');
 const stroke=makePaintControl(root.querySelector('#elementStroke'),'Stroke');
 const paintLines=document.createElement('div');paintLines.className='compact-paint-list';
 paintLines.append(fill,stroke);paints.replaceChildren(paintLines);
 decorateValueField(width,{name:'Width',iconName:'minus'});
 decorateOpacity(opacity);
 const metrics=document.createElement('div');metrics.className='appearance-metrics';
 const radiusSlot=document.createElement('div');radiusSlot.className='radius-field-slot';
 metrics.append(width,radiusSlot);
 const dash=document.createElement('details');dash.className='appearance-stroke-details';
 const summary=document.createElement('summary');summary.textContent='Stroke options';
 const dashSlot=document.createElement('div');dashSlot.className='appearance-dash-slot';
 dash.append(summary,dashSlot);
 const content=section('content','Content');text.classList.add('text-content-field');content.append(text);
 const layout=section('layout','Transform');layout.append(transform);
 const appearance=section('appearance','Appearance');appearance.append(paints,metrics,dash,opacity);
 const specific=section('specific','Element options');specific.append(advanced);
 const primaryOpacity=document.createElement('div');primaryOpacity.className='primary-opacity';
 specific.append(primaryOpacity);
 const technical=section('technical','Precision & expressions');technical.append(expressions);
 const footer=document.createElement('div');footer.className='property-block-footer';footer.append(actions);
 if(tip){tip.classList.add('visually-hidden');technical.append(tip);}
 if(legacy){legacy.hidden=true;legacy.classList.add('inspector-legacy-values');}
 const shell=document.createElement('div');
 shell.dataset.inspectorLayout='true';shell.className='inspector-blocks';
 if(context)shell.append(context);
 shell.append(content,appearance,specific,layout,technical,footer);
 if(legacy)shell.append(legacy);
 root.replaceChildren(shell);
}
export function updateInspectorLayout(root,node,{cropped=false}={}){
 const shell=root.querySelector('[data-inspector-layout]');if(!shell)return;
 const block=id=>shell.querySelector(`[data-block="${id}"]`);
 const content=block('content'),specific=block('specific'),appearance=block('appearance');
 const type=node?.type||'',photo=type==='image'||cropped,writing=type==='text';
 const paints=appearance.querySelector('.appearance-section')||content.querySelector('.appearance-section');
 const metrics=appearance.querySelector('.appearance-metrics')||content.querySelector('.appearance-metrics');
 const dashDetails=appearance.querySelector('.appearance-stroke-details')||content.querySelector('.appearance-stroke-details');
 const opacity=root.querySelector('#transformOpacity')?.closest('label.field');
 const primaryOpacity=specific.querySelector('.primary-opacity');
 const advanced=specific.querySelector('#advancedInspector');

 // Move newly generated, type-specific fields to their shared categories.
 // No duplicate radius / dash editors: only these native inputs are visible.
 const radius=advanced.querySelector('label[data-field-keys="rx"]');
 const radiusSlot=metrics.querySelector('.radius-field-slot');radiusSlot.replaceChildren();
 if(radius&&type==='rect'){
  decorateValueField(radius,{name:'Radius',iconName:'corner-down-right'});
  radiusSlot.append(radius);
 }
 const dash=advanced.querySelector('label[data-field-keys="dash"]');
 const dashSlot=dashDetails.querySelector('.appearance-dash-slot');dashSlot.replaceChildren();
 if(dash&&!photo)dashSlot.append(dash);
 dashDetails.hidden=!dashSlot.children.length;
 for(const disclosure of advanced.querySelectorAll('.advanced-disclosure')){
  if(!disclosure.querySelector('.field,.field-row'))disclosure.hidden=true;
 }
 const destination=photo?primaryOpacity:writing?content:appearance;
 const paintHost=writing?content:appearance;
 for(const control of [paints,metrics,dashDetails])
  if(control&&control.parentElement!==paintHost)paintHost.append(control);
 if(opacity&&opacity.parentElement!==destination)destination.append(opacity);
 if(writing){
  // Content, fill, outline, radius/width and opacity live together above Character.
  // No redundant 'Edit on canvas' button: double-click remains available.
  content.querySelector('.property-block-title').textContent='Content & appearance';
 }else content.querySelector('.property-block-title').textContent='Content';
 content.hidden=!writing;
 const inkOnly=['line','hline','vline','hatch'].includes(type);
 const fillRow=paints.querySelector('[data-paint-key="fill"]');
 const strokeRow=paints.querySelector('[data-paint-key="stroke"]');
 fillRow.hidden=photo||inkOnly;
 strokeRow.hidden=photo||type==='dot';
 const strokeWidth=metrics.querySelector('#elementStrokeWidth')?.closest('.compact-value-field');
 if(strokeWidth)strokeWidth.hidden=photo||type==='dot';
 metrics.hidden=photo||(!radiusSlot.children.length&&strokeWidth?.hidden);
 paints.hidden=photo;
 appearance.hidden=photo||writing;
 const entries=advanced.querySelectorAll('label.field,.field-row,.crop-controls,.character-controls');
 specific.hidden=entries.length===0&&!photo;
 specific.querySelector('.property-block-title').textContent=photo?'Image':type==='text'?'Typography':
  type==='repeat'?'Repeat pattern':type==='group'?'Group':
  ['polyline','polygon','path'].includes(type)?'Vector geometry':
  ['line','hline','vline'].includes(type)?'Line geometry':'Geometry';
 const rotation=root.querySelector('#transformRotate')?.closest('label.field');
 if(rotation)rotation.hidden=photo;
 shell.dataset.propertyType=photo?'image':type;
}
