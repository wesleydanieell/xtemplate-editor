import test from 'node:test';
import assert from 'node:assert/strict';
import {imageDisplayBounds,imageResizeFit} from '../src/features/image-frame.js';
const frame={x:20,y:35,w:160,h:160};
test('contain selection tracks letterboxed visible image instead of outer viewport',()=>{
 assert.deepEqual(imageDisplayBounds(frame,{width:1600,height:800},'contain','center'),{x:20,y:75,w:160,h:80});
 assert.deepEqual(imageDisplayBounds(frame,{width:1600,height:800},'contain','top'),{x:20,y:35,w:160,h:80});
 assert.deepEqual(imageDisplayBounds(frame,{width:1600,height:800},'contain','bottom'),{x:20,y:115,w:160,h:80});
 assert.deepEqual(imageDisplayBounds(frame,{width:800,height:1600},'contain','left'),{x:20,y:35,w:80,h:160});
 assert.deepEqual(imageDisplayBounds(frame,{width:800,height:1600},'contain','right'),{x:100,y:35,w:80,h:160});
});
test('stretch and cover control bounds remain the entire viewport',()=>{
 assert.deepEqual(imageDisplayBounds(frame,{width:1600,height:800},'cover','top'),frame);
 assert.deepEqual(imageDisplayBounds(frame,{width:1600,height:800},'stretch','center'),frame);
 assert.deepEqual(imageDisplayBounds(frame,null,'contain','center'),frame);
});
test('free side/corner resize uses native stretch; shift corner preserves fit',()=>{
 for(const fit of ['contain','cover','stretch']){
  assert.equal(imageResizeFit(fit,'e'), 'stretch');
  assert.equal(imageResizeFit(fit,'n'), 'stretch');
  assert.equal(imageResizeFit(fit,'sw',false), 'stretch');
  assert.equal(imageResizeFit(fit,'ne',true), fit);
 }
});
