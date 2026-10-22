import test from 'node:test';
import assert from 'node:assert/strict';
import {variableFieldKind,NUMERIC_EXPRESSION_KEYS} from '../src/features/variable-field-support.js';
const kind=(property,type='text')=>variableFieldKind({property,type,editable:true,insideInspector:true});
test('all official scalar numeric expression keys have suggestions',()=>{
 for(const key of ['x','y','w','h','x1','y1','x2','y2','cx','cy','r','rx','ry','strokeWidth','size','inset','period','count','stagger','angle','offset','rotate','opacity','select']){
  assert(NUMERIC_EXPRESSION_KEYS.has(key));assert.equal(kind(key),'numeric',key);
 }
});
test('colors and interpolated text are separate compatible suggestion types',()=>{
 for(const key of ['fill','stroke'])assert.equal(kind(key),'color');
 assert.equal(kind('text'),'text');
 for(const id of ['elementStroke','elementFill'])assert.equal(variableFieldKind({id,type:'text',editable:true,insideInspector:true}),'color');
 assert.equal(variableFieldKind({id:'elementText',type:'text',editable:true,insideInspector:true}),'text');
});
test('invalid option, code and asset fields never suggest variables',()=>{
 for(const key of ['font','type','name','weight','italic','align','baseline','axis','fit','aspect','position','src','index','d','viewBox','points','dash'])assert.equal(kind(key),null,key);
 assert.equal(kind('period','number'),null);
 assert.equal(variableFieldKind({property:'x',type:'text',editable:true,insideInspector:false}),null);
 assert.equal(variableFieldKind({property:'size',type:'text',editable:true,disabled:true,insideInspector:true}),null);
});
