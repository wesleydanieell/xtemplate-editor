import test from "node:test";
import assert from "node:assert/strict";
import { sharedEditableProperties } from "../src/core/common-properties.js";

test("mixed types can edit shared properties only", () => {
  assert.deepEqual(sharedEditableProperties([
    { type: "rect", stroke: "ink", opacity: 1, x: "5mm" },
    { type: "line", stroke: "accent", opacity: .4, x1: "0mm" },
  ]), ["stroke", "opacity"]);
});
test("missing properties cannot be batch-edited even if supported by a type", () => {
  assert.deepEqual(sharedEditableProperties([
    { type: "rect", stroke: "ink" },
    { type: "rect", opacity: .7 },
  ]), []);
});
test("does not expose node internals or unsupported metadata", () => {
  assert.deepEqual(sharedEditableProperties([
    { type: "group", children: [], name: "A", clip: true },
    { type: "group", children: [], name: "B", clip: false },
  ]), ["clip"]);
  assert.deepEqual(sharedEditableProperties([]), []);
});
