import test from 'node:test';
import assert from 'node:assert/strict';
import {readLayerColors,validLayerColor} from '../src/features/layer-colors.js';
test('validates editor-only layer color hex values',()=>{
 assert.equal(validLayerColor('#AABBCC'),'#aabbcc');
 assert.equal(validLayerColor('red'),null);
 assert.equal(validLayerColor('javascript:alert(1)'),null);
});
test('accepts only paths to actual layers and valid colors',()=>{
 assert.deepEqual(readLayerColors({'items.0':'#123456','items.0.children.1':'#ABCDEF','__proto__':'#ff00ff','items.wrong':'#123456'}),{'items.0':'#123456','items.0.children.1':'#abcdef'});
});
