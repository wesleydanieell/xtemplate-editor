import test from 'node:test';
import assert from 'node:assert/strict';
import {planIndependentResize,stretchBoundsAtHandle,scaleBoundsAtHandle} from '../src/features/multi-resize.js';
import {detectSmartSelection,reflowSmartResize} from '../src/features/smart-selection.js';
const items=[
 {path:['items',0],origin:{type:'rect'},bounds:{x:20,y:20,w:25,h:15}},
 {path:['items',1],origin:{type:'rect'},bounds:{x:20,y:45,w:25,h:15}},
 {path:['items',2],origin:{type:'rect'},bounds:{x:20,y:70,w:25,h:15}},
];
test('Shift south drags change height alone without changing width',()=>{
 const out=stretchBoundsAtHandle({x:20,y:20,w:25,h:15},'s',0,6);
 assert.deepEqual(out,{x:20,y:20,w:25,h:21});
});
test('Shift west drags change width alone, keeping opposite edge anchored',()=>{
 const out=stretchBoundsAtHandle({x:20,y:20,w:25,h:15},'w',5,0);
 assert.deepEqual(out,{x:25,y:20,w:20,h:15});
});
test('Shift southeast allows independent width and height',()=>{
 const out=stretchBoundsAtHandle({x:20,y:20,w:25,h:15},'se',3,7);
 assert.deepEqual(out,{x:20,y:20,w:28,h:22});
});
test('Ctrl+Shift changes only marked item height, shifts next row, preserving 10mm gaps',()=>{
 const smart=detectSmartSelection(items);
 const proposed=planIndependentResize(items,{
  anchorKey:'items.1',handle:'s',dx:0,dy:8,
  activeKeys:new Set(['items.1']),stretch:true
 });
 const result=reflowSmartResize(items,smart,proposed,{anchorKey:'items.1',handle:'s'});
 assert.deepEqual(result.get('items.0'),items[0].bounds);
 assert.deepEqual(result.get('items.1'),{x:20,y:45,w:25,h:23});
 assert.deepEqual(result.get('items.2'),{x:20,y:78,w:25,h:15});
 assert.equal(result.get('items.1').y+result.get('items.1').h+10,result.get('items.2').y);
});
test('Ctrl+Shift width resize in horizontal smart row preserves other widths and 10mm gaps',()=>{
 const horizontal=[
  {path:['items',0],origin:{type:'rect'},bounds:{x:20,y:20,w:25,h:15}},
  {path:['items',1],origin:{type:'rect'},bounds:{x:55,y:20,w:25,h:15}},
  {path:['items',2],origin:{type:'rect'},bounds:{x:90,y:20,w:25,h:15}},
 ];
 const smart=detectSmartSelection(horizontal);
 const resized=planIndependentResize(horizontal,{anchorKey:'items.1',handle:'e',dx:7,
  activeKeys:new Set(['items.1']),stretch:true});
 const result=reflowSmartResize(horizontal,smart,resized,{anchorKey:'items.1',handle:'e'});
 assert.deepEqual(result.get('items.0'),horizontal[0].bounds);
 assert.deepEqual(result.get('items.1'),{x:55,y:20,w:32,h:15});
 assert.deepEqual(result.get('items.2'),{x:97,y:20,w:25,h:15});
});
test('default proportional Scale remains unchanged with Shift released',()=>{
 assert.deepEqual(scaleBoundsAtHandle({x:20,y:20,w:25,h:15},'s',1.2),{x:17.5,y:20,w:30,h:18});
});
