import test from "node:test";
import assert from "node:assert/strict";
import { arrangeBounds } from "../src/features/arrange-selection.js";
const items = () => [
  { path: ["items", 0], bounds: { x: 20, y: 10, w: 10, h: 5 } },
  { path: ["items", 1], bounds: { x: 0, y: 30, w: 20, h: 10 } },
  { path: ["items", 2], bounds: { x: 50, y: 0, w: 5, h: 15 } },
];
test("aligns left edges while preserving vertical positions", () => {
  const result = arrangeBounds(items(), "left");
  assert.deepEqual(result.get("items.0"), { dx: -20, dy: 0 });
  assert.deepEqual(result.get("items.1"), { dx: 0, dy: 0 });
  assert.deepEqual(result.get("items.2"), { dx: -50, dy: 0 });
});
test("centers elements within the selected bounds", () => {
  const result = arrangeBounds(items(), "center-x");
  assert.equal(result.get("items.0").dx, 2.5);
  assert.equal(result.get("items.1").dx, 17.5);
});
test("distributes horizontal gaps evenly without changing item order", () => {
  const result = arrangeBounds(items(), "distribute-x");
  assert.equal(result.get("items.0").dx, 10);
  assert.equal(result.get("items.1").dx, 0);
  assert.equal(result.get("items.2").dx, 0);
});
test("rejects insufficient or incomplete selections", () => {
  assert.equal(arrangeBounds(items().slice(0, 1), "left"), null);
  assert.equal(arrangeBounds([{ path: ["items", 0] }, items()[1]], "left"), null);
  assert.equal(arrangeBounds(items(), "unknown"), null);
});
