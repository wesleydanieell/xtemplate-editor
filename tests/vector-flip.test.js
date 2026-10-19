import test from 'node:test';
import assert from 'node:assert/strict';
import {flipNativeNode,flipNeedsExpressionConfirmation} from '../src/features/vector/flip-geometry.js';
import {editablePathNodes,svgPathGeometryBounds} from '../src/features/vector/svg-path.js';
import {evalExpr} from '../src/core/expressions.js';
const context={x:18,y:27,w:160,h:180,vars:{W:160,H:180}};
const evaluate=(value,axis,ctx)=>evalExpr(value,ctx,axis,NaN);
const mirror=(node,axis,extra={})=>flipNativeNode(node,axis,{context,evaluate,...extra}).node;
test('horizontal and vertical mirroring line changes only the targeted axis',()=>{
 const line={type:'line',x1:'10mm',y1:'11mm',x2:'70mm',y2:'90mm',stroke:'ink'};
 assert.deepEqual(mirror(line,'horizontal'),{...line,x1:'70mm',x2:'10mm'});
 assert.deepEqual(mirror(line,'vertical'),{...line,y1:'90mm',y2:'11mm'});
 assert.deepEqual(mirror(mirror(line,'horizontal'),'horizontal'),line);
 assert.deepEqual(line,{type:'line',x1:'10mm',y1:'11mm',x2:'70mm',y2:'90mm',stroke:'ink'});
});
test('polygon mirror uses visual coordinate extents; unaffected coordinates and style stay intact',()=>{
 const shape={type:'polygon',points:[['10mm','0mm'],['40mm','8mm'],['20mm','70mm']],fill:'#abc',strokeWidth:'0.2mm'};
 assert.deepEqual(mirror(shape,'horizontal').points,[['40mm','0mm'],['10mm','8mm'],['30mm','70mm']]);
 assert.deepEqual(mirror(shape,'vertical').points,[['10mm','70mm'],['40mm','62mm'],['20mm','0mm']]);
 assert.deepEqual(mirror(mirror(shape,'vertical'),'vertical').points,shape.points);
 assert.equal(mirror(shape,'horizontal').fill,'#abc');
});
test('expressions must be approved only when the flipped axis requires baking',()=>{
 const shape={type:'polyline',points:[['W/2','4mm'],['W - 12mm','10mm']],stroke:'ink'};
 assert.equal(flipNeedsExpressionConfirmation(shape,'horizontal'),true);
 assert.equal(flipNeedsExpressionConfirmation(shape,'vertical'),false);
 assert.throws(()=>mirror(shape,'horizontal'),/confirmation/);
 const flipped=mirror(shape,'horizontal',{allowExpressionBake:true});
 assert.deepEqual(flipped.points,[['148mm','4mm'],['80mm','10mm']]);
 assert.deepEqual(mirror(shape,'vertical').points,[['W/2','10mm'],['W - 12mm','4mm']]);
 assert.deepEqual(shape.points,[['W/2','4mm'],['W - 12mm','10mm']]);
});
test('SVG cubic path mirrors anchors AND incoming/outgoing control points, without touching other tokens',()=>{
 const path={type:'path',x:'12mm',y:'18mm',w:'50mm',h:'35mm',viewBox:[0,0,80,70],stroke:'#349',d:'M 10,10 C 30 0, 60 20, 70 45 Q 75 65 80 70 Z'};
 const horizontal=mirror(path,'horizontal');
 assert.equal(horizontal.d,'M 80,10 C 60 0, 30 20, 20 45 Q 15 65 10 70 Z');
 assert.deepEqual(horizontal.viewBox,path.viewBox);
 assert.equal(horizontal.x,path.x);
 const vertical=mirror(path,'vertical');
 const firstBounds=svgPathGeometryBounds(editablePathNodes(path.d));
 const flippedBounds=svgPathGeometryBounds(editablePathNodes(vertical.d));
 assert(Math.abs(firstBounds.y-flippedBounds.y)<1e-7,'vertical mirror preserves visual top');
 assert(Math.abs(firstBounds.h-flippedBounds.h)<1e-7,'vertical mirror preserves actual curve height');
 assert.deepEqual(vertical.viewBox,path.viewBox);
 assert.deepEqual(mirror(horizontal,'horizontal').d,path.d);
 assert.equal(editablePathNodes(horizontal.d).segments.filter(x=>x.command==='C').length,1);
 assert.deepEqual(path.d,'M 10,10 C 30 0, 60 20, 70 45 Q 75 65 80 70 Z');
});
test('unsupported SVG syntax and non-flippable nodes are rejected unchanged',()=>{
 assert.throws(()=>mirror({type:'path',d:'m 10 20 c 1 2 3 4 5 6'},'horizontal'),/Unsupported|explicit/);
 assert.throws(()=>mirror({type:'group',children:[]},'vertical'),/no native/);
 assert.throws(()=>mirror({type:'text',text:'A'},'horizontal'),/no native/);
 assert.throws(()=>mirror({type:'line'},'diagonal'),/Flip axis/);
});

test('SVG mirror stays in place even when cubic controls extend beyond painted curve',()=>{
 const original={type:'path',d:'M 0 0 C 0 100 100 100 100 0',viewBox:[0,0,100,100]};
 const before=svgPathGeometryBounds(editablePathNodes(original.d));
 assert.deepEqual(before,{x:0,y:0,w:100,h:75});
 const flipped=mirror(original,'vertical');
 assert.equal(flipped.d,'M 0 75 C 0 -25 100 -25 100 75');
 const after=svgPathGeometryBounds(editablePathNodes(flipped.d));
 assert.deepEqual(after,before);
 assert.equal(mirror(flipped,'vertical').d,original.d);
});

test('quadratic mirrors about actual curve extrema, not off-curve handles',()=>{
 const native={type:'path',d:'M 0 0 Q 50 100 100 0'};
 const original=svgPathGeometryBounds(editablePathNodes(native.d));
 assert.deepEqual(original,{x:0,y:0,w:100,h:50});
 const mirrorY=mirror(native,'vertical');
 assert.equal(mirrorY.d,'M 0 50 Q 50 -50 100 50');
 assert.deepEqual(svgPathGeometryBounds(editablePathNodes(mirrorY.d)),original);
});
