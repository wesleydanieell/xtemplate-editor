/** Preserve native XNotes text styling while scaling its visual footprint.
 * XNotes text has no explicit width or height attribute: resizing changes
 * the font's `size` and repositions its anchor to the target visual frame.
 * Works with start/middle/end text alignment, all baselines and quarter turns.
 */
export function resizeTextToFrame({frame,target,anchor,fontSize,axis='w'}){
 if(!frame||!target||!anchor||!Number.isFinite(fontSize)||fontSize<=0)return null;
 const oldSpan=axis==='h'?frame.h:frame.w;
 const newSpan=axis==='h'?target.h:target.w;
 if(!(oldSpan>0&&newSpan>0))return null;
 const scale=Math.max(.02,Math.min(100,newSpan/oldSpan));
 const size=Math.max(.2,Math.min(1000,fontSize*scale));
 const actualScale=size/fontSize;
 // Glyph offsets from their authored anchor scale linearly with font size.
 const x=target.x-(frame.x-anchor.x)*actualScale;
 const y=target.y-(frame.y-anchor.y)*actualScale;
 return {size,x,y,scale:actualScale};
}

export function textResizeAxis(handle,frame,target){
 const horizontal=/[we]/.test(handle),vertical=/[ns]/.test(handle);
 if(horizontal&&vertical){
  const sw=target.w/frame.w,sh=target.h/frame.h;
  return Math.abs(sw-1)>=Math.abs(sh-1)?'w':'h';
 }
 return horizontal?'w':'h';
}
