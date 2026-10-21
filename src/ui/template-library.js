/** Discoverable templates: search and one-level category filtering rather than
 * a 26-item flat dropdown. The original #topExample select and change events
 * are preserved, so importing and automation keep their behavior.
 */
export function categoryForExample(filename){
 const file=String(filename).toLowerCase();
 if(file.startsWith('cover-'))return 'Covers';
 if(/(planner|todo|checklist|storyboard)/.test(file))return 'Planning';
 if(/(grid|dots|dot-|hexagon|isometric|engineering|polar|semilog|perspective)/.test(file))return 'Grids';
 return 'Study pages';
}
export function initTemplateLibrary(select=document.querySelector('#topExample')){
 if(!select||select.dataset.libraryReady)return;
 select.dataset.libraryReady='true';
 const entries=[...select.options].filter(el=>el.value).map(opt=>({value:opt.value,text:opt.textContent.trim(),group:categoryForExample(opt.value)}));
 const label=select.closest('.template-picker');
 const wrap=document.createElement('div');wrap.className='template-discovery';
 const input=document.createElement('input');input.type='search';input.className='template-search';
 input.placeholder='Search templates…';input.setAttribute('aria-label','Search example templates');
 const chips=document.createElement('div');chips.className='template-categories';chips.setAttribute('role','group');chips.setAttribute('aria-label','Template categories');
 const info=document.createElement('p');info.className='template-results';info.setAttribute('aria-live','polite');
 const categories=['All','Covers','Study pages','Grids','Planning'];let active='All';
 const buttons=new Map();
 function update(){
  const q=input.value.trim().toLocaleLowerCase('en');
  const filtered=entries.filter(entry=>(active==='All'||entry.group===active)&&`${entry.text} ${entry.value}`.toLocaleLowerCase('en').includes(q));
  const previous=select.value;
  select.replaceChildren(new Option('Choose a template…',''));
  for(const cat of categories.slice(1)){
   const found=filtered.filter(entry=>entry.group===cat);if(!found.length)continue;
   const group=document.createElement('optgroup');group.label=`${cat} (${found.length})`;
   for(const entry of found)group.append(new Option(entry.text,entry.value));
   select.append(group);
  }
  select.value=filtered.some(entry=>entry.value===previous)?previous:'';
  info.textContent=filtered.length?`${filtered.length} templates · Choose one below`:'No matches. Try a different search.';
  for(const [key,button] of buttons){const chosen=key===active;button.setAttribute('aria-pressed',String(chosen));button.classList.toggle('active',chosen);}
 }
 for(const category of categories){
  const button=document.createElement('button');button.type='button';button.className='template-chip';
  button.textContent=category;button.dataset.templateCategory=category;
  button.addEventListener('click',()=>{active=category;update();});
  buttons.set(category,button);chips.append(button);
 }
 wrap.append(input,chips,info);
 label.parentNode.insertBefore(wrap,label);
 input.addEventListener('input',update);
 update();
}
