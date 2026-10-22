import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateEqualSpacingSnap} from '../src/features/equal-spacing.js';

const rect=(x,y,w=10,h=10)=>({x,y,w,h,kind:'object'});
test('detects equal horizontal gaps between neighbors',()=>{
 const result=calculateEqualSpacingSnap(rect(44,20),[rect(20,20),rect(70,20)],4,4);
 assert.equal(result.dx,1); // left edge 20..30, moved 45..55, right edge 70..80 => 15mm each
 assert.equal(result.dy,null);
 assert.deepEqual(result.segments.filter(s=>s.axis==='x').map(s=>s.value),[15,15]);
});
test('detects equal vertical gaps',()=>{
 const result=calculateEqualSpacingSnap(rect(45,36),[rect(45,10),rect(45,70)],6,6);
 assert.equal(result.dy,4);
 assert.equal(result.dx,null);
});
test('copies a previously established gap after the last object',()=>{
 const result=calculateEqualSpacingSnap(rect(56,10),[rect(10,10),rect(32,10)],4);
 assert.equal(result.dx,-2); // first gap 12, desired third begins 54
 assert.equal(result.segments.filter(s=>s.axis==='x').length,2);
});
test('does not fabricate a snap for distant or non-overlapping rows',()=>{
 const result=calculateEqualSpacingSnap(rect(130,50),[rect(10,10),rect(32,10)],3);
 assert.equal(result.dx,null);
 assert.equal(result.dy,null);
 assert.equal(result.segments.length,0);
});
