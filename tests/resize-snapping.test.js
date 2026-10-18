import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateResizeSnap} from '../src/features/snapping.js';
const page={w:210,h:297},source={x:20,y:30,w:80,h:90};
test('east/south handles snap without moving left/top anchors',()=>{
 const target=[{x:112,y:135,w:0,h:0,kind:'object'}];
 const e=calculateResizeSnap({...source,w:91},'e',target,page,3);
 assert.equal(e.bounds.x,20);assert.equal(e.bounds.w,92);assert.equal(e.guides.x,112);assert.equal(e.guides.y,null);
 const s=calculateResizeSnap({...source,h:104},'s',target,page,3);
 assert.equal(s.bounds.y,30);assert.equal(s.bounds.h,105);assert.equal(s.guides.y,135);
});
test('west/north handles snap while preserving far edges',()=>{
 const targets=[{x:18,y:25,w:0,h:0,kind:'object'}];
 const w=calculateResizeSnap({...source,x:19,w:81},'w',targets,page,3).bounds;
 assert.equal(w.x,18);assert.equal(w.x+w.w,100);
 const n=calculateResizeSnap({...source,y:26,h:94},'n',targets,page,3).bounds;
 assert.equal(n.y,25);assert.equal(n.y+n.h,120);
});
test('resizing on one axis never snaps the other axis',()=>{
 const result=calculateResizeSnap({...source,w:91},'e',[{x:112,y:120,w:0,h:0,kind:'object'}],page,3);
 assert.equal(result.bounds.h,90);assert.equal(result.guides.y,null);
});
