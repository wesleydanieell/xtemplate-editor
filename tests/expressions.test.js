import test from "node:test";
import assert from "node:assert/strict";
import { evalExpr, mm } from "../src/core/expressions.js";

test("converts supported length units to millimeters", () => {
  assert.equal(mm("2cm"), 20);
  assert.equal(mm("1in"), 25.4);
  assert.equal(mm("72pt"), 25.4);
  assert.equal(mm("4.5mm"), 4.5);
  assert.equal(mm("not a length"), null);
});

test("evaluates arithmetic, units, percentages and page variables", () => {
  const context = { w: 200, h: 300, vars: { W: 200, H: 300, spacing: 5, i: 2 } };
  assert.equal(evalExpr("W / 2 + 5mm", context, "x"), 105);
  assert.equal(evalExpr("50%", context, "y"), 150);
  assert.equal(evalExpr("spacing * (i + 1)", context), 15);
  assert.equal(evalExpr("max(2, 5, 3) * 2", context), 10);
});

test("supports the documented math helpers and angle-based trigonometry", () => {
  const context = { w: 100, h: 100, vars: {} };
  assert.equal(evalExpr("round(sqrt(81))", context), 9);
  assert.equal(evalExpr("sin(30)", context), 0.49999999999999994);
  assert.equal(evalExpr("mod(17, 5)", context), 2);
});

test("invalid expressions return their caller-provided fallback", () => {
  const context = { w: 100, h: 100, vars: {} };
  assert.equal(evalExpr("unknown + 1", context, "x", 7), 7);
  assert.equal(evalExpr("1 / 0", context, "x", -1), -1);
  assert.equal(evalExpr("1 + (", context, "x", 12), 12);
});
