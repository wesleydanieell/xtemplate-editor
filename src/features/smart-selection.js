/**
 * Figma-inspired, editor-only one-dimensional Smart Selection.
 * It recognizes three or more nonoverlapping layers sharing a common axis and
 * approximately equal gaps. Does not introduce any new .xtemplate properties.
 */
const start=(b,axis)=>axis==='x'?b.x:b.y;
const extent=(b,axis)=>axis==='x'?b.w:b.h;
const crossStart=(b,axis)=>axis==='x'?b.y:b.x;
const crossExtent=(b,axis)=>axis==='x'?b.h:b.w;
const key=item=>Array.isArray(item.path)?item.path.join('.'):String(item.key);
function valid(item){
 const b=item?.bounds;
 return b&&[b.x,b.y,b.w,b.h].every(Number.isFinite)&&b.w>.05&&b.h>.05;
}
export function detectSmartSelection(items,{alignmentTolerance=3,gapTolerance=3}={}){
 if(!Array.isArray(items)||items.length<3||items.some(item=>!valid(item)))return null;
 const possibilities=[];
 for(const axis of ['x','y']){
  const sorted=[...items].sort((a,b)=>start(a.bounds,axis)-start(b.bounds,axis));
  const positions=sorted.map(item=>start(item.bounds,axis));
  const gaps=sorted.slice(1).map((item,i)=>positions[i+1]-
   (positions[i]+extent(sorted[i].bounds,axis)));
  if(gaps.some(gap=>gap<-.05))continue;
  const mean=Math.max(0,gaps.reduce((a,b)=>a+b,0)/gaps.length);
  const deviation=Math.max(...gaps.map(gap=>Math.abs(gap-mean)));
  if(deviation>gapTolerance)continue;
  // Rows may be top-, middle- or bottom-aligned; columns may align by their
  // left edges, horizontal centers or right edges (including different sizes).
  const alignments=[0,.5,1].map(factor=>{
   const coords=sorted.map(item=>crossStart(item.bounds,axis)+
    crossExtent(item.bounds,axis)*factor);
   return Math.max(...coords)-Math.min(...coords);
  });
  const alignmentError=Math.min(...alignments);
  if(alignmentError>alignmentTolerance)continue;
  possibilities.push({axis,gap:mean,gaps,orderedKeys:sorted.map(key),
   alignedAt:[0,.5,1][alignments.indexOf(alignmentError)],
   score:alignmentError+deviation});
 }
 if(!possibilities.length)return null;
 possibilities.sort((a,b)=>a.score-b.score);
 return possibilities[0];
}
export function adjustSmartGap(items,smart,newGap){
 if(!smart||!Number.isFinite(newGap)||newGap<0)throw Error('Invalid smart spacing');
 const byKey=new Map(items.map(item=>[key(item),item.bounds]));
 const output=new Map();
 let end=null;
 for(const name of smart.orderedKeys){
  const bounds=byKey.get(name);
  if(!bounds)throw Error('Selected layer missing');
  const axis=smart.axis;
  const position=end===null?start(bounds,axis):end+newGap;
  const result={...bounds,[axis]:position};
  output.set(name,result);
  end=position+extent(bounds,axis);
 }
 return output;
}
export function reflowSmartResize(items,smart,resized,{anchorKey=null,handle='s'}={}){
 if(!smart)return new Map(resized);
 const byKey=new Map(items.map(item=>[key(item),item.bounds]));
 const axis=smart.axis;
 const next=new Map();
 for(const name of smart.orderedKeys){
  const base=byKey.get(name);
  if(!base)throw Error('Selected layer missing');
  next.set(name,{...(resized.get(name)||base)});
 }
 // Always anchor the object whose handle is under the pointer, regardless
 // of whether the north/south/east/west edge is dragged. With three marked
 // rectangles in a column, anchoring the first rectangle instead would move
 // the middle south handle TWICE as far as the pointer (and the third 3×).
 // Reflow neighbors before and after the active object while keeping that
 // item's own dragged edge at its geometrically exact pointer position.
 const anchorIndex=anchorKey?smart.orderedKeys.indexOf(anchorKey):-1;
 const originIndex=anchorIndex<0?0:anchorIndex;
 const output=new Map();
 const originName=smart.orderedKeys[originIndex];
 const anchored=next.get(originName);
 output.set(originName,{...anchored});
 for(let i=originIndex+1;i<smart.orderedKeys.length;i++){
  const previous=output.get(smart.orderedKeys[i-1]);
  const name=smart.orderedKeys[i],bounds=next.get(name);
  output.set(name,{...bounds,[axis]:start(previous,axis)+extent(previous,axis)+smart.gaps[i-1]});
 }
 for(let i=originIndex-1;i>=0;i--){
  const following=output.get(smart.orderedKeys[i+1]);
  const name=smart.orderedKeys[i],bounds=next.get(name);
  output.set(name,{...bounds,[axis]:start(following,axis)-smart.gaps[i]-extent(bounds,axis)});
 }
 return output;
}
export function smartGapLocations(items,smart){
 if(!smart)return [];
 const byKey=new Map(items.map(item=>[key(item),item.bounds]));
 const out=[];
 for(let i=0;i<smart.orderedKeys.length-1;i++){
  const a=byKey.get(smart.orderedKeys[i]),b=byKey.get(smart.orderedKeys[i+1]);
  if(!a||!b)continue;
  const axis=smart.axis,from=start(a,axis)+extent(a,axis),to=start(b,axis);
  const across=(Math.max(crossStart(a,axis),crossStart(b,axis))+
   Math.min(crossStart(a,axis)+crossExtent(a,axis),
    crossStart(b,axis)+crossExtent(b,axis)))/2;
  out.push({axis,index:i,from,to,position:(from+to)/2,cross:across,
   distance:to-from});
 }
 return out;
}

/** Slot index for dragging an object by its Smart Selection marker.
 * The active item's own midpoint is excluded, so crossing another item's
 * center swaps its position in the visual row/column. */
export function smartReorderIndex(items,smart,movingKey,axisPosition){
 if(!smart||!Number.isFinite(axisPosition)||!smart.orderedKeys.includes(movingKey))
  throw Error('Invalid Smart Selection reorder target');
 const byKey=new Map(items.map(item=>[key(item),item.bounds]));
 const others=smart.orderedKeys.filter(name=>name!==movingKey);
 return others.reduce((index,name)=>{
  const box=byKey.get(name);
  if(!box)throw Error('Smart Selection item missing');
  return index+(axisPosition>=start(box,smart.axis)+extent(box,smart.axis)/2?1:0);
 },0);
}
/** Reflow visual positions in a new order with original per-slot gaps.
 * Layer paths, sizes, styles and stacking order are deliberately unchanged. */
export function reorderSmartSelection(items,smart,movingKey,toIndex){
 if(!smart||!smart.orderedKeys.includes(movingKey)||!Number.isInteger(toIndex))
  throw Error('Invalid Smart Selection reorder');
 const others=smart.orderedKeys.filter(name=>name!==movingKey);
 if(toIndex<0||toIndex>others.length)throw Error('Reorder slot out of range');
 const order=[...others];
 order.splice(toIndex,0,movingKey);
 const byKey=new Map(items.map(item=>[key(item),item.bounds]));
 const first=byKey.get(smart.orderedKeys[0]);
 if(!first)throw Error('Smart Selection first item missing');
 const output=new Map();
 let position=start(first,smart.axis);
 for(let index=0;index<order.length;index++){
  const name=order[index],bounds=byKey.get(name);
  if(!bounds)throw Error('Smart Selection item missing');
  if(index>0)position+=smart.gaps[index-1];
  output.set(name,{...bounds,[smart.axis]:position});
  position+=extent(bounds,smart.axis);
 }
 return {order,bounds:output};
}
