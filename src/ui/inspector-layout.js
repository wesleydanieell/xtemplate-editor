/** Task-first inspector: move existing controls, don't clone/duplicate fields.
 * Each native control keeps its ID, event handlers and `.xtemplate` semantics.
 * The panel is assembled once; the visible groups are context-sensitive.
 */
function section(id,title){
 const section=document.createElement('section');section.className='property-block';section.dataset.block=id;
 const heading=document.createElement('h3');heading.className='property-block-title';heading.textContent=title;
 section.append(heading);return section;
}
export function buildInspectorLayout(root){
 if(root.querySelector('[data-inspector-layout]'))return;
 const context=root.querySelector('#contextualElementTools');
 const layout=root.querySelector('.transform-panel');
 const expressions=root.querySelector('.expression-settings');
 const paints=root.querySelector('.appearance-section');
 const legacyDetails=[...root.querySelectorAll(':scope > .inspector-details')].find(el=>!el.classList.contains('expression-settings'));
 const stroke=legacyDetails?.querySelector('#elementStrokeWidth')?.closest('label.field');
 const textField=legacyDetails?.querySelector('#elementText')?.closest('label.field');
 const opacity=root.querySelector('#transformOpacity')?.closest('label.field');
 const advanced=root.querySelector('#advancedInspector');
 const actions=root.querySelector('.inspector-actions');
 const tip=root.querySelector(':scope > .inspector-tip');
 if(!layout||!expressions||!paints||!stroke||!textField||!opacity||!advanced||!actions)throw Error('Inspector DOM contract changed');
 // Alignment relates to positioning, not to the initial content of the layout.
 const align=layout.querySelector('.alignment-tools');if(align)layout.append(align);
 const content=section('content','Content');content.append(textField);
 const geometry=section('layout','Transform');geometry.append(layout);
 const appearance=section('appearance','Appearance');appearance.append(paints,stroke,opacity);
 const specifics=section('specific','Object settings');specifics.append(advanced);
 const primaryOpacity=document.createElement('div');primaryOpacity.className='primary-opacity';specifics.append(primaryOpacity);
 const technical=section('technical','Precision & expressions');technical.append(expressions);
 const footer=document.createElement('div');footer.className='property-block-footer';footer.append(actions);
 if(tip){tip.classList.add('visually-hidden');technical.append(tip);}
 if(legacyDetails){legacyDetails.hidden=true;legacyDetails.classList.add("inspector-legacy-values");}
 const shell=document.createElement('div');shell.dataset.inspectorLayout='true';shell.className='inspector-blocks';
 if(context)shell.append(context);
 shell.append(content,specifics,geometry,appearance,technical,footer);
 if(legacyDetails)shell.append(legacyDetails);
 root.replaceChildren(shell);
}
export function updateInspectorLayout(root,node,{cropped=false}={}){
 const shell=root.querySelector('[data-inspector-layout]');if(!shell)return;
 const block=id=>shell.querySelector(`[data-block="${id}"]`);
 const content=block('content'),specific=block('specific'),appearance=block('appearance');
 const type=node?.type||'';
 const photo=type==='image'||cropped;
 const opacity=root.querySelector('#transformOpacity')?.closest('label.field');
 const destination=photo?specific.querySelector('.primary-opacity'):appearance;
 if(opacity&&opacity.parentElement!==destination)destination.append(opacity);
 content.hidden=type!=='text';
 specific.hidden=!specific.querySelector('#advancedInspector')?.children.length;
 specific.querySelector('.property-block-title').textContent=photo?'Image':type==='repeat'?'Repeat pattern':type==='group'?'Group':type==='text'?'Typography':
   ['polyline','polygon','path'].includes(type)?'Vector geometry':
   ['line','hline','vline'].includes(type)?'Line geometry':'Shape settings';
 // Cropped images still have opacity, but not meaningless stroke and fill.
 appearance.querySelector('.appearance-section').hidden=photo;
 appearance.querySelector('#elementStrokeWidth')?.closest('label.field')?.toggleAttribute('hidden',photo);
 appearance.hidden=false;
 const rot=root.querySelector('#transformRotate')?.closest('label.field');
 if(rot)rot.hidden=photo;
 // The crop controls and the image-specific fields appear before dimensions.
 shell.dataset.propertyType=photo?'image':type;
 // Type-specific controls always remain available in the dedicated group.
}
