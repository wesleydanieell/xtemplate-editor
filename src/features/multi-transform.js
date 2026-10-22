import {proportionalResizeBounds} from './constrained-resize.js';
/** Affine multi-selection geometry: one selection frame, independent native nodes.
 * No nonportable 'transform' key is ever added to .xtemplate nodes. */
export function selectionFrame(items){
 const bounds=items.map(item=>item.bounds).filter(b=>b&&[b.x,b.y,b.w,b.h].every(Number.isFinite));
 if(!bounds.length)return null;
 const x=Math.min(...bounds.map(b=>b.x)),y=Math.min(...bounds.map(b=>b.y));
 const right=Math.max(...bounds.map(b=>b.x+b.w)),bottom=Math.max(...bounds.map(b=>b.y+b.h));
 return {x,y,w:right-x,h:bottom-y};
}
export function remapSelectedPoint(x,y,from,to){
 if(!from||!to||from.w<=0||from.h<=0)throw Error('Invalid selection frame');
 return {x:to.x+(x-from.x)*(to.w/from.w),
  y:to.y+(y-from.y)*(to.h/from.h)};
}
export function remapSelectedBounds(bounds,from,to){
 const origin=remapSelectedPoint(bounds.x,bounds.y,from,to);
 return {...origin,w:bounds.w*to.w/from.w,h:bounds.h*to.h/from.h};
}
/** Apply one edge delta to each independent shape. Never use the combined
 * selection frame as a scale origin: that would move the gaps as well. */
export function resizeEachBounds(bounds,handle,dx,dy,shiftKey=false){
 return bounds.map(frame=>proportionalResizeBounds(frame,handle,dx,dy,shiftKey));
}
