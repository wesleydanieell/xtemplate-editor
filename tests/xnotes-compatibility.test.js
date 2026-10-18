import test from 'node:test';
import assert from 'node:assert/strict';
import {xnotesCompatibilityWarnings} from '../src/core/xnotes-compatibility.js';
test('warn about non-text and repeat rotations XNotes does not render',()=>{
 const template={items:[{type:'repeat',rotate:90,children:[{type:'rect',rotate:45}]},{type:'text',rotate:35},{type:'text',rotate:180}]};
 assert.deepEqual(xnotesCompatibilityWarnings(template).map(x=>x.code),
  ['non-text-rotation','non-text-rotation','text-rotation-quantized']);
});
test('compatibility scan never edits exported template metadata',()=>{
 const template={items:[{type:'group',rotate:'angle',children:[{type:'text',rotate:90}]}],extra:'preserved'};
 const before=JSON.stringify(template);
 assert.equal(xnotesCompatibilityWarnings(template).length,1);
 assert.equal(JSON.stringify(template),before);
});
