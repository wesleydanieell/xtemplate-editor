import test from 'node:test';import assert from 'node:assert/strict';
import {editablePathNodes,replaceSvgPathPoint,appendSvgLine,toggleSvgClosed,removeSvgPathAnchor,pathHandleConnections} from '../src/features/vector/svg-path.js';
test('parse native line and bezier control points with original numeric offsets',()=>{
 const d='M 0,0 L 25,40 C 30 40, 55 60, 70 80 Q 90 95 100 110 Z';
 const parsed=editablePathNodes(d);
 assert.equal(parsed.nodes.length,7);assert.equal(parsed.closed,true);
 const changed=replaceSvgPathPoint(d,parsed.nodes[2],33,41);
 assert.equal(changed,'M 0,0 L 25,40 C 33 41, 55 60, 70 80 Q 90 95 100 110 Z');
});
test('rejects complex commands instead of silently rewriting unsupported d',()=>{
 for(const d of ['m 0 0 l 10 20','M 0 0 A 20 20 0 0 1 50 40','M 0 0 H 30','M 0 0 L 5 5 10 10'])
  assert.throws(()=>editablePathNodes(d));
});
test('append and toggle closure without rewriting original coordinates',()=>{
 const d='M 0 0 L 10 10 Z';
 assert.equal(appendSvgLine(d,20,30),'M 0 0 L 10 10 L 20 30 Z');
 assert.equal(toggleSvgClosed(d),'M 0 0 L 10 10');
 assert.equal(toggleSvgClosed('M 0 0 L 10 10'),'M 0 0 L 10 10 Z');
});

test('removing a selected anchor deletes only its complete segment',()=>{
 const d='M 0 0 L 20 20 C 25 30 35 40 50 60 Z';
 assert.equal(removeSvgPathAnchor(d,1),'M 0 0  C 25 30 35 40 50 60 Z');
 assert.throws(()=>removeSvgPathAnchor(d,0));
 assert.throws(()=>removeSvgPathAnchor(d,2),'control point cannot remove entire Bézier segment');
});

test('Bézier handles connect outgoing to previous anchor, incoming to next anchor',()=>{
 const parsed=editablePathNodes('M 0 0 C 10 2 15 20 20 20 C 20 20 32 28 40 40');
 assert.deepEqual(pathHandleConnections(parsed),[
  {index:1,anchorIndex:0,side:'outgoing'},
  {index:2,anchorIndex:3,side:'incoming'},
  {index:4,anchorIndex:3,side:'outgoing'},
  {index:5,anchorIndex:6,side:'incoming'},
 ]);
});
