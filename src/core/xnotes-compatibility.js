/** Compatibility constraints observed in XNotes TemplateEval.kt (Oct 2026).
 * Its style.rotate is quantized to quarter-turns and applied to glyph contours;
 * it does not rotate geometry of non-text nodes or repeat blocks.
 * Do not silently treat SVG editor rotations as supported native template semantics.
 */
export function xnotesCompatibilityWarnings(template) {
  const warnings=[];
  function visit(nodes, path) {
    if(!Array.isArray(nodes)) return;
    nodes.forEach((node,index)=>{
      if(!node || typeof node!=='object') return;
      const nodePath=`${path}.${index}`;
      if(node.rotate!==undefined && node.type!=='text') {
        warnings.push({path:nodePath,code:'non-text-rotation',message:'XNotes ignores rotate for non-text template geometry.'});
      } else if(node.rotate!==undefined && node.type==='text') {
        const angle=Number(node.rotate);
        if(Number.isFinite(angle) && Math.abs(angle/90-Math.round(angle/90))>1e-8)
          warnings.push({path:nodePath,code:'text-rotation-quantized',message:'XNotes rounds text rotation to the nearest 90 degrees.'});
      }
      visit(node.children,`${nodePath}.children`);
    });
  }
  visit(template?.items,'items');
  return warnings;
}
