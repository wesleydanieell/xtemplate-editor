import test from "node:test";
import assert from "node:assert/strict";
import { anchoredPan, nextZoomLevel } from "../src/features/zoom.js";

test("zoom keeps the point under the cursor when scale changes", () => {
  const pan = { x: 12, y: -8 };
  const oldRect = { left: 120, top: 70 };
  const newRect = { left: 40, top: 30 };
  const anchor = { x: 260, y: 210 };
  const next = anchoredPan({ pan, anchor, oldRect, newRect, scale: 1.5 });
  const oldLocalX = anchor.x - oldRect.left;
  const oldLocalY = anchor.y - oldRect.top;
  assert.ok(Math.abs((newRect.left + next.x - pan.x + oldLocalX * 1.5) - anchor.x) < 1e-9);
  assert.ok(Math.abs((newRect.top + next.y - pan.y + oldLocalY * 1.5) - anchor.y) < 1e-9);
});

test("zoom compensates when fit-to-zoom changes the page layout origin", () => {
  const pan = { x: 0, y: 0 };
  const oldRect = { left: 300, top: 80 };
  const newRect = { left: 60, top: 45 };
  const anchor = { x: 340, y: 125 };
  const next = anchoredPan({ pan, anchor, oldRect, newRect, scale: 2 });
  assert.equal(newRect.left + next.x - pan.x + (anchor.x - oldRect.left) * 2, anchor.x);
  assert.equal(newRect.top + next.y - pan.y + (anchor.y - oldRect.top) * 2, anchor.y);
});

test("zoom steps are predictable and bounded", () => {
  assert.equal(nextZoomLevel("fit", 1), "125");
  assert.equal(nextZoomLevel("fit", -1), "75");
  assert.equal(nextZoomLevel("300", 1), "300");
  assert.equal(nextZoomLevel("25", -1), "25");
  assert.equal(nextZoomLevel("150", -1), "125");
});
