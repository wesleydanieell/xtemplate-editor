import test from 'node:test';
import assert from 'node:assert/strict';
import {valueHint, variableTypeHint} from '../src/features/value-hints.js';
test('value hints describe measurement and color expressions',()=>{
 assert.match(valueHint('x')[1],/mm/);
 assert.match(valueHint('strokeWidth')[1],/mm/);
 assert.match(valueHint('fill')[1],/accent/);
 assert.equal(valueHint('unknown'),null);
});
test('every variable type provides an example and meaning',()=>{
 for(const type of ['length','color','number','integer']){
  assert(variableTypeHint(type)?.[1].length>15);
 }
 assert.equal(variableTypeHint('text'),null);
});
