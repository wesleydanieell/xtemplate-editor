import { pathKey } from "./tree-operations.js";

/** Dedupe UI selections WITHOUT discarding descendants of selected groups.
 * Destructive operations (delete, cut, move) still use normalizePaths to avoid
 * mutating the same subtree twice, but inspection may select parent + child. */
export function uniqueSelectionPaths(paths = []) {
  return [...new Map(paths.filter(Array.isArray).map(path => [pathKey(path), path.slice()])).values()];
}

/** Select a visual range across root, group and nested Structure levels. */
export function selectTreePaths(visiblePaths, selectedPaths, anchorPath, clickedPath, modifiers = {}) {
  const visible = visiblePaths.filter(path => Array.isArray(path) && path[0] !== "__page__");
  const key = pathKey(clickedPath);
  const anchorIndex = visible.findIndex(path => pathKey(path) === pathKey(anchorPath));
  const clickedIndex = visible.findIndex(path => pathKey(path) === key);
  if (clickedIndex < 0) return { paths: uniqueSelectionPaths(selectedPaths), anchor: anchorPath };

  if (modifiers.shift && anchorIndex >= 0) {
    const range = visible.slice(Math.min(anchorIndex, clickedIndex), Math.max(anchorIndex, clickedIndex) + 1);
    const paths = uniqueSelectionPaths(modifiers.additive ? [...selectedPaths, ...range] : range);
    return { paths, anchor: anchorPath };
  }
  if (modifiers.additive) {
    const exists = selectedPaths.some(path => pathKey(path) === key);
    const paths = uniqueSelectionPaths(exists ? selectedPaths.filter(path => pathKey(path) !== key) : [...selectedPaths, clickedPath]);
    return { paths, anchor: clickedPath };
  }
  return { paths: [clickedPath.slice()], anchor: clickedPath };
}
