import test from 'node:test';import assert from 'node:assert/strict';
import {PEN_MODES,createPenNode,penPointCount,snapPenAngle,resetOutgoingTangent,penPathData} from '../src/features/vector/pen-model.js';
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
