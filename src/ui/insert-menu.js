/** Object insertion organized by what users intend to draw. No tools removed:
 * existing data-add handlers still own all mutations and selection semantics.
 */
const CATEGORIES=[
 ['Everyday',['text','rect','circle','ellipse','image']],
 ['Lines & paper',['line','hline','vline','dot','hatch']],
 ['Vector drawing',['polyline','polygon','path']],
 ['Layout',['group','repeat']]
];
export function initInsertMenu(menu=document.querySelector('.context-submenu')){
 if(!menu||menu.querySelector('.insert-search'))return;
 let image=menu.querySelector('[data-add="image"]');
 if(!image){
  image=document.createElement('button');image.type='button';image.dataset.add='image';
  const icon=document.createElement('span');icon.className='context-icon';icon.textContent='▧';
  image.append(icon,document.createTextNode('Image from file…'));menu.append(image);
 }
 const existing=new Map([...menu.querySelectorAll('[data-add]')].map(el=>[el.dataset.add,el]));
 const input=document.createElement('input');input.type='search';input.className='insert-search';
 input.placeholder='Find an element…';input.setAttribute('aria-label','Find an element to insert');
 const empty=document.createElement('p');empty.className='insert-no-results';empty.textContent='No matching elements';empty.hidden=true;
 const groups=[];
 menu.replaceChildren(input);
 for(const [title,types] of CATEGORIES){
  const section=document.createElement('div');section.className='insert-category';
  const heading=document.createElement('div');heading.className='insert-category-label';heading.textContent=title;
  section.append(heading);
  for(const type of types){const button=existing.get(type);if(button){section.append(button);existing.delete(type);}}
  menu.append(section);groups.push(section);
 }
 if(existing.size){const other=document.createElement('div');other.className='insert-category';
  const label=document.createElement('div');label.className='insert-category-label';label.textContent='Other';other.append(label,...existing.values());menu.append(other);groups.push(other);
 }
 menu.append(empty);
 const search=()=>{
  const q=input.value.trim().toLocaleLowerCase('en');let total=0;
  for(const group of groups){let count=0;for(const item of group.querySelectorAll('[data-add]')){
   const matched=(item.textContent+' '+item.dataset.add).toLocaleLowerCase('en').includes(q);
   item.hidden=!matched;if(matched)count++;
  }group.hidden=count===0;total+=count;}
  empty.hidden=total!==0;
 };
 input.addEventListener('input',search);
 // A keyboard-accessible search box in the popover replaces memorizing
 // 15 tool names or scanning an alphabetic list.
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){input.value='';search();input.blur();e.stopPropagation();}
  else if(e.key==='Enter'){
   const first=menu.querySelector('[data-add]:not([hidden])');if(first){first.click();e.preventDefault();}
  }
 });
 return {searchInput:input,reset(){input.value='';search();}};
}
