/** Bounded undo/redo history over immutable serialized document snapshots. */
export function createHistory(initialSnapshot, limit = 100) {
  const undoStack = [];
  const redoStack = [];
  let currentSnapshot = initialSnapshot;

  function pushBounded(stack, snapshot) {
    stack.push(snapshot);
    if (stack.length > limit) stack.shift();
  }

  return Object.freeze({
    get current() { return currentSnapshot; },
    get canUndo() { return undoStack.length > 0; },
    get canRedo() { return redoStack.length > 0; },
    get undoCount() { return undoStack.length; },
    get redoCount() { return redoStack.length; },
    record(nextSnapshot) {
      if (nextSnapshot === currentSnapshot) return false;
      pushBounded(undoStack, currentSnapshot);
      currentSnapshot = nextSnapshot;
      redoStack.length = 0;
      return true;
    },
    undo(currentState = currentSnapshot) {
      if (!undoStack.length) return null;
      pushBounded(redoStack, currentState);
      currentSnapshot = undoStack.pop();
      return currentSnapshot;
    },
    redo(currentState = currentSnapshot) {
      if (!redoStack.length) return null;
      pushBounded(undoStack, currentState);
      currentSnapshot = redoStack.pop();
      return currentSnapshot;
    },
    reset(snapshot) {
      undoStack.length = 0;
      redoStack.length = 0;
      currentSnapshot = snapshot;
    },
  });
}
