/** Temporary editor-only visuals inspired by Figma Smart Selection.
 * Draw interactive circles for marking layers and pink gap bars in page units.
 * The exported .xtemplate receives none of these controls. */
const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{
 const e=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
 return e;
};
export function renderSmartSelectionOverlay({items,smart,marked,pxPerUnit,gaps}){
 const layer=svg('g',{id:'smart-selection-overlay',role:'group','aria-label':'Smart selection'});
 const dot=Math.max(.95,4.2/pxPerUnit),hit=Math.max(3.5,12/pxPerUnit);
 for(const item of items){
  const key=item.path.join('.'),b=item.bounds;
  const cx=b.x+b.w/2,cy=b.y+b.h/2;
  // At low zoom the screen-pixel hit radius can exceed the entire object.
  // Cap it to the object's own dimensions so it cannot steal resize handles.
  const small=Math.min(b.w,b.h),visibleDot=Math.min(dot,small*.18);
  const hitDot=Math.min(hit,small*.28);
  const g=svg('g',{'data-smart-marker':key,'data-smart-marked':marked.has(key)?'true':'false',
   'aria-label':marked.has(key)?'Unmark layer for smart resize':'Mark layer for smart resize'});
  g.append(svg('circle',{class:'smart-marker-visual',cx,cy,r:visibleDot,'pointer-events':'none'}));
  g.append(svg('circle',{class:'smart-marker-hit',cx,cy,r:hitDot,fill:'transparent',
   stroke:'none','pointer-events':'all'}));
  layer.append(g);
 }
 for(const gap of gaps){
  if(gap.distance<1.2)continue;
  const horizontal=gap.axis==='x',size=Math.min(6/pxPerUnit,gap.distance*.32);
  const group=svg('g',{'data-smart-gap':gap.index,
   'aria-label':horizontal?'Adjust equal horizontal spacing':'Adjust equal vertical spacing'});
  group.append(svg('line',{class:'smart-selection-gap-connector',
   x1:horizontal?gap.from:gap.cross,y1:horizontal?gap.cross:gap.from,
   x2:horizontal?gap.to:gap.cross,y2:horizontal?gap.cross:gap.to,
   'pointer-events':'none'}));
  group.append(svg('line',{class:'smart-selection-gap-bar',
   x1:horizontal?gap.position:gap.cross-size,y1:horizontal?gap.cross-size:gap.position,
   x2:horizontal?gap.position:gap.cross+size,y2:horizontal?gap.cross+size:gap.position,
   'pointer-events':'none'}));
  const gapHit=Math.min(hit,gap.distance*.56);
  group.append(svg('rect',{class:'smart-selection-gap-hit',
   x:horizontal?gap.position-gapHit/2:gap.cross-gapHit/2,
   y:horizontal?gap.cross-gapHit/2:gap.position-gapHit/2,
   width:gapHit,height:gapHit,fill:'transparent',stroke:'none','pointer-events':'all'}));
  layer.append(group);
 }
 return layer;
}
export function renderScaleSelectionOverlay(bounds,pxPerUnit){
 const {x,y,w,h}=bounds;
 const layer=svg('g',{id:'multi-scale-controls',role:'group','aria-label':'Scale selected layers'});
 const rect=svg('rect',{class:'multi-scale-outline',x,y,width:w,height:h,'pointer-events':'none'});
 layer.append(rect);
 const positions={nw:[x,y],n:[x+w/2,y],ne:[x+w,y],e:[x+w,y+h/2],
  se:[x+w,y+h],s:[x+w/2,y+h],sw:[x,y+h],w:[x,y+h/2]};
 const point=Math.max(1.1,6/pxPerUnit),hit=Math.max(3.5,13/pxPerUnit);
 for(const [name,[cx,cy]] of Object.entries(positions)){
  layer.append(svg('rect',{class:'multi-scale-knob',x:cx-point/2,y:cy-point/2,
   width:point,height:point,rx:.2,'pointer-events':'none'}));
  layer.append(svg('rect',{class:'multi-scale-hit','data-scale-handle':name,
   x:cx-hit/2,y:cy-hit/2,width:hit,height:hit,fill:'transparent',
   stroke:'none','pointer-events':'all'}));
 }
 return layer;
}
