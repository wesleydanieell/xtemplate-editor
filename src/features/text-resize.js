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

/** Inspector W/H edits are font-size controls, not canvas-edge drags.
 * Scale from the captured painted extent and keep the authored text anchor
 * unchanged: moving x/y merely to preserve the glyph's upper-left rectangle
 * would make the baseline visibly jump when changing Height. */
export function resizeTextFontAtAnchor({frame,target,fontSize,axis='w'}){
 if(!frame||!Number.isFinite(fontSize)||fontSize<=0||!Number.isFinite(target))return null;
 const extent=axis==='h'?frame.h:frame.w;
 if(!(extent>0))return null;
 const ratio=Math.max(.02,Math.min(100,Math.max(.2,target)/extent));
 return Math.max(.2,Math.min(1000,fontSize*ratio));
}

export function textResizeAxis(handle,frame,target){
 const horizontal=/[we]/.test(handle),vertical=/[ns]/.test(handle);
 if(horizontal&&vertical){
  const sw=target.w/frame.w,sh=target.h/frame.h;
  return Math.abs(sw-1)>=Math.abs(sh-1)?'w':'h';
 }
 return horizontal?'w':'h';
}
