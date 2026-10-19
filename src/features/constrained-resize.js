import { resizedBounds } from './resize-preview.js';
import { calculateResizeSnap } from './snapping.js';

/** Keep the opposite corner fixed while a corner handle is constrained.
 * Shift is intentionally ignored on side handles: there is no unambiguous
 * opposite corner for an edge-only drag. */
export function proportionalResizeBounds(bounds, handle, dx, dy, constrain=false) {
  const raw=resizedBounds(bounds,handle,dx,dy);
  if(!constrain||!/[ew]/.test(handle)||!/[ns]/.test(handle)||bounds.w<=0||bounds.h<=0)return raw;
  const sx=raw.w/bounds.w,sy=raw.h/bounds.h;
  const scale=Math.abs(sx-1)>=Math.abs(sy-1)?sx:sy;
  const w=Math.max(1,bounds.w*scale),h=Math.max(1,bounds.h*scale);
  return{x:handle.includes('w')?bounds.x+bounds.w-w:bounds.x,
         y:handle.includes('n')?bounds.y+bounds.h-h:bounds.y,w,h};
}

/** Resize and magnetic guides use one set of bounds. Independent X/Y snaps
 * must not distort a Shift-constrained shape: select the closer snap axis,
 * derive the other dimension from its locked aspect ratio. */
export function resizeGestureBounds(bounds,handle,dx,dy,{
  shiftKey=false,magnetic=true,targets=[],page={w:210,h:297},toleranceX=3,toleranceY=toleranceX
}={}) {
  const proportional=shiftKey&&/[ew]/.test(handle)&&/[ns]/.test(handle)&&bounds.w>0&&bounds.h>0;
  const raw=proportionalResizeBounds(bounds,handle,dx,dy,proportional);
  const empty={bounds:raw,guides:{x:null,y:null},segments:{x:null,y:null}};
  if(!magnetic)return empty;
  const snap=calculateResizeSnap(raw,handle,targets,page,toleranceX,toleranceY);
  if(!proportional)return snap;
  const xError=Math.abs(snap.bounds.w-raw.w),yError=Math.abs(snap.bounds.h-raw.h);
  if(!snap.segments.x&&!snap.segments.y)return empty;
  // Compare distances in screen-pixel-equivalent tolerance units.
  const useX=!!snap.segments.x&&(!snap.segments.y||xError/Math.max(.001,toleranceX)<=yError/Math.max(.001,toleranceY));
  const scale=useX?snap.bounds.w/bounds.w:snap.bounds.h/bounds.h;
  const width=Math.max(1,bounds.w*scale),height=Math.max(1,bounds.h*scale);
  const updated={x:handle.includes('w')?bounds.x+bounds.w-width:bounds.x,
    y:handle.includes('n')?bounds.y+bounds.h-height:bounds.y,w:width,h:height};
  return{bounds:updated,
    guides:{x:useX?snap.guides.x:null,y:useX?null:snap.guides.y},
    segments:{x:useX?snap.segments.x:null,y:useX?null:snap.segments.y}};
}
