import test from "node:test";
import assert from "node:assert/strict";
import { deleteSiblingNodes, duplicateSiblingNodes, getSiblingSelection, groupSiblingNodes, normalizePaths, sameParent } from "../src/core/tree-operations.js";

const fixture = () => ({ items: [
  { type: "rect", x: "1mm" },
  { type: "group", children: [{ type: "text", text: "A" }, { type: "text", text: "B" }] },
  { type: "ellipse" },
] });

test("normalizes duplicate paths and removes descendants when a parent is selected", () => {
  assert.deepEqual(normalizePaths([["items", 0], ["items", 0], ["items", 1, "children", 0]]), [["items", 0], ["items", 1, "children", 0]]);
  assert.deepEqual(normalizePaths([["items", 1], ["items", 1, "children", 0]]), [["items", 1]]);
});

test("sameParent only matches paths at the same nesting level", () => {
  assert.equal(sameParent(["items", 0], ["items", 1]), true);
  assert.equal(sameParent(["items", 1, "children", 0], ["items", 1, "children", 1]), true);
  assert.equal(sameParent(["items", 0], ["items", 1, "children", 0]), false);
});

test("sibling selection rejects mixed parents and resolves the selected array", () => {
  const doc = fixture();
  assert.equal(getSiblingSelection(doc, [["items", 0], ["items", 1, "children", 0]]), null);
  assert.deepEqual(getSiblingSelection(doc, [["items", 2], ["items", 0]]).indices, [0, 2]);
});

test("grouping preserves node order and returns the new group path", () => {
  const doc = fixture();
  const result = groupSiblingNodes(doc, [["items", 2], ["items", 0]]);
  assert.deepEqual(result, { path: ["items", 0], paths: [["items", 0]], count: 2 });
  assert.deepEqual(doc.items[0], { type: "group", children: [{ type: "rect", x: "1mm" }, { type: "ellipse" }] });
  assert.equal(doc.items[1].type, "group");
});

test("duplicating copies selected siblings without sharing nested objects", () => {
  const doc = fixture();
  const result = duplicateSiblingNodes(doc, [["items", 1, "children", 0], ["items", 1, "children", 1]]);
  assert.equal(result.count, 2);
  assert.deepEqual(doc.items[1].children.map(node => node.text), ["A", "B", "A", "B"]);
  doc.items[1].children[2].text = "changed";
  assert.equal(doc.items[1].children[0].text, "A");
});

test("deleting multiple siblings removes them from highest index down", () => {
  const doc = fixture();
  const result = deleteSiblingNodes(doc, [["items", 0], ["items", 2]]);
  assert.equal(result.count, 2);
  assert.deepEqual(doc.items, [{ type: "group", children: [{ type: "text", text: "A" }, { type: "text", text: "B" }] }]);
});

import { moveNode } from "../src/core/tree-operations.js";

test("drag between same-level siblings preserves ordering", () => {
  const doc = fixture();
  assert.deepEqual(moveNode(doc, ["items", 0], ["items", 2], "after"), ["items", 2]);
  assert.deepEqual(doc.items.map(n => n.type), ["group", "ellipse", "rect"]);
  assert.deepEqual(moveNode(doc, ["items", 2], ["items", 0], "before"), ["items", 0]);
  assert.deepEqual(doc.items.map(n => n.type), ["rect", "group", "ellipse"]);
});

test("drag between nested groups and the Page root", () => {
  const doc = fixture();
  assert.deepEqual(moveNode(doc, ["items", 0], ["items", 1], "inside"), ["items", 0, "children", 2]);
  assert.deepEqual(doc.items[0].children.map(n => n.type), ["text", "text", "rect"]);
  assert.deepEqual(moveNode(doc, ["items", 0, "children", 2], null, "root"), ["items", 2]);
  assert.deepEqual(doc.items.map(n => n.type), ["group", "ellipse", "rect"]);
});

test("invalid drops never remove the source or create cycles", () => {
  const doc = fixture(), snapshot = structuredClone(doc);
  assert.equal(moveNode(doc, ["items", 1], ["items", 1, "children", 0], "inside"), null);
  assert.equal(moveNode(doc, ["items", 0], ["items", 2], "inside"), null);
  assert.equal(moveNode(doc, ["items", 0], ["items", 0], "after"), null);
  assert.deepEqual(doc, snapshot);
});

import { nudgeSiblingNodes } from "../src/core/tree-operations.js";

test("Alt arrows move multiple adjacent layers one slot without reversing them", () => {
  const doc = { items: [0,1,2,3,4].map(i => ({ type: "rect", name: String(i) })) };
  assert.deepEqual(nudgeSiblingNodes(doc, [["items",1],["items",2]],"down"), [["items",2],["items",3]]);
  assert.deepEqual(doc.items.map(x=>x.name), ["0","3","1","2","4"]);
  assert.deepEqual(nudgeSiblingNodes(doc, [["items",2],["items",3]],"up"), [["items",1],["items",2]]);
  assert.deepEqual(doc.items.map(x=>x.name), ["0","1","2","3","4"]);
});

test("Alt arrows respect bounds and ignore selections across different parents", () => {
  const doc=fixture();
  assert.deepEqual(nudgeSiblingNodes(doc,[["items",0]],"up"),[]);
  assert.deepEqual(nudgeSiblingNodes(doc,[["items",2]],"down"),[]);
  assert.equal(nudgeSiblingNodes(doc,[["items",0],["items",1,"children",0]],"up"),null);
});

import { moveNodes } from '../src/core/tree-operations.js';
test('multi-drag respects document order rather than Ctrl-click selection order',()=>{
 const doc={items:['A','B','C','D','E'].map(name=>({type:'rect',name}))};
 const result=moveNodes(doc,[['items',3],['items',1]],['items',4],'after');
 assert.equal(result.count,2);
 assert.deepEqual(doc.items.map(n=>n.name),['A','C','E','B','D']);
 assert.deepEqual(result.paths,[['items',3],['items',4]]);
});
test('multi-drag moves nodes across parents and into page root atomically',()=>{
 const doc={items:[{type:'group',name:'L',children:[{type:'rect',name:'A'},{type:'rect',name:'B'}]},
  {type:'group',name:'R',children:[{type:'ellipse',name:'C'}]}, {type:'rect',name:'D'}]};
 const selected=[['items',0,'children',1],['items',2]];
 const moved=moveNodes(doc,selected,['items',1],'inside');
 assert.deepEqual(doc.items[1].children.map(n=>n.name),['C','B','D']);
 assert.deepEqual(moved.paths,[['items',1,'children',1],['items',1,'children',2]]);
 const returned=moveNodes(doc,moved.paths,null,'root');
 assert.deepEqual(doc.items.map(n=>n.name),['L','R','B','D']);
 assert.deepEqual(returned.paths,[['items',2],['items',3]]);
});
test('selected ancestor absorbs descendants, rejects cyclic and in-selection drops',()=>{
 const doc={items:[{type:'group',name:'G',children:[{type:'rect',name:'A'}]}, {type:'rect',name:'B'}]};
 const snapshot=structuredClone(doc);
 assert.equal(moveNodes(doc,[['items',0],['items',0,'children',0]],['items',0,'children',0],'after'),null);
 assert.equal(moveNodes(doc,[['items',0],['items',1]],['items',0],'after'),null);
 assert.equal(moveNodes(doc,[['items',1]],['items',0,'children',0],'inside'),null);
 assert.deepEqual(doc,snapshot);
 const allowed=moveNodes(doc,[['items',0],['items',0,'children',0]],null,'root');
 assert.equal(allowed.count,1);
 assert.equal(doc.items.at(-1).name,'G');
});
test('multi-drag before target with same-list removals uses target identity',()=>{
 const doc={items:['A','B','C','D','E','F'].map(name=>({type:'rect',name}))};
 const result=moveNodes(doc,[['items',5],['items',1]],['items',3],'before');
 assert.deepEqual(doc.items.map(n=>n.name),['A','C','B','F','D','E']);
 assert.deepEqual(result.paths,[['items',2],['items',3]]);
});
