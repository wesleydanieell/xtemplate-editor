import test from "node:test";
import assert from "node:assert/strict";
import { screenToDocumentPoint } from "../src/features/pointer-geometry.js";

test("maps viewport coordinates into the document when the page is scaled", () => {
  assert.deepEqual(
    screenToDocumentPoint({
      clientX: 260, clientY: 310,
      rect: { left: 60, top: 10, width: 400, height: 600 },
      pageWidth: 200, pageHeight: 300,
    }),
    { x: 100, y: 150 },
  );
});

test("prefers an SVG local transform after zoom and panning", () => {
  const seen = [];
  const result = screenToDocumentPoint({
    clientX: 180, clientY: 95,
    rect: { left: 100, top: 80, width: 200, height: 300 },
    pageWidth: 200, pageHeight: 300,
    toLocal: (x, y) => { seen.push([x, y]); return { x: (x - 100) / 2, y: (y - 80) / 2 }; },
  });
  assert.deepEqual(seen, [[180, 95]]);
  assert.deepEqual(result, { x: 40, y: 7.5 });
});

test("uses safe fallback dimensions if the SVG has no measurable rectangle", () => {
  const result = screenToDocumentPoint({
    clientX: 40, clientY: 25, rect: null, pageWidth: 210, pageHeight: 297,
    toLocal: () => ({ x: Number.NaN, y: 5 }),
  });
  assert.deepEqual(result, { x: 8400, y: 7425 });
});

test("does not return a non-finite SVG result", () => {
  const result = screenToDocumentPoint({
    clientX: 5, clientY: 7, rect: { left: 0, top: 0, width: 100, height: 100 },
    pageWidth: 200, pageHeight: 300, toLocal: () => { throw new Error("singular matrix"); },
  });
  assert.deepEqual(result, { x: 10, y: 21 });
});
