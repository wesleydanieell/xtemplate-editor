function nearestShift(edges, targets, tolerance) {
  let best = null;
  for (const edge of edges) {
    for (const target of targets) {
      const shift = target - edge;
      if (Math.abs(shift) > tolerance) continue;
      if (best === null || Math.abs(shift) < Math.abs(best.shift)) {
        best = { shift, guide: target };
      }
    }
  }
  return best;
}

/**
 * Snap the nearest of an object's start, centre, or end edges to guide targets.
 * Tolerances are expressed in document units by the caller, ideally derived from CSS pixels.
 */
export function calculateSnap(bounds, targetsX, targetsY, toleranceX, toleranceY = toleranceX) {
  const x = nearestShift([bounds.x, bounds.x + bounds.w / 2, bounds.x + bounds.w], targetsX, toleranceX);
  const y = nearestShift([bounds.y, bounds.y + bounds.h / 2, bounds.y + bounds.h], targetsY, toleranceY);
  return {
    dx: x?.shift ?? 0,
    dy: y?.shift ?? 0,
    guides: { x: x?.guide ?? null, y: y?.guide ?? null },
  };
}

/**
 * Snapping to other visible objects. Target descriptors carry their actual
 * geometric span, letting the UI show a short alignment guide between objects
 * rather than an unexplained full-page line.
 * Page targets use `kind: "page"` and keep a full-page guide.
 */
export function calculateObjectSnap(bounds, targetRects, page, toleranceX, toleranceY = toleranceX) {
  const coordinate = (rect, axis) => axis === "x"
    ? [rect.x, rect.x + rect.w / 2, rect.x + rect.w]
    : [rect.y, rect.y + rect.h / 2, rect.y + rect.h];
  const guides = { x: null, y: null }, segments = { x: null, y: null };
  let dx = 0, dy = 0;
  for (const axis of ["x", "y"]) {
    const candidates = [...(targetRects || []), { x: 0, y: 0, w: page.w, h: page.h, kind: "page" }];
    const edges = coordinate(bounds, axis);
    const threshold = axis === "x" ? toleranceX : toleranceY;
    let nearest = null;
    for (const target of candidates) {
      if (![target.x, target.y, target.w, target.h].every(Number.isFinite)) continue;
      for (const reference of coordinate(target, axis)) {
        for (const moving of edges) {
          const shift = reference - moving;
          if (Math.abs(shift) > threshold) continue;
          const priority = target.kind === "page" ? 1 : 0;
          // Prefer the closest match, and an object match when two are equally near.
          if (!nearest || Math.abs(shift) < Math.abs(nearest.shift) - 1e-8 ||
            (Math.abs(Math.abs(shift) - Math.abs(nearest.shift)) < 1e-8 && priority < nearest.priority)) {
            nearest = { shift, reference, target, priority };
          }
        }
      }
    }
    if (!nearest) continue;
    const { shift, reference, target } = nearest;
    guides[axis] = reference;
    if (axis === "x") {
      dx = shift;
      segments.x = target.kind === "page"
        ? { x: reference, y1: 0, y2: page.h, kind: "page" }
        : { x: reference, y1: Math.max(0, Math.min(bounds.y, target.y)), y2: Math.min(page.h, Math.max(bounds.y + bounds.h, target.y + target.h)), kind: "object" };
    } else {
      dy = shift;
      segments.y = target.kind === "page"
        ? { y: reference, x1: 0, x2: page.w, kind: "page" }
        : { y: reference, x1: Math.max(0, Math.min(bounds.x, target.x)), x2: Math.min(page.w, Math.max(bounds.x + bounds.w, target.x + target.w)), kind: "object" };
    }
  }
  return { dx, dy, guides, segments };
}

/** Snap only the edge(s) controlled by a resize handle, never its anchored edge. */
export function calculateResizeSnap(bounds, handle, targetRects, page, toleranceX, toleranceY=toleranceX) {
  const candidates=[...(targetRects||[]),{x:0,y:0,w:page.w,h:page.h,kind:'page'}];
  const result={...bounds},guides={x:null,y:null},segments={x:null,y:null};
  for(const axis of ['x','y']){
    const start=axis==='x'? 'w':'n',end=axis==='x'?'e':'s';
    const edge=handle.includes(start)?'start':handle.includes(end)?'end':null;
    if(!edge)continue;
    const origin=axis==='x'?bounds.x:bounds.y;
    const size=axis==='x'?bounds.w:bounds.h;
    const position=origin+(edge==='end'?size:0);
    const tolerance=axis==='x'?toleranceX:toleranceY;
    let best=null;
    for(const target of candidates){
      if(![target.x,target.y,target.w,target.h].every(Number.isFinite))continue;
      const t=axis==='x'?target.x:target.y,s=axis==='x'?target.w:target.h;
      for(const coord of [t,t+s/2,t+s]){
        const delta=coord-position,priority=target.kind==='page'?1:0;
        if(Math.abs(delta)>tolerance)continue;
        if(!best||Math.abs(delta)<Math.abs(best.delta)-1e-8||Math.abs(Math.abs(delta)-Math.abs(best.delta))<1e-8&&priority<best.priority)
          best={delta,coord,target,priority};
      }
    }
    if(!best)continue;
    const far=origin+(edge==='start'?size:0),newPos=position+best.delta;
    if(Math.abs(far-newPos)<1)continue;
    const shift=best.delta;
    if(axis==='x'){
      if(edge==='start'){result.x+=shift;result.w-=shift;}else result.w+=shift;
      guides.x=best.coord;
      segments.x=best.target.kind==='page'?{x:best.coord,y1:0,y2:page.h,kind:'page'}:
        {x:best.coord,y1:Math.max(0,Math.min(bounds.y,best.target.y)),y2:Math.min(page.h,Math.max(bounds.y+bounds.h,best.target.y+best.target.h)),kind:'object'};
    }else{
      if(edge==='start'){result.y+=shift;result.h-=shift;}else result.h+=shift;
      guides.y=best.coord;
      segments.y=best.target.kind==='page'?{y:best.coord,x1:0,x2:page.w,kind:'page'}:
        {y:best.coord,x1:Math.max(0,Math.min(bounds.x,best.target.x)),x2:Math.min(page.w,Math.max(bounds.x+bounds.w,best.target.x+best.target.w)),kind:'object'};
    }
  }
  return {bounds:result,guides,segments};
}
