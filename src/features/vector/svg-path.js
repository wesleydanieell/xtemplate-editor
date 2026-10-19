/** Lossless-coordinate subset of XNotes' SVG path grammar.
 * Refuses relative, shorthand, arc and implicit commands: never silently normalize imported d. */
const number=/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[Ee][-+]?\d+)?/y;
const argCount={M:2,L:2,C:6,Q:4,Z:0};
export function editablePathNodes(d){
 if(typeof d!=='string'||d.length>200_000)throw new Error('Invalid SVG path data');
 let i=0,command=null,seenStart=false,closed=false;
 const nodes=[],segments=[];
 function skip(){while(i<d.length&&/[\s,]/.test(d[i]))i++;}
 function takeNumber(){skip();number.lastIndex=i;const m=number.exec(d);if(!m)throw new Error('Expected SVG coordinate');const out={value:Number(m[0]),start:i,end:number.lastIndex};i=number.lastIndex;return out;}
 while(i<d.length){
  skip();if(i>=d.length)break;
  const c=d[i];if(!/[A-Za-z]/.test(c))throw new Error('Only explicit SVG path commands are editable');
  if(!Object.hasOwn(argCount,c))throw new Error('Unsupported visual edit command: '+c+' (original path preserved)');
  command=c;i++;
  if(closed)throw new Error('Multiple SVG contours need the advanced d editor');
  if(!seenStart&&command!=='M')throw new Error('Path must start with M');
  if(command==='Z'){closed=true;segments.push({command,points:[]});continue;}
  const parts=[];for(let j=0;j<argCount[command];j++)parts.push(takeNumber());
  const pts=[];for(let j=0;j<parts.length;j+=2){
   const point={x:parts[j].value,y:parts[j+1].value,xToken:parts[j],yToken:parts[j+1],role:j===parts.length-2?'anchor':'control'};
   pts.push(point);nodes.push(point);
  }
  if(command==='M'){
   if(seenStart)throw new Error('Multiple SVG contours need the advanced d editor');
   seenStart=true;
  }
  segments.push({command,points:pts});
 }
 if(!seenStart||segments.length<2)throw new Error('Path needs an M and at least one segment');
 return{segments,nodes,closed};
}
export function replaceSvgPathPoint(d,point,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Invalid SVG coordinates');
 const value=n=>String(Number(n.toFixed(3)));
 // Replace by original source offsets so whitespace and unmodified commands survive byte-for-byte.
 const replacements=[{...point.xToken,text:value(x)},{...point.yToken,text:value(y)}].sort((a,b)=>b.start-a.start);
 for(const token of replacements)d=d.slice(0,token.start)+token.text+d.slice(token.end);
 return d;
}
export function appendSvgLine(d,x,y){
 const parsed=editablePathNodes(d),line=` L ${Number(x.toFixed(3))} ${Number(y.toFixed(3))}`;
 if(parsed.closed){const match=/\s*Z\s*$/.exec(d);if(!match)throw new Error('Expected closing Z');return d.slice(0,match.index)+line+d.slice(match.index);}
 return d+line;
}
export function toggleSvgClosed(d){const parsed=editablePathNodes(d);return parsed.closed?d.replace(/\s*Z\s*$/,''):d+' Z';}
