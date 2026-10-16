import test from "node:test";
import assert from "node:assert/strict";
import {
  resizedBounds,
  resizePreviewTransform,
  rotationPreviewTransform,
} from "../src/features/resize-preview.js";

const source = { x: 10, y: 20, w: 100, h: 200 };

test("east and south resizing keeps the opposite corner fixed", () => {
  assert.deepEqual(resizedBounds(source, "e", 25, 0), { x: 10, y: 20, w: 125, h: 200 });
  assert.deepEqual(resizedBounds(source, "s", 0, 40), { x: 10, y: 20, w: 100, h: 240 });
});

test("west and north resizing keeps the right and bottom edges fixed", () => {
  assert.deepEqual(resizedBounds(source, "w", 15, 30), { x: 25, y: 20, w: 85, h: 200 });
  assert.deepEqual(resizedBounds(source, "n", 0, 30), { x: 10, y: 50, w: 100, h: 170 });
});

test("corner resize handles combine horizontal and vertical movement", () => {
  assert.deepEqual(resizedBounds(source, "se", 50, 100), { x: 10, y: 20, w: 150, h: 300 });
  assert.deepEqual(resizedBounds(source, "nw", 10, 20), { x: 20, y: 40, w: 90, h: 180 });
});

test("resize clamps dimensions to at least one document unit", () => {
  assert.deepEqual(resizedBounds(source, "w", 9999, 0), { x: 109, y: 20, w: 1, h: 200 });
  assert.deepEqual(resizedBounds(source, "n", 0, 9999), { x: 10, y: 219, w: 100, h: 1 });
});

test("resize preview transform maps source bounds to the requested bounds", () => {
  const preview = resizePreviewTransform(source, "se", 50, 100);
  assert.deepEqual({ x: preview.x, y: preview.y, w: preview.w, h: preview.h }, { x: 10, y: 20, w: 150, h: 300 });
  assert.equal(preview.transform, "translate(-5 -10) scale(1.5 1.5)");
  assert.equal(resizePreviewTransform(source, "w", 20, 0, "rotate(30 60 120)").transform,
    "translate(22 0) scale(0.8 1) rotate(30 60 120)");
});

test("rotation preview composes with an existing rotation", () => {
  assert.equal(rotationPreviewTransform(10, 60, 120), "rotate(10 60 120)");
  assert.equal(rotationPreviewTransform(-15, 60, 120, "rotate(30 60 120)"),
    "rotate(-15 60 120) rotate(30 60 120)");
});
