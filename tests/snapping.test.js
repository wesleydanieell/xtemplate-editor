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
