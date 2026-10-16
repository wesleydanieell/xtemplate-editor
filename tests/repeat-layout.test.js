import test from "node:test";
import assert from "node:assert/strict";
import { repeatPositions } from "../src/features/repeat-layout.js";

test("count without a period divides the parent evenly", () => {
  assert.deepEqual(repeatPositions(10, 20, null, 4, "repeat"), [
    { index: 0, pos: 10, size: 5 },
    { index: 1, pos: 15, size: 5 },
    { index: 2, pos: 20, size: 5 },
    { index: 3, pos: 25, size: 5 },
  ]);
});

test("period plus count creates exactly count instances, not count plus one", () => {
  assert.deepEqual(repeatPositions(0, 100, 8, 1, "repeat"), [{ index: 0, pos: 0, size: 8 }]);
  assert.deepEqual(repeatPositions(0, 10, 4, 3, "repeat"), [
    { index: 0, pos: 0, size: 4 },
    { index: 1, pos: 4, size: 4 },
    { index: 2, pos: 8, size: 4 },
  ]);
});

test("an explicit repeat count can extend past the parent box, matching XNotes", () => {
  assert.deepEqual(repeatPositions(5, 6, 4, 4, "repeat"), [
    { index: 0, pos: 5, size: 4 },
    { index: 1, pos: 9, size: 4 },
    { index: 2, pos: 13, size: 4 },
    { index: 3, pos: 17, size: 4 },
  ]);
});

test("a staggered repeat includes a leading partial cell", () => {
  assert.deepEqual(repeatPositions(10, 20, 5, null, "repeat", 500, null, 2).map(({ index, pos }) => ({ index, pos })), [
    { index: -1, pos: 7 },
    { index: 0, pos: 12 },
    { index: 1, pos: 17 },
    { index: 2, pos: 22 },
    { index: 3, pos: 27 },
  ]);
});

test("extended repeats calculate indices over the visible range", () => {
  assert.deepEqual(
    repeatPositions(10, 20, 5, null, "repeat", 500, { lo: 0, hi: 30 }, 2).map(({ index, pos }) => ({ index, pos })),
    [
      { index: -3, pos: -3 },
      { index: -2, pos: 2 },
      { index: -1, pos: 7 },
      { index: 0, pos: 12 },
      { index: 1, pos: 17 },
      { index: 2, pos: 22 },
      { index: 3, pos: 27 },
    ],
  );
});

test("space, center and round fitting stay deterministic", () => {
  assert.deepEqual(repeatPositions(0, 24, 10, null, "space"), [
    { index: 0, pos: 0, size: 10 },
    { index: 1, pos: 14, size: 10 },
  ]);
  assert.deepEqual(repeatPositions(0, 24, 10, null, "center"), [
    { index: 0, pos: 2, size: 10 },
    { index: 1, pos: 12, size: 10 },
  ]);
  assert.deepEqual(repeatPositions(0, 25, 10, 5, "round"), Array.from({ length: 5 }, (_, index) => ({
    index, pos: index * 5, size: 5,
  })));
});

test("invalid periods, counts and excessive layouts fail safely", () => {
  assert.deepEqual(repeatPositions(0, 50, 0, 5, "repeat"), []);
  assert.deepEqual(repeatPositions(0, 50, 10, 0, "repeat"), []);
  assert.deepEqual(repeatPositions(0, 50, 1, 10000, "repeat", 500), []);
  assert.deepEqual(repeatPositions(0, 10, 1, null, "repeat", 5), []);
});
