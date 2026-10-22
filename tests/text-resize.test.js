import test from 'node:test';import assert from 'node:assert/strict';
import {resizeTextToFrame,textResizeAxis} from '../src/features/text-resize.js';
test('text resize changes font em size and preserves requested visual corner',()=>{
 const args={frame:{x:30,y:45,w:50,h:10},target:{x:20,y:35,w:100,h:20},anchor:{x:30,y:55},fontSize:5};
 assert.deepEqual(resizeTextToFrame(args),{size:10,x:20,y:55,scale:2});
});
test('end aligned, rotated glyph resize retains the visual anchor correction',()=>{
 const data=resizeTextToFrame({frame:{x:60,y:10,w:14,h:38},target:{x:50,y:10,w:28,h:76},anchor:{x:70,y:20},fontSize:8,axis:'h'});
 assert.equal(data.size,16);assert.equal(data.x,70);assert.equal(data.y,30);
});
test('corner handles use the dominant axis; resize remains proportional',()=>{
 assert.equal(textResizeAxis('se',{w:20,h:10},{w:40,h:12}),'w');
 assert.equal(textResizeAxis('nw',{w:20,h:10},{w:19,h:22}),'h');
 assert.equal(textResizeAxis('e',{w:20,h:10},{w:30,h:10}),'w');
 assert.equal(textResizeAxis('n',{w:20,h:10},{w:20,h:15}),'h');
});
