import test from "node:test";
import assert from "node:assert/strict";
import { calculateSnap } from "../src/features/snapping.js";

test("snaps nearest horizontal and vertical edges independently", () => {
  const result = calculateSnap(
    { x: 9, y: 21, w: 22, h: 18 },
    [0, 21, 40],
    [0, 32, 60],
    2,
    3,
  );
  assert.deepEqual(result, { dx: 1, dy: 2, guides: { x: 21, y: 32 } });
});

test("chooses the closest eligible edge without exceeding tolerance", () => {
  const result = calculateSnap({ x: 9, y: 8, w: 12, h: 12 }, [0, 20, 24], [0, 30], 2, 1);
  assert.equal(result.dx, -1);
  assert.equal(result.guides.x, 20);
  assert.equal(result.dy, 0);
  assert.equal(result.guides.y, null);
});

test("does not snap outside tolerance and preserves zero-distance snaps", () => {
  const aligned = calculateSnap({ x: 0, y: 1, w: 10, h: 10 }, [0], [0], 0.5);
  assert.equal(aligned.dx, 0);
  assert.equal(aligned.guides.x, 0);
  assert.equal(aligned.dy, 0);
  assert.equal(aligned.guides.y, null);
});

test("supports separate tolerances at different zoom scales", () => {
  const bounds = { x: 10, y: 10, w: 20, h: 20 };
  assert.equal(calculateSnap(bounds, [31], [31], 0.5, 2).dx, 0);
  assert.equal(calculateSnap(bounds, [31], [31], 0.5, 2).dy, 1);
  assert.equal(calculateSnap(bounds, [31], [31], 1.1, 2).dx, 1);
});

import { calculateObjectSnap } from "../src/features/snapping.js";

test("snaps a rectangle to another object's center and shows a connecting guide", () => {
  const result = calculateObjectSnap(
    { x: 65.6, y: 100, w: 20, h: 10 },
    [{ x: 40, y: 25, w: 50, h: 20 }],
    { w: 210, h: 297 }, 2, 2,
  );
  assert.ok(Math.abs(result.dx + 0.6) < 1e-7);
  assert.equal(result.guides.x, 65);
  assert.deepEqual(result.segments.x, { x: 65, y1: 25, y2: 110, kind: "object" });
  assert.equal(result.segments.y, null);
});

test("page centers remain snap targets when no other elements are near", () => {
  const result = calculateObjectSnap({ x: 94, y: 120, w: 20, h: 18 }, [], { w: 210, h: 297 }, 2, 2);
  assert.equal(result.dx, 1);
  assert.equal(result.guides.x, 105);
  assert.deepEqual(result.segments.x, { x: 105, y1: 0, y2: 297, kind: "page" });
  assert.equal(result.guides.y, null);
});

test("object alignment takes priority when equally close to page guides", () => {
  const result = calculateObjectSnap({ x: 105, y: 50, w: 20, h: 10 }, [{ x: 85, y: 12, w: 40, h: 20 }], { w: 210, h: 297 }, 0.1);
  assert.equal(result.segments.x.kind, "object");
  assert.equal(result.segments.x.y1, 12);
  assert.equal(result.segments.x.y2, 60);
});

test("does not fabricate guides outside tolerance", () => {
  const result = calculateObjectSnap({ x: 33, y: 61, w: 10, h: 10 }, [{ x: 130, y: 150, w: 20, h: 10 }], { w: 210, h: 297 }, 0.1);
  assert.deepEqual(result.guides, { x: null, y: null });
  assert.deepEqual(result.segments, { x: null, y: null });
});
