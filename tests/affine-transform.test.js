import test from 'node:test';
import assert from 'node:assert/strict';
import {identity,translate,scale,rotate,multiply,inverse,applyPoint,around,transformBounds,toSVG} from '../src/features/affine-transform.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} !== ${b}`);
test('translate scale rotate compose as SVG column-vector affine matrices',()=>{
 const m=multiply(translate(5,7),multiply(rotate(90),scale(2,3)));
 const p=applyPoint(m,{x:4,y:1});near(p.x,2);near(p.y,15);
 const back=applyPoint(inverse(m),p);near(back.x,4);near(back.y,1);
});
test('nested rotated/scaled groups invert world coordinates',()=>{
 const world=multiply(around(rotate(30),50,25),multiply(translate(12,-6),scale(1.5,.8)));
 for(const p of [{x:0,y:0},{x:100,y:24},{x:-5,y:90}]){
  const q=applyPoint(inverse(world),applyPoint(world,p));near(q.x,p.x);near(q.y,p.y);
 }
});
test('repeat cell uses parent transform once for every instance',()=>{
 const parent=around(rotate(90),50,50),a=applyPoint(parent,{x:0,y:0}),b=applyPoint(parent,{x:10,y:0});
 near(a.x,b.x);near(b.y-a.y,10);
 const rect=transformBounds(parent,{x:20,y:30,w:60,h:20});
 near(rect.w,20);near(rect.h,60);
});
test('singular matrices reject inversion and identity emits valid SVG',()=>{
 assert.throws(()=>inverse(scale(0)),/Singular/);
 assert.equal(toSVG(identity()),'matrix(1 0 0 1 0 0)');
});
