/** Relevance ordering for native XNotes properties; UI only, no document writes. */
const IMPORTANT = Object.freeze({
  repeat:['axis','period','count','fit'],
  group:['inset','clip'],
  hline:['y','x1','x2'],vline:['x','y1','y2'],
  line:['x1','y1','x2','y2'],rect:['rx'],
  circle:['cx','cy','r'],dot:['cx','cy','r'],
  ellipse:['cx','cy','rx','ry'],
  text:['size','font','weight','align','baseline','rotate'],
  polygon:['points'],polyline:['points'],
  path:['d','viewBox','aspect'],
  image:['src','fit','position'],
  hatch:['period','angle','offset'],
});
const ADVANCED=new Set(['index','stagger','extend','select','italic','dash']);
export function inspectorSections(type,fieldGroups){
  const important=new Set(IMPORTANT[type]||[]);
  const groups={essential:[],additional:[],advanced:[]};
  for(const group of fieldGroups){
    const keys=group.keys||[];
    const section=keys.some(key=>important.has(key))?'essential':keys.every(key=>ADVANCED.has(key))?'advanced':'additional';
    groups[section].push(group);
  }
  const score=group=>Math.min(...group.keys.map(k=>{
    const index=(IMPORTANT[type]||[]).indexOf(k);return index<0?999:index;
  }));
  groups.essential.sort((a,b)=>score(a)-score(b));
  return groups;
}
