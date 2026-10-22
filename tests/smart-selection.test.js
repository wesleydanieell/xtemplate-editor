import test from 'node:test';
import assert from 'node:assert/strict';
import {detectSmartSelection,adjustSmartGap,reflowSmartResize,smartGapLocations,smartReorderIndex,reorderSmartSelection} from '../src/features/smart-selection.js';
const item=(id,x,y,w,h)=>({path:['items',id],bounds:{x,y,w,h}});
test('detect equal-spaced Figma-like vertical column',()=>{
 const items=[item(0,20,20,22,15),item(1,20,45,22,15),item(2,20,70,22,15)];
 const smart=detectSmartSelection(items);
 assert.equal(smart.axis,'y');assert.equal(smart.gap,10);
 assert.deepEqual(smart.orderedKeys,['items.0','items.1','items.2']);
 assert.equal(smartGapLocations(items,smart).length,2);
});
test('detect alignment at centers for different-width objects',()=>{
 const items=[item(0,20,15,20,15),item(1,15,40,30,15),item(2,18,65,24,15)];
 const smart=detectSmartSelection(items);
 assert.equal(smart.axis,'y');assert.equal(smart.alignedAt,.5);
});
test('uneven or diagonal layers are not assumed to be a smart list',()=>{
 assert.equal(detectSmartSelection([item(0,0,0,10,10),item(1,0,25,10,10),item(2,0,77,10,10)]),null);
 assert.equal(detectSmartSelection([item(0,0,0,10,10),item(1,20,20,10,10),item(2,40,40,10,10)]),null);
});
test('resizing one marked layer keeps the other sizes and original gaps',()=>{
 const items=[item(0,20,20,22,15),item(1,20,45,22,15),item(2,20,70,22,15)];
 const smart=detectSmartSelection(items);
 const resized=new Map([['items.1',{x:20,y:45,w:22,h:22}]]);
 const next=reflowSmartResize(items,smart,resized);
 assert.deepEqual(next.get('items.0'),items[0].bounds);
 assert.deepEqual(next.get('items.1'),{x:20,y:45,w:22,h:22});
 assert.deepEqual(next.get('items.2'),{x:20,y:77,w:22,h:15});
 assert.deepEqual(items[2].bounds,{x:20,y:70,w:22,h:15},'source untouched');
});
test('gap drag updates all intervals and keeps original shape sizes',()=>{
 const items=[item(0,20,20,22,15),item(1,20,45,22,15),item(2,20,70,22,15)];
 const next=adjustSmartGap(items,detectSmartSelection(items),15);
 assert.equal(next.get('items.0').y,20);
 assert.equal(next.get('items.1').y,50);
 assert.equal(next.get('items.2').y,80);
 assert.equal(next.get('items.2').h,15);
});

test('touching objects remain a Smart Selection and can gain positive spacing',()=>{
 const items=[item(0,15,10,20,15),item(1,15,25,20,15),item(2,15,40,20,15)];
 const smart=detectSmartSelection(items);
 assert.equal(smart.axis,'y');
 assert.equal(smart.gap,0);
 const result=adjustSmartGap(items,smart,8);
 assert.equal(result.get('items.1').y,33);
 assert.equal(result.get('items.2').y,56);
});

test('dragging middle marker past last object swaps places without changing size',()=>{
 const items=[item(0,10,15,20,15),item(1,10,40,20,20),item(2,10,70,20,12)];
 const smart=detectSmartSelection(items);
 assert.equal(smart.axis,'y');
 assert.equal(smartReorderIndex(items,smart,'items.1',77),2);
 const result=reorderSmartSelection(items,smart,'items.1',2);
 assert.deepEqual(result.order,['items.0','items.2','items.1']);
 assert.deepEqual(result.bounds.get('items.2'),{x:10,y:40,w:20,h:12});
 assert.deepEqual(result.bounds.get('items.1'),{x:10,y:62,w:20,h:20});
 assert.deepEqual(items[1].bounds,{x:10,y:40,w:20,h:20});
});
test('reordering horizontal row preserves widths, gaps and stacking identities',()=>{
 const items=[item(0,10,22,12,15),item(1,32,22,15,15),item(2,57,22,18,15)];
 const smart=detectSmartSelection(items);
 assert.equal(smart.axis,'x');
 const result=reorderSmartSelection(items,smart,'items.0',2);
 assert.deepEqual(result.order,['items.1','items.2','items.0']);
 assert.equal(result.bounds.get('items.1').x,10);
 assert.equal(result.bounds.get('items.2').x,35);
 assert.equal(result.bounds.get('items.0').x,63);
 assert.equal(result.bounds.get('items.0').w,12);
});
test('north handle remains precisely under mouse and shifts prior neighbors backward',()=>{
 const items=[item(0,20,20,20,15),item(1,20,45,20,15),item(2,20,70,20,15)];
 const smart=detectSmartSelection(items);
 const next=reflowSmartResize(items,smart,new Map([
  ['items.1',{x:20,y:40,w:20,h:20}]
 ]),{anchorKey:'items.1',handle:'n'});
 assert.equal(next.get('items.1').y,40,'active top tracks pointer');
 assert.equal(next.get('items.1').h,20);
 assert.equal(next.get('items.0').y,15,'prior neighbor moves rather than overriding dragged edge');
 assert.equal(next.get('items.2').y,70,'following neighbor stays if trailing edge unchanged');
});

test('south resize anchors the middle dragged handle when every layer is marked',()=>{
 const items=[item(0,20,20,20,15),item(1,20,45,20,15),item(2,20,70,20,15)];
 const smart=detectSmartSelection(items);
 const resized=new Map(items.map(it=>[it.path.join('.'),{...it.bounds,h:it.bounds.h+8}]));
 const result=reflowSmartResize(items,smart,resized,{anchorKey:'items.1',handle:'s'});
 assert.deepEqual(result.get('items.0'),{x:20,y:12,w:20,h:23});
 assert.deepEqual(result.get('items.1'),{x:20,y:45,w:20,h:23});
 assert.deepEqual(result.get('items.2'),{x:20,y:78,w:20,h:23});
 assert.equal(result.get('items.1').y+result.get('items.1').h,68,
  'middle south handle moves by exactly eight mm, not sixteen');
});
test('east resize anchors the middle dragged handle for a horizontally distributed row',()=>{
 const items=[item(0,20,20,15,20),item(1,45,20,15,20),item(2,70,20,15,20)];
 const smart=detectSmartSelection(items);
 const resized=new Map(items.map(it=>[it.path.join('.'),{...it.bounds,w:it.bounds.w+8}]));
 const result=reflowSmartResize(items,smart,resized,{anchorKey:'items.1',handle:'e'});
 assert.equal(result.get('items.0').x,12);
 assert.equal(result.get('items.1').x,45);
 assert.equal(result.get('items.2').x,78);
 assert.equal(result.get('items.1').x+result.get('items.1').w,68);
});
