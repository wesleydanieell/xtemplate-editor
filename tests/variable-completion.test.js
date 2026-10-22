import test from 'node:test';
import assert from 'node:assert/strict';
import { variableChoices, completeExpression, completeTextInterpolation } from '../src/features/variable-completion.js';
const params = {
  spacing: {type:'length', label:'Row spacing', default:'8mm'},
  columns: {type:'integer',label:'Column count',default:4},
  lineColor: {type:'color',label:'Guide color',default:'#ff0000'},
};
test('color fields suggest only color tokens and custom colors',()=>{
 assert.deepEqual(variableChoices(params,'color').map(x=>x.name),['ink','accent','none','lineColor']);
});
test('numeric expressions suggest only compatible parameters',()=>{
 assert.deepEqual(variableChoices(params,'numeric','co').map(x=>x.name),['columns']);
 assert.equal(variableChoices(params,'numeric','row')[0].name,'spacing');
});
test('completion keeps neighboring expression intact',()=>{
 assert.deepEqual(completeExpression('W * spa + 3mm',7,'spacing'),{value:'W * spacing + 3mm',caret:11});
 assert.deepEqual(completeExpression('spa',3,'spacing'),{value:'spacing',caret:7});
});
test('choices are capped and do not depend on executable HTML',()=>{
 const huge=Object.fromEntries(Array.from({length:25},(_,i)=>['v'+i,{type:'number',label:'v'+i}]));
 assert.equal(variableChoices(huge,'numeric').length,12);
});

test('numeric fields always offer built-in expression variables',()=>{
 assert.deepEqual(variableChoices({},'numeric').map(x=>x.name),['W','H','i','j','pi']);
 assert(!variableChoices({},'numeric').some(x=>x.name==='ink'));
});
test('text interpolation inserts native braces without changing adjacent words',()=>{
 assert.deepEqual(completeTextInterpolation('Hello ',6,'columns'),{value:'Hello {columns}',caret:15});
 assert.deepEqual(completeTextInterpolation('Page {spa',9,'spacing'),{value:'Page {spacing}',caret:14});
 assert.deepEqual(completeTextInterpolation('X {spa} done',6,'spacing'),{value:'X {spacing} done',caret:11});
 assert.deepEqual(completeTextInterpolation('abc',1,'W'),{value:'a{W}bc',caret:4});
});
