import test from 'node:test';import assert from 'node:assert/strict';
import {proportionalResizeBounds,resizeGestureBounds} from '../src/features/constrained-resize.js';
const square={x:10,y:20,w:40,h:40};
test('Shift corner resize produces square while keeping opposite corner anchored',()=>{
 assert.deepEqual(proportionalResizeBounds(square,'se',20,3,true),{x:10,y:20,w:60,h:60});
 assert.deepEqual(proportionalResizeBounds(square,'nw',-20,-4,true),{x:-10,y:0,w:60,h:60});
 assert.deepEqual(proportionalResizeBounds(square,'ne',10,-4,true),{x:10,y:10,w:50,h:50});
 assert.deepEqual(proportionalResizeBounds(square,'sw',-5,15,true),{x:-5,y:20,w:55,h:55});
});
test('non-square shapes keep original proportions, side handles remain single-axis',()=>{
 const b={x:10,y:20,w:80,h:40};
 assert.deepEqual(proportionalResizeBounds(b,'se',12,20,true),{x:10,y:20,w:120,h:60});
 assert.deepEqual(proportionalResizeBounds(b,'e',20,10,true),{x:10,y:20,w:100,h:40});
 assert.deepEqual(proportionalResizeBounds(b,'se',20,10,false),{x:10,y:20,w:100,h:50});
});
test('snapping constrained square preserves fixed opposite corner and aspect',()=>{
 const result=resizeGestureBounds(square,'se',17,13,{shiftKey:true,
  page:{w:210,h:297},targets:[{x:70,y:200,w:20,h:10,kind:'object'}],toleranceX:4,toleranceY:4});
 assert.equal(result.bounds.w,result.bounds.h);
 assert.equal(result.bounds.x,10);assert.equal(result.bounds.y,20);
 assert.equal(result.bounds.x+result.bounds.w,70,'east handle aligned to object at 70');
 assert.equal(result.guides.x,70);assert.equal(result.guides.y,null);
});
test('snap disabled or impossible leaves free resize; side handle ignores aspect',()=>{
 const options={shiftKey:true,magnetic:false,targets:[{x:55,y:55,w:0,h:0}]};
 assert.deepEqual(resizeGestureBounds(square,'se',17,13,options).bounds,{x:10,y:20,w:57,h:57});
 assert.deepEqual(resizeGestureBounds(square,'e',17,13,options).bounds,{x:10,y:20,w:57,h:40});
});
test('magnetic resize does not snap anchored west edge when dragging east',()=>{
 const b={x:15,y:15,w:35,h:35};
 const result=resizeGestureBounds(b,'se',8,9,{shiftKey:true,page:{w:210,h:297},targets:[{x:60,y:30,w:10,h:10,kind:'object'}],toleranceX:4,toleranceY:4});
 assert.equal(result.bounds.x,15);assert.equal(result.bounds.y,15);
 assert.equal(result.bounds.w,result.bounds.h);
});
