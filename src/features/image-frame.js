/** Pixel-aware bounds for native image elements.
 * `contain` may letterbox the authored viewport: its visible pixels occupy
 * only this smaller rectangle. The editor controls must follow the pixels,
 * not invisible padding. `cover` and `stretch` fill the full viewport. */
export function imageDisplayBounds(frame, dimensions, fit='contain', position='center') {
  if(fit!=='contain'||!dimensions?.width||!dimensions?.height||frame.w<=0||frame.h<=0)return {...frame};
  const scale=Math.min(frame.w/dimensions.width,frame.h/dimensions.height);
  const w=dimensions.width*scale,h=dimensions.height*scale;
  const key=String(position).toLowerCase();
  const horizontal=key.includes('left')?0:key.includes('right')?1:.5;
  const vertical=key.includes('top')?0:key.includes('bottom')?1:.5;
  return {x:frame.x+(frame.w-w)*horizontal,y:frame.y+(frame.h-h)*vertical,w,h};
}

/** In freeform image resize, the user's handle moves one edge, not the hidden
 * crop/letterbox viewport. Shift-corner resizing explicitly keeps proportions.
 * Native `fit: stretch` is the only fit mode that follows independent X/Y
 * dimensions; switching on freeform resize is intentional and undoable. */
export function imageResizeFit(fit,handle,shiftKey=false,cropMode=false){
  if(cropMode)return 'cover'; // Resize the viewport; let the image crop within it.
  const isCorner=/[ew]/.test(handle)&&/[ns]/.test(handle);
  return isCorner&&shiftKey?(fit||'contain'):'stretch';
}
