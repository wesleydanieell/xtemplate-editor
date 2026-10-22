/** Text's anchor (x/y) is not its painted rectangle. Glyphs extend above the
 * baseline, font metrics differ, and 90° rotations transform the whole glyph
 * outline. Measure only after the node is mounted in the SVG document.
 * The same bounds drive hit targets, selection outlines, rotation handles and
 * inspector coordinates; never estimate text width using character count. */
import {paintedBounds} from './painted-bounds.js';

export function textPaintedBounds(node,paper){
 if(!node||!paper)return null;
 const glyph=node.matches?.('text')?node:node.querySelector(':scope > text');
 if(!glyph)return null;
 let result=paintedBounds(glyph,paper);
 const local=glyph.getBBox();
 if(local.width===0&&local.height===0){
  const x=Number(glyph.getAttribute('x')),y=Number(glyph.getAttribute('y'));
  if(Number.isFinite(x)&&Number.isFinite(y)){
   const transform=paper.getScreenCTM()?.inverse().multiply(glyph.getScreenCTM());
   if(transform){const origin=new DOMPoint(x,y).matrixTransform(transform);result={x:origin.x,y:origin.y-1,w:1,h:1};}
  }
 }
 if(!result||![result.x,result.y,result.w,result.h].every(Number.isFinite))return null;
 // SVG fonts may temporarily return zero for an empty string. Preserve a
 // visible and selectable anchor rather than emitting degenerate rectangles.
 return {...result,w:Math.max(result.w,.5),h:Math.max(result.h,.5)};
}

export function syncTextSelection(node,paper){
 const bounds=textPaintedBounds(node,paper);
 if(!bounds)return null;
 const {x,y,w,h}=bounds;
 for(const rect of node.querySelectorAll(':scope > rect.svg-hitbox,:scope > rect.svg-selection')){
  rect.setAttribute('x',String(x));rect.setAttribute('y',String(y));
  rect.setAttribute('width',String(Math.max(rect.classList.contains('svg-hitbox')?2:1,w)));
  rect.setAttribute('height',String(Math.max(rect.classList.contains('svg-hitbox')?2:1,h)));
 }
 const stem=node.querySelector(':scope > line.rotation-stem');
 if(stem){stem.setAttribute('x1',String(x+w/2));stem.setAttribute('y1',String(y));stem.setAttribute('x2',String(x+w/2));stem.setAttribute('y2',String(y-5));}
 const handle=node.querySelector(':scope > circle.rotate-handle');
 if(handle){handle.setAttribute('cx',String(x+w/2));handle.setAttribute('cy',String(y-5));}
 return bounds;
}
