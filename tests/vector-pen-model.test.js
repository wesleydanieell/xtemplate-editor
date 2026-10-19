import test from 'node:test';import assert from 'node:assert/strict';
import {PEN_MODES,createPenNode,penPointCount,snapPenAngle,resetOutgoingTangent,penPathData,uniqueClosingAnchors,snapPenOrthogonal} from '../src/features/vector/pen-model.js';
test('pen modes produce XNotes-native nodes and parent-relative mm coordinates',()=>{
 const points=[{x:20,y:30},{x:35,y:45},{x:50,y:60}],box={x:10,y:12};
 assert.deepEqual(PEN_MODES,['line','polyline','polygon','path']);
 const line=createPenNode('line',points,box);assert.deepEqual([line.type,line.x1,line.y1,line.x2,line.y2],['line','10mm','18mm','25mm','33mm']);
 const polyline=createPenNode('polyline',points,box);assert.equal(polyline.points.length,3);
 assert.deepEqual(polyline.points[2],['40mm','48mm']);
 const polygon=createPenNode('polygon',points,box);assert.equal(polygon.type,'polygon');
 assert.throws(()=>createPenNode('polygon',points.slice(0,2),box));
 assert.equal(penPointCount('polygon'),3);
 const path=createPenNode('path',points,box);assert.equal(path.type,'path');assert(path.d.startsWith('M '));
 assert(!Object.hasOwn(path,'transform'));
});
test('pen angle constraint is geometric and preserves length',()=>{
 const o={x:20,y:30},p={x:35,y:32},v=snapPenAngle(o,p);
 assert(Math.abs(v.y-30)<1e-8);
 assert(Math.abs(Math.hypot(v.x-20,v.y-30)-Math.hypot(p.x-20,p.y-30))<1e-7);
});

test('click last anchor preserves incoming curve and resets outgoing tangent only',()=>{
 const points=[
  {x:0,y:0,inHx:0,inHy:0,outHx:8,outHy:0},
  {x:30,y:25,inHx:-12,inHy:8,outHx:12,outHy:-8},
  {x:60,y:30,inHx:-10,inHy:0,outHx:0,outHy:0},
 ];
 const original=penPathData(points),reset=resetOutgoingTangent(points,1),result=penPathData(reset);
 assert.equal(reset[1].inHx,-12);assert.equal(reset[1].inHy,8);
 assert.equal(reset[1].outHx,0);assert.equal(reset[1].outHy,0);
 assert.equal(points[1].outHx,12,'input must remain immutable');
 assert(original.includes('C 8 0 18 33 30 25'));
 assert(result.includes('C 8 0 18 33 30 25'),'previous cubic must be unchanged');
 assert(result.includes('C 30 25 50 30 60 30'),'next cubic must start at a corner');
});

test('closing a polygon on its first anchor never appends a second vertex',()=>{
 const points=[{x:10,y:20},{x:50,y:20},{x:45,y:65},{x:10,y:20}];
 const authored=createPenNode('polygon',points,undefined,true);
 assert.deepEqual(authored.points,[['10mm','20mm'],['50mm','20mm'],['45mm','65mm']]);
 assert.equal(uniqueClosingAnchors(points,true).length,3);
 assert.equal(points.length,4,'normalization must not mutate live input');
});
test('closing a straight native SVG path uses Z without a duplicate cubic endpoint',()=>{
 const points=[{x:10,y:20},{x:50,y:20},{x:45,y:65}];
 const closed=createPenNode('path',points,undefined,true);
 assert.equal(closed.d.match(/ C /g).length,2,'two authored edges, third closed by Z');
 assert(closed.d.endsWith(' Z'));
 const repeated=createPenNode('path',[...points,{...points[0]}],undefined,true);
 assert.equal(repeated.d,closed.d,'clicking M again must not add an extra segment');
});
test('curved closing edge preserves Bézier tangents with one logical initial anchor',()=>{
 const points=[
  {x:10,y:10,inHx:-6,inHy:2,outHx:4,outHy:0},
  {x:30,y:50,inHx:0,inHy:-7,outHx:9,outHy:0},
  {x:60,y:10,inHx:-8,inHy:3,outHx:0,outHy:13}
 ];
 const closed=createPenNode('path',points,undefined,true);
 assert.equal(closed.d.match(/ C /g).length,3,'curved closing edge remains editable');
 assert(closed.d.endsWith(' Z'));
 assert.equal(closed.d.match(/ Z/g).length,1);
});

test('Pen line endpoint magnets to prior vertex in either axis',()=>{
 const origin={x:20,y:40};
 assert.deepEqual(snapPenOrthogonal(origin,{x:62,y:41.1},2),{point:{x:62,y:40},axis:'horizontal'});
 assert.deepEqual(snapPenOrthogonal(origin,{x:20.8,y:95},2),{point:{x:20,y:95},axis:'vertical'});
 assert.deepEqual(snapPenOrthogonal(origin,{x:60,y:90},2),{point:{x:60,y:90},axis:null});
});
test('axis snapping tolerance adapts to zoom and preserves unconstrained diagonal',()=>{
 const p={x:13,y:70},origin={x:10,y:20};
 assert.equal(snapPenOrthogonal(origin,p,4).point.x,10);
 assert.equal(snapPenOrthogonal(origin,p,1).point.x,13);
 assert.equal(snapPenOrthogonal(origin,{x:10.2,y:20.3},2).axis,null);
});
