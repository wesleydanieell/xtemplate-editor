import test from "node:test";
import assert from "node:assert/strict";
import { selectTreePaths } from "../src/core/tree-selection.js";

const visible = [["items",0],["items",1],["items",2],["items",2,"children",0],["items",2,"children",1],["items",3]];

test("Ctrl-click selects different element types and multiple groups", () => {
  const result=selectTreePaths(visible,[["items",0]],["items",0],["items",2,"children",0],{additive:true});
  assert.deepEqual(result.paths,[["items",0],["items",2,"children",0]]);
});
test("Shift-click selects a visible tree range across different parents", () => {
  const result=selectTreePaths(visible,[["items",1]],["items",1],["items",2,"children",1],{shift:true});
  assert.deepEqual(result.paths,[["items",1],["items",2]]);
});
test("Ctrl-Shift-click adds a visible range to the selection", () => {
  const result=selectTreePaths(visible,[["items",0]],["items",2,"children",0],["items",3],{shift:true,additive:true});
  assert.deepEqual(result.paths,[["items",0],["items",2,"children",0],["items",2,"children",1],["items",3]]);
});
test("Ctrl-click toggles elements without removing unrelated selections", () => {
  const result=selectTreePaths(visible,[["items",0],["items",1]],["items",1],["items",0],{additive:true});
  assert.deepEqual(result.paths,[["items",1]]);
});
test("selection excludes descendants when their parent is included", () => {
  const result=selectTreePaths(visible,[["items",2]],["items",2],["items",2,"children",0],{additive:true});
  assert.deepEqual(result.paths,[["items",2]]);
});
