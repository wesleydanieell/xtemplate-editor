/** Non-destructive native XNotes geometry mirroring. Never export an SVG transform. */
import { readPointPairs, requiresBake } from './points.js';
import { editablePathNodes, svgPathGeometryBounds } from './svg-path.js';

export const FLIPPABLE_TYPES=Object.freeze(['line','polyline','polygon','path']);
const number=value=>Number(Number(value).toFixed(9));
const mm=value=>`${number(value)}mm`;
const coordinate=(value,axis,context,evaluate)=>{
 const n=evaluate(value,axis,context);
 if(!Number.isFinite(n))throw new Error('Cannot evaluate coordinate to a finite number');
 return n;
};
const axisIndex=axis=>{
 if(axis!=='horizontal'&&axis!=='vertical')throw new Error('Flip axis must be horizontal or vertical');
 return axis==='horizontal'?0:1;
};

/** Return a new object; never mutate the current template node on validation failure. */
export function flipNativeNode(node,axis,{context={},evaluate=()=>NaN,allowExpressionBake=false}={}) {
 const dimension=axisIndex(axis),key=dimension===0?'x':'y';
 if(!FLIPPABLE_TYPES.includes(node?.type))throw new Error('This XNotes element has no native visual mirror operation');
 const copy=structuredClone(node);
 let bakedExpressions=false;
 if(node.type==='path'){
  if(typeof node.d!=='string')throw new Error('Missing native SVG path d');
  const parsed=editablePathNodes(node.d);
  const bounds=svgPathGeometryBounds(parsed);
  const lo=bounds[key],hi=lo+(dimension===0?bounds.w:bounds.h);
  // Work from original character ranges: unaffected SVG commands and the other
  // axis survive byte-for-byte (critical for a faithful .xtemplate roundtrip).
  const edits=parsed.nodes.map(p=>({token:dimension===0?p.xToken:p.yToken, value:number(lo+hi-p[key])}));
  for(const {token,value} of edits.sort((a,b)=>b.token.start-a.token.start)){
   copy.d=copy.d.slice(0,token.start)+String(value)+copy.d.slice(token.end);
  }
  return {node:copy,bakedExpressions:false};
 }
 if(node.type==='line'){
  const a=dimension===0?'x1':'y1',b=dimension===0?'x2':'y2';
  const coordAxis=dimension===0?'x':'y';
  const first=node[a]??0,last=node[b]??0;
  const x=coordinate(first,coordAxis,context,evaluate),y=coordinate(last,coordAxis,context,evaluate);
  const needsBake=requiresBake(first)||requiresBake(last);
  if(needsBake&&!allowExpressionBake)throw new Error('Expression coordinates require confirmation before mirroring');
  copy[a]=mm(x+y-x);copy[b]=mm(x+y-y);
  bakedExpressions=needsBake;
 }else{
  const points=readPointPairs(node.points),coordAxis=dimension===0?'x':'y';
  const coords=points.map(pair=>coordinate(pair[dimension],coordAxis,context,evaluate));
  const lo=Math.min(...coords),hi=Math.max(...coords);
  const needsBake=points.some(pair=>requiresBake(pair[dimension]));
  if(needsBake&&!allowExpressionBake)throw new Error('Expression coordinates require confirmation before mirroring');
  copy.points=points.map((pair,i)=>{
   const next=pair.slice();next[dimension]=mm(lo+hi-coords[i]);return next;
  });
  bakedExpressions=needsBake;
 }
 return {node:copy,bakedExpressions};
}

export function flipNeedsExpressionConfirmation(node,axis) {
 const dimension=axisIndex(axis);
 if(!node||!FLIPPABLE_TYPES.includes(node.type))return false;
 if(node.type==='path')return false;
 if(node.type==='line')return (dimension===0?['x1','x2']:['y1','y2']).some(k=>requiresBake(node[k]??0));
 return readPointPairs(node.points).some(pair=>requiresBake(pair[dimension]));
}
