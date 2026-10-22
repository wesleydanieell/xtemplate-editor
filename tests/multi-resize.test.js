import test from 'node:test';
import assert from 'node:assert/strict';
import {planIndependentResize,scaleBoundsAtHandle,uniformScaleFromDrag} from '../src/features/multi-resize.js';

const item=(key,type,x,y,w,h)=>({key,origin:{type},bounds:{x,y,w,h}});
const rects=[
 item('a','rect',20,20,20,15),
 item('b','rect',20,50,30,20),
 item('c','rect',20,85,40,25)
];
const near=(x,y)=>assert(Math.abs(x-y)<1e-9,`${x} != ${y}`);
test('default south resize keeps each rectangle aspect ratio, even when dimensions differ',()=>{
 const result=planIndependentResize(rects,{anchorKey:'b',handle:'s',dy:-5});
 const scale=0.75;
 for(const item of rects){
  const next=result.get(item.key),old=item.bounds;
  near(next.w/old.w,scale);near(next.h/old.h,scale);
  near(next.x+next.w/2,old.x+old.w/2);
  near(next.y,old.y);
 }
});
test('north and west side handles preserve proportions and anchor opposite edges',()=>{
 const n=planIndependentResize(rects,{anchorKey:'b',handle:'n',dy:-5}).get('b');
 assert.deepEqual(n,{x:16.25,y:45,w:37.5,h:25});
 const w=planIndependentResize(rects,{anchorKey:'b',handle:'w',dx:5}).get('b');
 near(w.x,25);near(w.w,25);near(w.h,20*25/30);
 near(w.y+w.h/2,60);
});
test('circles, ellipses, text, images and native paths preserve aspect on a side drag',()=>{
 const items=[
 item('circle','circle',15,20,18,18),
 item('ellipse','ellipse',40,30,30,15),
 item('text','text',80,20,44,11),
 item('image','image',135,22,40,25),
 item('path','path',190,32,30,17),
 item('polygon','polygon',230,24,25,20),
 ];
 const result=planIndependentResize(items,{anchorKey:'ellipse',handle:'s',dy:-3});
 const factor=12/15;
 for(const i of items){
  const next=result.get(i.key),before=i.bounds;
  near(next.w/before.w,factor);near(next.h/before.h,factor);
  near(next.x+next.w/2,before.x+before.w/2);
  near(next.y,before.y);
 }
});
test('default mixed selection preserves ratios for rectangles, ellipses and text',()=>{
 const items=[item('r','rect',0,0,20,10),item('e','ellipse',30,20,30,15),
  item('t','text',70,24,35,10)];
 const next=planIndependentResize(items,{anchorKey:'r',handle:'s',dy:5});
 assert.deepEqual(next.get('r'),{x:-5,y:0,w:30,h:15});
 assert.deepEqual(next.get('e'),{x:22.5,y:20,w:45,h:22.5});
 assert.deepEqual(next.get('t'),{x:61.25,y:24,w:52.5,h:15});
});
test('corner drags preserve ratio of ALL shapes, including rectangles',()=>{
 const factor=uniformScaleFromDrag(rects[1].bounds,'se',15,10);
 near(factor,1.5);
 const next=planIndependentResize(rects,{anchorKey:'b',handle:'se',dx:15,dy:10});
 for(const i of rects){
  near(next.get(i.key).w/i.bounds.w,factor);
  near(next.get(i.key).h/i.bounds.h,factor);
  near(next.get(i.key).x,i.bounds.x);
  near(next.get(i.key).y,i.bounds.y);
 }
});
test('corner pointer is projected to the closest point on the original diagonal',()=>{
 const bounds={x:10,y:10,w:40,h:20},dx=17,dy=-6;
 const factor=uniformScaleFromDrag(bounds,'se',dx,dy);
 const actual=scaleBoundsAtHandle(bounds,'se',factor);
 const ex=40*(factor-1),ey=20*(factor-1);
 near((dx-ex)*40+(dy-ey)*20,0);
 near(actual.w/actual.h,2);
});
test('side handles preserve rectangle ratio without any Shift modifier',()=>{
 const result=planIndependentResize(rects,{handle:'s',anchorKey:'b',dy:5});
 for(const i of rects){
  near(result.get(i.key).w/i.bounds.w,1.25);
  near(result.get(i.key).h/i.bounds.h,1.25);
 }
});
test('unmarked objects remain immutable and are not accidentally redimensioned',()=>{
 const result=planIndependentResize(rects,{anchorKey:'b',handle:'s',dy:6,
  activeKeys:new Set(['b'])});
 assert.deepEqual(result.get('a'),rects[0].bounds);
 assert.deepEqual(result.get('c'),rects[2].bounds);
 assert.equal(result.get('b').h,26);
});
test('uniform side handle remains exactly on the pointer along the active axis',()=>{
 const e={x:50,y:40,w:30,h:15};
 const factor=uniformScaleFromDrag(e,'s',0,8);
 const next=scaleBoundsAtHandle(e,'s',factor);
 near(next.y+next.h,e.y+e.h+8);
 near(next.x+next.w/2,e.x+e.w/2);
 const topFactor=uniformScaleFromDrag(e,'n',0,-5);
 const top=scaleBoundsAtHandle(e,'n',topFactor);
 near(top.y,e.y-5);
});
test('immutable snapshot and width/height never become NaN',()=>{
 const items=[...rects];const snapshot=structuredClone(items);
 const result=planIndependentResize(items,{handle:'nw',anchorKey:'a',dx:-12,dy:-5});
 assert.deepEqual(items,snapshot);
 for(const out of result.values())assert(Object.values(out).every(Number.isFinite));
});
