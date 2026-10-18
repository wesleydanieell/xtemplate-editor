/** Visible SVG geometry in document coordinates; excludes editor handles.
 * Receives DOM dependencies explicitly to keep rendering and snapping decoupled. */
import { multiply, inverse, fromDOM, transformBounds } from './affine-transform.js';
export function paintedBounds(element,paper,documentRoot=document){
 try{
  // A clipped hatch draws long strokes outside its visible region. SVG
  // getBBox ignores clipping, so prefer the local clipping rectangle.
  const clipId=element.getAttribute('clip-path')?.match(/^url\(#([\w-]+)\)$/)?.[1];
  const visibleClip=clipId?documentRoot.getElementById(clipId)?.querySelector('rect'):null;
  // Transparent hitboxes and selection handles improve pointer interaction,
  // but must not expand an alignment target beyond its painted geometry.
  const visibleChildren=[...element.children].filter(child=>
   typeof child.getBBox==='function' && child.tagName.toLowerCase()!=='defs' &&
   !['svg-hitbox','svg-selection','transform-handle','rotation-stem','smart-guide','smart-guide-point'].some(name=>child.classList.contains(name)));
  const source=visibleClip?element:(visibleChildren.length===1?visibleChildren[0]:element);
  const bounds=visibleClip?visibleClip.getBBox():source.getBBox(),screen=source.getScreenCTM(),pageMatrix=paper.getScreenCTM();
  if(!screen||!pageMatrix)return null;
  const matrix=multiply(inverse(fromDOM(pageMatrix)),fromDOM(screen));
  const result=transformBounds(matrix,{x:bounds.x,y:bounds.y,w:bounds.width,h:bounds.height});
  return Object.values(result).every(Number.isFinite)?result:null;
 }catch{return null;}
}
