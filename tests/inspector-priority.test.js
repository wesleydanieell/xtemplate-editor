import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectorSections} from '../src/features/inspector-priority.js';
test('repeat places layout-defining fields ahead of aliases and optional effects',()=>{
 const fields=['stagger','count','index','period','fit','axis','extend'].map(k=>({keys:[k]}));
 const sections=inspectorSections('repeat',fields);
 assert.deepEqual(sections.essential.map(x=>x.keys[0]),['axis','period','count','fit']);
 assert.deepEqual(sections.advanced.map(x=>x.keys[0]),['stagger','index','extend']);
});
test('text emphasizes typography before secondary settings',()=>{
 const sections=inspectorSections('text',['italic','rotate','font','size','select'].map(k=>({keys:[k]})));
 assert.deepEqual(sections.essential.map(x=>x.keys[0]),['size','font','rotate']);
 assert.deepEqual(sections.advanced.map(x=>x.keys[0]),['italic','select']);
});
test('grouped coordinates stay together and no fields disappear',()=>{
 const fields=[{keys:['x2','y2']},{keys:['x1','y1']},{keys:['dash']}];
 const sections=inspectorSections('line',fields);
 assert.deepEqual(sections.essential.map(g=>g.keys),[['x1','y1'],['x2','y2']]);
 assert.equal(Object.values(sections).flat().length,fields.length);
});

test('image fit and focus are primary, while raw ZIP source is safely behind advanced disclosure',()=>{
 const fields=['src','position','fit'].map(key=>({keys:[key]}));
 const sections=inspectorSections('image',fields);
 assert.deepEqual(sections.essential.map(item=>item.keys[0]),['fit','position']);
 assert.deepEqual(sections.advanced.map(item=>item.keys[0]),['src']);
});
