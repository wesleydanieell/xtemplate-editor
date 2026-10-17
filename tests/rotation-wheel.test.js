import test from 'node:test';
import assert from 'node:assert/strict';
import {rotationFromPointer,normalizeDialAngle} from '../src/features/rotation-wheel.js';
test('rotation wheel uses 12 o’clock as zero and clockwise as positive',()=>{
 assert.equal(rotationFromPointer(50,10,50,50),0);
 assert.equal(rotationFromPointer(90,50,50,50),90);
 assert.equal(rotationFromPointer(50,90,50,50),-180);
 assert.equal(rotationFromPointer(10,50,50,50),-90);
});
test('rotation dial allows fine steps and ignores its dead zone',()=>{
 assert.equal(rotationFromPointer(50,50,50,50),null);
 assert.equal(rotationFromPointer(90,50,50,50,0.1),90);
 assert.equal(normalizeDialAngle(405),45);
 assert.equal(normalizeDialAngle(-270),90);
});
