/** Equal-gap snapping for independent selected shapes.
 * Candidates are inferred from visible neighbor geometry, not saved in
 * .xtemplate, so no new native attributes are required. */
function finite(b){return b&&[b.x,b.y,b.w,b.h].every(Number.isFinite)&&b.w>=0&&b.h>=0;}
function ranges(b,axis){
 return axis==='x'?{start:b.x,end:b.x+b.w,cross:b.y,crossEnd:b.y+b.h}:
  {start:b.y,end:b.y+b.h,cross:b.x,crossEnd:b.x+b.w};
}
function crossOverlap(a,b){
 return Math.min(a.crossEnd,b.crossEnd)-Math.max(a.cross,b.cross)>-.01;
}
function visibleBetween(moving,targets,axis){
 const movingAxis=ranges(moving,axis);
 return targets.filter(t=>finite(t)&&crossOverlap(movingAxis,ranges(t,axis)));
}
export function calculateEqualSpacingSnap(moving,targetRects,toleranceX,toleranceY=toleranceX){
 const result={dx:null,dy:null,segments:[]};
 if(!finite(moving))return result;
 for(const axis of ['x','y']){
  const tol=axis==='x'?toleranceX:toleranceY;
  const m=ranges(moving,axis);
  // Bound pair-search cost for dense repeats while keeping closest neighbors.
  const targets=visibleBetween(moving,targetRects||[],axis)
   .sort((a,b)=>Math.abs((ranges(a,axis).start+ranges(a,axis).end)/2-(m.start+m.end)/2)-
                Math.abs((ranges(b,axis).start+ranges(b,axis).end)/2-(m.start+m.end)/2))
   .slice(0,40).map(t=>({source:t,...ranges(t,axis)}))
   .sort((a,b)=>a.start-b.start);
  const candidates=[];
  const offer=(delta,value,guideA,guideB)=>{
   if(!Number.isFinite(delta)||Math.abs(delta)>tol||value<.5||value>1e5)return;
   candidates.push({delta,value,lines:[guideA,guideB]});
  };
  for(const left of targets){
   if(left.end>m.start+tol)continue;
   for(const right of targets){
    if(right.start<m.end-tol||left.source===right.source||right.start<=left.end)continue;
    const gap=(right.start-left.end-(m.end-m.start))/2;
    const targetStart=left.end+gap;
    offer(targetStart-m.start,gap,
     {from:left.end,to:targetStart,other:left.source},
     {from:targetStart+(m.end-m.start),to:right.start,other:right.source});
   }
  }
  // If A and B establish an existing gap, offer the same spacing before
  // A or after B. Supports visual distribution of a third object.
  for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){
   const a=targets[i],b=targets[j],gap=b.start-a.end;
   if(gap<.5||!crossOverlap(a,b))continue;
   const after=b.end+gap;
   {
    const delta=after-m.start;
    offer(delta,gap,
     {from:a.end,to:b.start,other:a.source},
     {from:b.end,to:after,other:b.source});
   }
   const before=a.start-gap-(m.end-m.start);
   {
    const delta=before-m.start;
    offer(delta,gap,
     {from:before+(m.end-m.start),to:a.start,other:a.source},
     {from:a.end,to:b.start,other:b.source});
   }
  }
  candidates.sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta)||a.value-b.value);
  const winner=candidates[0];
  if(!winner)continue;
  result[axis==='x'?'dx':'dy']=winner.delta;
  const shifted=axis==='x'?{...moving,x:moving.x+winner.delta}:
   {...moving,y:moving.y+winner.delta};
  for(const line of winner.lines){
   const cross=ranges(shifted,axis),other=ranges(line.other,axis);
   const overlapStart=Math.max(cross.cross,other.cross);
   const overlapEnd=Math.min(cross.crossEnd,other.crossEnd);
   const position=overlapStart<=overlapEnd?(overlapStart+overlapEnd)/2:
    (cross.cross+cross.crossEnd)/2;
   result.segments.push({axis,start:line.from,end:line.to,cross:position,
    value:winner.value});
  }
 }
 return result;
}
