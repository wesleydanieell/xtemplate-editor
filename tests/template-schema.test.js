import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultNode, NODE_TYPES } from "../src/core/template-schema.js";

test("every documented visual node type has an editable default", () => {
  const expected = ["group", "repeat", "line", "hline", "vline", "rect", "image", "circle", "ellipse", "dot", "polyline", "polygon", "text", "path", "hatch"];
  assert.deepEqual([...NODE_TYPES], expected);
  for (const type of NODE_TYPES) {
    const node = createDefaultNode(type);
    assert.equal(node.type, type);
    assert.ok(node && typeof node === "object");
    assert.notEqual(createDefaultNode(type), node, "each insertion must get a fresh object");
  }
});

test("container and geometry defaults are immediately usable", () => {
  assert.deepEqual(createDefaultNode("group").children, []);
  assert.equal(createDefaultNode("repeat").children[0].type, "hline");
  assert.ok(Array.isArray(createDefaultNode("polyline").points));
  assert.ok(Array.isArray(createDefaultNode("polygon").points));
  assert.equal(typeof createDefaultNode("path").d, "string");
  assert.equal(createDefaultNode("hatch").period, "4mm");
});

test("unknown node types are not silently converted", () => {
  assert.equal(createDefaultNode("unknown"), null);
});
