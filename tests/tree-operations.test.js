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
