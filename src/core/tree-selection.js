import { normalizePaths, pathKey } from "./tree-operations.js";

/** Select a visual range in the Structure tree, including mixed types and groups. */
export function selectTreePaths(visiblePaths, selectedPaths, anchorPath, clickedPath, modifiers = {}) {
  const visible = visiblePaths.filter(path => Array.isArray(path) && path[0] !== "__page__");
  const key = pathKey(clickedPath);
  const anchorIndex = visible.findIndex(path => pathKey(path) === pathKey(anchorPath));
  const clickedIndex = visible.findIndex(path => pathKey(path) === key);
  if (clickedIndex < 0) return { paths: normalizePaths(selectedPaths), anchor: anchorPath };

  if (modifiers.shift && anchorIndex >= 0) {
    const range = visible.slice(Math.min(anchorIndex, clickedIndex), Math.max(anchorIndex, clickedIndex) + 1);
    const paths = normalizePaths(modifiers.additive ? [...selectedPaths, ...range] : range);
    return { paths, anchor: anchorPath };
  }
  if (modifiers.additive) {
    const exists = selectedPaths.some(path => pathKey(path) === key);
    const paths = normalizePaths(exists ? selectedPaths.filter(path => pathKey(path) !== key) : [...selectedPaths, clickedPath]);
    return { paths, anchor: clickedPath };
  }
  return { paths: [clickedPath.slice()], anchor: clickedPath };
}
