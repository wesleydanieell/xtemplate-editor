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

export function syncTextSelection(node,paper,{handles:showHandles=true}={}){
 const bounds=textPaintedBounds(node,paper);
 if(!bounds)return null;
 const {x,y,w,h}=bounds;
 for(const rect of node.querySelectorAll(':scope > rect.svg-hitbox,:scope > rect.svg-selection')){
  rect.setAttribute('x',String(x));rect.setAttribute('y',String(y));
  rect.setAttribute('width',String(Math.max(rect.classList.contains('svg-hitbox')?2:1,w)));
  rect.setAttribute('height',String(Math.max(rect.classList.contains('svg-hitbox')?2:1,h)));
 }
 if(!showHandles)return bounds;
 const handles={nw:[x,y],n:[x+w/2,y],ne:[x+w,y],e:[x+w,y+h/2],se:[x+w,y+h],s:[x+w/2,y+h],sw:[x,y+h],w:[x,y+h/2]};
 for(const rect of node.querySelectorAll(':scope > rect.transform-handle[data-handle]')){
  const center=handles[rect.dataset.handle];if(!center)continue;
  const half=Number(rect.getAttribute('width'))/2;
  rect.setAttribute('x',String(center[0]-half));rect.setAttribute('y',String(center[1]-half));
 }
 // Match the interaction area to screen pixels, independently of document
 // zoom. Visible squares stay small; invisible 16px targets make precision
 // transforms practical for stylus, mouse and mobile touch.
 const matrix=paper.getScreenCTM();
 const pxPerUnit=matrix?Math.max(.05,Math.hypot(matrix.a,matrix.b)):2;
 const hitSide=14/pxPerUnit;
 const pxWidth=w*pxPerUnit,pxHeight=h*pxPerUnit;
 const ns='http://www.w3.org/2000/svg';
 // A one-line text selection can be just 15px tall. Eight 16px invisible
 // hit areas would carpet the entire glyph and intercept double-click/drag.
 // Compact type shows only its four corner resize handles; taller objects
 // progressively expose side handles without blocking their content.
 const omitSide=pxHeight<32;
 if(omitSide)for(const side of ['n','s','e','w'])
  node.querySelector(`:scope > rect.transform-handle[data-handle="${side}"]`)?.remove();
 for(const [handle,[cx,cy]] of Object.entries(handles)){
  if(omitSide&&['n','s','e','w'].includes(handle))continue;
  const target=document.createElementNS(ns,'rect');
  target.setAttribute('class','transform-hit-area');
  target.setAttribute('data-handle',handle);
  target.setAttribute('x',String(cx-hitSide/2));target.setAttribute('y',String(cy-hitSide/2));
  target.setAttribute('width',String(hitSide));target.setAttribute('height',String(hitSide));
  target.setAttribute('fill','transparent');target.setAttribute('stroke','none');
  node.append(target);
 }
 const stem=node.querySelector(':scope > line.rotation-stem');
 if(stem){stem.setAttribute('x1',String(x+w/2));stem.setAttribute('y1',String(y));stem.setAttribute('x2',String(x+w/2));stem.setAttribute('y2',String(y-5));}
 const handle=node.querySelector(':scope > circle.rotate-handle');
 if(handle){handle.setAttribute('cx',String(x+w/2));handle.setAttribute('cy',String(y-5));
  const target=document.createElementNS(ns,'circle');
  target.setAttribute('class','transform-hit-area');target.setAttribute('data-handle','rotate');
  target.setAttribute('cx',String(x+w/2));target.setAttribute('cy',String(y-5));
  target.setAttribute('r',String(hitSide/2));target.setAttribute('fill','transparent');
  target.setAttribute('stroke','none');node.append(target);
 }
 return bounds;
}
