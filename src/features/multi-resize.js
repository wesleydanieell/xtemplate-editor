/** Predictable multi-object resizing, independent of SVG rendering/selection state.
 *
 * All shapes preserve their own original proportions on side and corner
 * drags, including rectangles. The separate K/Scale Selection mode changes
 * spacing as well; this default mode only adjusts selected shapes themselves.
 *
 * Every item is derived from the immutable pointerdown snapshot; no repeated
 * transforms or accumulated floating-point scaling of .xtemplate properties.
 */

const finiteBounds=b=>b&&[b.x,b.y,b.w,b.h].every(Number.isFinite)&&b.w>0&&b.h>0;
const itemKey=item=>Array.isArray(item.path)?item.path.join('.'):String(item.key);
const hasX=handle=>handle.includes('e')||handle.includes('w');
const hasY=handle=>handle.includes('n')||handle.includes('s');
const edgeDirectionX=handle=>handle.includes('w')?-1:1;
const edgeDirectionY=handle=>handle.includes('n')?-1:1;

/** Uniform resize anchored to the opposite edge or corner. */
export function scaleBoundsAtHandle(bounds,handle,scale){
 if(!finiteBounds(bounds)||!Number.isFinite(scale)||scale<=0)throw Error('Invalid bounds/scale');
 const w=bounds.w*scale,h=bounds.h*scale;
 const x=handle.includes('w')?bounds.x+bounds.w-w:
  !hasX(handle)?bounds.x+(bounds.w-w)/2:bounds.x;
 const y=handle.includes('n')?bounds.y+bounds.h-h:
  !hasY(handle)?bounds.y+(bounds.h-h)/2:bounds.y;
 return {x,y,w,h};
}
/** The driver element's handle remains on the cursor axis when dragging
 * vertically or horizontally. For corners, project the cursor onto the shape's
 * original diagonal: the nearest reachable position preserving the ratio.
 */
export function uniformScaleFromDrag(driver,handle,dx,dy){
 if(!finiteBounds(driver))throw Error('Invalid driver geometry');
 const x=hasX(handle),y=hasY(handle);
 if(!x&&!y)throw Error('Unknown resize handle');
 if(x&&y){
  const vx=driver.w*edgeDirectionX(handle);
  const vy=driver.h*edgeDirectionY(handle);
  return Math.max(.04,1+(dx*vx+dy*vy)/(vx*vx+vy*vy));
 }
 if(y)return Math.max(.04,1+dy*edgeDirectionY(handle)/driver.h);
 return Math.max(.04,1+dx*edgeDirectionX(handle)/driver.w);
}
/** Compute all independently authored new frames from a *single* snapshot.
 * Returns a map keyed by node key. Unmarked layers retain their original
 * frames, available for optional Smart Selection reflow.
 */
export function planIndependentResize(items,{
 handle,dx=0,dy=0,anchorKey=null,activeKeys=null,stretch=false
}={}){
 if(!Array.isArray(items)||!items.length||items.some(item=>!finiteBounds(item.bounds)))
  throw Error('Invalid multi-resize selection');
 if(!Number.isFinite(dx)||!Number.isFinite(dy))throw Error('Invalid pointer delta');
 const anchor=items.find(item=>itemKey(item)===anchorKey)||items[0];
 const driver=anchor.bounds;
 const keys=activeKeys||new Set(items.map(itemKey));
 const uniform=uniformScaleFromDrag(driver,handle,dx,dy);
 const mapped=new Map();
 for(const item of items){
  const key=itemKey(item),bounds=item.bounds;
  if(!keys.has(key)){mapped.set(key,{...bounds});continue;}
  // Holding Shift temporarily unlocks the aspect ratio and moves only the
  // grabbed axis (or both axes independently on a diagonal corner).
  if(stretch){
   mapped.set(key,stretchBoundsAtHandle(bounds,handle,dx,dy));
  }else mapped.set(key,scaleBoundsAtHandle(bounds,handle,uniform));
 }
 return mapped;
}
/** Stretch only the dragged edge(s), keeping the other dimensions fixed.
 * Unlike proportional Scale, side handles change exactly one axis.
 * Frame calculations share the same minimum sizes as native shape geometry.
 */
export function stretchBoundsAtHandle(bounds,handle,dx,dy){
 if(!finiteBounds(bounds))throw Error('Invalid resize frame');
 const w=Math.max(.05,bounds.w+(hasX(handle)?dx*edgeDirectionX(handle):0));
 const h=Math.max(.05,bounds.h+(hasY(handle)?dy*edgeDirectionY(handle):0));
 return {x:handle.includes('w')?bounds.x+bounds.w-w:bounds.x,
  y:handle.includes('n')?bounds.y+bounds.h-h:bounds.y,w,h};
}
