import test from "node:test";
import assert from "node:assert/strict";
import { createHistory } from "../src/core/history.js";

test("records snapshots and undoes/redoes in the correct order", () => {
  const history = createHistory("A");
  history.record("B"); history.record("C");
  assert.equal(history.undo(), "B");
  assert.equal(history.undo(), "A");
  assert.equal(history.canUndo, false);
  assert.equal(history.redo(), "B");
  assert.equal(history.redo(), "C");
  assert.equal(history.canRedo, false);
});

test("a new edit after undo clears the redo stack", () => {
  const history = createHistory("A");
  history.record("B"); history.record("C"); history.undo();
  assert.equal(history.canRedo, true);
  history.record("D");
  assert.equal(history.canRedo, false);
  assert.equal(history.undo(), "B");
});

test("ignores duplicate snapshots and respects the history limit", () => {
  const history = createHistory("0", 2);
  assert.equal(history.record("0"), false);
  history.record("1"); history.record("2"); history.record("3");
  assert.equal(history.undoCount, 2);
  assert.equal(history.undo(), "2");
  assert.equal(history.undo(), "1");
  assert.equal(history.undo(), null);
});

test("reset clears both stacks and installs the supplied snapshot", () => {
  const history = createHistory("A");
  history.record("B"); history.undo(); history.reset("new");
  assert.equal(history.current, "new");
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});
