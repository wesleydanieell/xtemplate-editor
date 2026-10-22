import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionFrame,remapSelectedPoint,remapSelectedBounds,resizeEachBounds} from '../src/features/multi-transform.js';
import {scaleEditableSvgPath,editablePathNodes} from '../src/features/vector/svg-path.js';
test('combined bounds preserve spacing across independent nodes',()=>{
 const items=[{bounds:{x:10,y:20,w:15,h:20}},{bounds:{x:45,y:35,w:18,h:12}}];
 const frame=selectionFrame(items);
 assert.deepEqual(frame,{x:10,y:20,w:53,h:27});
 const next={x:10,y:20,w:106,h:54};
 assert.deepEqual(remapSelectedBounds(items[1].bounds,frame,next),{x:80,y:50,w:36,h:24});
 assert.deepEqual(remapSelectedPoint(10,20,frame,next),{x:10,y:20});

});
test('SVG path multi-resize scales quadratic and cubic control points natively',()=>{
 const d='M 0 0 C 10 0 20 10 30 20 Q 40 30 50 50 Z';
 const result=scaleEditableSvgPath(d,{x:0,y:0,w:50,h:50},{x:10,y:20,w:100,h:150});
 assert.equal(result,'M 10 20 C 30 20 50 50 70 80 Q 90 110 110 170 Z');
 assert.deepEqual(editablePathNodes(result).segments.map(s=>s.command),['M','C','Q','Z']);
});
test('multi-resize rejects expressions and unsupported SVG syntax without mutation',()=>{
 assert.throws(()=>scaleEditableSvgPath('M0 0 a 2 2 0 0 1 4 0',{x:0,y:0,w:10,h:10},{x:0,y:0,w:20,h:20}));
 assert.throws(()=>remapSelectedPoint(5,7,{x:0,y:0,w:0,h:10},{x:0,y:0,w:30,h:30}));
});

test('independent multi-resize reduces three heights without changing origins or scaling gaps',()=>{
 const original=[{x:10,y:20,w:20,h:15},{x:55,y:42,w:20,h:18},{x:125,y:65,w:22,h:25}];
 const next=resizeEachBounds(original,'s',0,-5);
 assert.deepEqual(next,original.map(b=>({...b,h:b.h-5})));
 assert.deepEqual(resizeEachBounds(original,'e',6,0),
  original.map(b=>({...b,w:b.w+6})));
 assert.deepEqual(original[0],{x:10,y:20,w:20,h:15},
  'Source shapes stay immutable across previews');
});
