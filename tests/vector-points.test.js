import test from 'node:test';
import assert from 'node:assert/strict';
import {readPointPairs,requiresBake,replacePointCoordinate,removePoint,addPoint,reversePoints,positionWithinParent} from '../src/features/vector/points.js';
test('native nested pairs and numeric string inputs parse safely',()=>{
 assert.deepEqual(readPointPairs('0 0 5 5'),[[0,0],[5,5]]);
 assert.deepEqual(readPointPairs([['W/2','10mm'],[20,25]]),[['W/2','10mm'],[20,25]]);
 assert.throws(()=>readPointPairs([[1,2,3]]));
});
test('editing one coordinate preserves other expressions',()=>{
 const points=[['W/2','10mm'],['W/4','20mm']];
 assert.deepEqual(replacePointCoordinate(points,1,1,14),[['W/2','10mm'],['W/4','14mm']]);
 assert.deepEqual(points,[['W/2','10mm'],['W/4','20mm']]);
 assert.equal(requiresBake('W/2'),true);
 assert.equal(requiresBake('15mm'),false);
});
test('insert, remove, reverse and nesting offset',()=>{
 const points=[[0,0],[10,0],[10,10]];
 assert.equal(addPoint(points,1,[5,0]).length,4);
 assert.throws(()=>removePoint(points,1,true));
 assert.deepEqual(reversePoints(points),[[10,10],[10,0],[0,0]]);
 assert.deepEqual(positionWithinParent({x:30,y:40},{x:10,y:15}),{x:20,y:25});
});
