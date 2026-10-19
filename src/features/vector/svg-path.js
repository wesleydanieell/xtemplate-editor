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
  const start=i,c=d[i];if(!/[A-Za-z]/.test(c))throw new Error('Only explicit SVG path commands are editable');
  if(!Object.hasOwn(argCount,c))throw new Error('Unsupported visual edit command: '+c+' (original path preserved)');
  command=c;i++;
  if(closed)throw new Error('Multiple SVG contours need the advanced d editor');
  if(!seenStart&&command!=='M')throw new Error('Path must start with M');
  if(command==='Z'){closed=true;segments.push({command,points:[],start,end:i});continue;}
  const parts=[];for(let j=0;j<argCount[command];j++)parts.push(takeNumber());
  const pts=[];for(let j=0;j<parts.length;j+=2){
   const point={x:parts[j].value,y:parts[j+1].value,xToken:parts[j],yToken:parts[j+1],role:j===parts.length-2?'anchor':'control'};
   pts.push(point);nodes.push(point);
  }
  if(command==='M'){
   if(seenStart)throw new Error('Multiple SVG contours need the advanced d editor');
   seenStart=true;
  }
  segments.push({command,points:pts,start,end:i});
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

/** Remove one complete native segment only when its anchor is selected. */
export function removeSvgPathAnchor(d,index){
 const parsed=editablePathNodes(d),point=parsed.nodes[index];
 if(!point||point.role!=='anchor')throw new Error('Select a path anchor, not a Bézier control');
 const segment=parsed.segments.find(s=>s.points.at(-1)===point);
 if(!segment||segment.command==='M')throw new Error('The initial M anchor cannot be removed');
 const drawable=parsed.segments.filter(s=>s.command!=='M'&&s.command!=='Z');
 if(drawable.length<2)throw new Error('A path needs at least one drawable segment');
 return d.slice(0,segment.start)+d.slice(segment.end);
}

/** Display each cubic Bézier control as a handle attached to its own anchor.
 * C control #1 is the previous anchor's outgoing tangent; #2 is the current
 * anchor's incoming tangent. Quadratic controls are single shared handles. */
export function pathHandleConnections(parsed){
 const result=[];let previous=null;
 for(const segment of parsed.segments){
  const points=segment.points;
  if(segment.command==='M'||segment.command==='L'){previous=points.at(-1);continue;}
  if(segment.command==='C'){
   const end=points.at(-1);
   result.push({index:parsed.nodes.indexOf(points[0]),anchorIndex:parsed.nodes.indexOf(previous),side:'outgoing'});
   result.push({index:parsed.nodes.indexOf(points[1]),anchorIndex:parsed.nodes.indexOf(end),side:'incoming'});
   previous=end;
  }else if(segment.command==='Q'){
   result.push({index:parsed.nodes.indexOf(points[0]),anchorIndex:parsed.nodes.indexOf(previous),side:'quadratic'});
   previous=points.at(-1);
  }
 }
 return result;
}

/** Exact geometry bounds for the supported authored SVG path subset.
 * Control points can lie far outside the visible Bézier curve; using their
 * extrema as the mirror center would visibly displace the flipped shape. */
export function svgPathGeometryBounds(parsed) {
 const coords=[[],[]];
 const push=(x,y)=>{if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Invalid SVG coordinate');coords[0].push(x);coords[1].push(y);};
 const extremalParameters=(a,b,c)=>{
  const eps=1e-12,roots=[];
  if(Math.abs(a)<eps){if(Math.abs(b)>eps)roots.push(-c/b);}
  else{const d=b*b-4*a*c;if(d>=0){const root=Math.sqrt(d);roots.push((-b-root)/(2*a),(-b+root)/(2*a));}}
  return roots.filter(t=>t>0&&t<1);
 };
 let current=null,start=null;
 for(const {command,points} of parsed.segments){
  if(command==='M'){current=points[0];start=current;push(current.x,current.y);continue;}
  if(command==='Z'){if(start)current=start;continue;}
  if(!current)throw new Error('SVG path must begin with M');
  const end=points.at(-1);
  if(command==='L'){push(end.x,end.y);current=end;continue;}
  const degree=command==='C'?3:2;
  for(let axis=0;axis<2;axis++){
   const key=axis===0?'x':'y';
   const values=[current,...points].map(p=>p[key]);
   const evaluate=t=>{
    const u=1-t;
    return degree===3
     ? u*u*u*values[0]+3*u*u*t*values[1]+3*u*t*t*values[2]+t*t*t*values[3]
     : u*u*values[0]+2*u*t*values[1]+t*t*values[2];
   };
   const roots=degree===3
    ? extremalParameters(3*(-values[0]+3*values[1]-3*values[2]+values[3]),
       6*(values[0]-2*values[1]+values[2]),3*(values[1]-values[0]))
    : extremalParameters(0,2*(values[0]-2*values[1]+values[2]),2*(values[1]-values[0]));
   for(const t of [0,1,...roots])coords[axis].push(evaluate(t));
  }
  current=end;
 }
 if(!coords[0].length||!coords[1].length)throw new Error('Empty SVG path');
 const extrema=values=>values.reduce(([lo,hi],v)=>[Math.min(lo,v),Math.max(hi,v)],[Infinity,-Infinity]);
 const [minX,maxX]=extrema(coords[0]),[minY,maxY]=extrema(coords[1]);
 return{x:minX,y:minY,w:maxX-minX,h:maxY-minY};
}
