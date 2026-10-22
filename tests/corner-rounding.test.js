import test from 'node:test';import assert from 'node:assert/strict';
import {clampRectCorner,maxRectCorner,straightPathCorners,roundStraightPath} from '../src/features/vector/corner-rounding.js';
import {editablePathNodes} from '../src/features/vector/svg-path.js';
test('native rectangle corners saturate at half the smaller side',()=>{
 assert.equal(maxRectCorner(50,10),5);assert.equal(clampRectCorner(13,50,10),5);
 assert.equal(clampRectCorner(-5,50,10),0);assert.equal(clampRectCorner(3,50,10),3);
});
test('closed polygonal path bakes to XNotes-native Q curves, keeping closure',()=>{
 const src='M 0 0 L 40 0 L 40 20 L 0 20 Z';const rounded=roundStraightPath(src,5);
 assert(rounded.includes('Q 40 0 40 5'));assert(rounded.endsWith('Z'));
 assert.equal(editablePathNodes(rounded).closed,true);
 assert.equal(roundStraightPath(src,0),src);
});
test('open path rounds only interior corners without closing shape',()=>{
 const value=roundStraightPath('M 0 0 L 20 0 L 20 20',6);
 assert.equal(value,'M 0 0 L 14 0 Q 20 0 20 6 L 20 20');
 assert.equal(editablePathNodes(value).closed,false);
});
test('short edges, collinear points and repeated initial closure avoid NaNs',()=>{
 const d=roundStraightPath('M 0 0 L 100 0 L 101 0 L 101 100 L 0 100 L 0 0 Z',25);
 assert(!/NaN|Infinity/.test(d));assert.equal(editablePathNodes(d).closed,true);
});
test('unsupported imported path grammar remains untouched',()=>{
 for(const d of ['M 0 0 C 0 1 1 1 1 2 Z','m 0 0 l 10 10 z','M 0 0 H 10 V 10 Z']){
  assert.equal(straightPathCorners(d),null);
  assert.throws(()=>roundStraightPath(d,3));
 }
});
