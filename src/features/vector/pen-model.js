/** XNotes-native Pen authoring; no SVG transform or unsupported metadata. */
const mm=x=>`${Number(x.toFixed(3))}mm`;
const r=x=>Number(x.toFixed(3));
export const PEN_MODES=Object.freeze(['line','polyline','polygon','path']);
export function penPointCount(mode){return mode==='polygon'?3:2;}
export function snapPenAngle(origin,p,step=45){
 const dx=p.x-origin.x,dy=p.y-origin.y,distance=Math.hypot(dx,dy);
 if(distance<1e-8)return {...p};
 const angle=Math.round(Math.atan2(dy,dx)/(step*Math.PI/180))*step*Math.PI/180;
 return {x:origin.x+distance*Math.cos(angle),y:origin.y+distance*Math.sin(angle)};
}
/** Every anchor owns independent incoming and outgoing tangent vectors.
 * The old symmetric `hx/hy` form is understood for backward-compatible drafts. */
export function penIncoming(p){return {x:p.inHx??-(p.hx||0),y:p.inHy??-(p.hy||0)};}
export function penOutgoing(p){return {x:p.outHx??(p.hx||0),y:p.outHy??(p.hy||0)};}
export function resetOutgoingTangent(points,index=points.length-1){
 const updated=points.map(p=>({...p}));
 if(!updated[index])throw new RangeError('Unknown Pen anchor');
 const p=updated[index];
 // Materialize the incoming tangent first to preserve the preceding cubic.
 const incoming=penIncoming(p);p.inHx=incoming.x;p.inHy=incoming.y;
 p.outHx=0;p.outHy=0;
 return updated;
}
/** Shared live-preview/export SVG path command generation. */
export function penPathData(points,closed=false,offsetX=0,offsetY=0){
 if(!points.length)return '';
 let d=`M ${r(points[0].x-offsetX)} ${r(points[0].y-offsetY)}`;
 const cubic=(a,b)=>{
  const out=penOutgoing(a),incoming=penIncoming(b);
  return ` C ${r(a.x+out.x-offsetX)} ${r(a.y+out.y-offsetY)} ${r(b.x+incoming.x-offsetX)} ${r(b.y+incoming.y-offsetY)} ${r(b.x-offsetX)} ${r(b.y-offsetY)}`;
 };
 for(let i=1;i<points.length;i++)d+=cubic(points[i-1],points[i]);
 if(closed&&points.length>2)d+=cubic(points.at(-1),points[0])+' Z';
 return d;
}
export function createPenNode(mode,points,parentBox={x:0,y:0},closed=false){
 if(!PEN_MODES.includes(mode))throw new Error('Unsupported Pen type');
 if(points.length<penPointCount(mode))throw new Error(`At least ${penPointCount(mode)} points required`);
 const local=points.map(p=>({...p,x:p.x-parentBox.x,y:p.y-parentBox.y}));
 if(mode==='line')return {type:'line',x1:mm(local[0].x),y1:mm(local[0].y),x2:mm(local[1].x),y2:mm(local[1].y),stroke:'ink',strokeWidth:'0.3mm'};
 if(mode==='polygon'||mode==='polyline')return {type:mode,points:local.map(p=>[mm(p.x),mm(p.y)]),stroke:'ink',fill:'none',strokeWidth:'0.3mm'};
 const coords=[];for(const p of local){const a=penIncoming(p),b=penOutgoing(p);coords.push(p.x,p.y,p.x+a.x,p.y+a.y,p.x+b.x,p.y+b.y);}
 const xx=coords.filter((_,i)=>i%2===0),yy=coords.filter((_,i)=>i%2===1);
 const x=Math.min(...xx),y=Math.min(...yy),w=Math.max(1,Math.max(...xx)-x),h=Math.max(1,Math.max(...yy)-y);
 const d=penPathData(local,closed,x,y);
 return {type:'path',x:mm(x),y:mm(y),w:mm(w),h:mm(h),viewBox:[0,0,w,h],d,stroke:'ink',fill:'none',strokeWidth:'0.5mm'};
}
