/** Pure selection and tree mutations for the nested XTemplate node model. */
export const pathKey = path => Array.isArray(path) ? path.join(".") : "";

export function sameParent(a, b) {
  return Array.isArray(a) && Array.isArray(b)
    && a.length === b.length
    && a.slice(0, -1).every((value, index) => value === b[index]);
}

export function normalizePaths(paths = []) {
  const unique = [...new Map(paths.filter(Array.isArray).map(path => [pathKey(path), path.slice()])).values()];
  return unique.filter(path => !unique.some(other =>
    other.length < path.length && pathKey(path).startsWith(pathKey(other) + ".")
  ));
}

export function getAtPath(root, path) {
  return Array.isArray(path) ? path.reduce((value, key) => value?.[key], root) : undefined;
}

export function getSiblingSelection(root, paths) {
  const normalized = normalizePaths(paths);
  if (!normalized.length || normalized.length !== paths.length) return null;
  const ordered = normalized.slice().sort((a, b) => a.at(-1) - b.at(-1));
  if (ordered.some(path => !sameParent(path, ordered[0]))) return null;
  const parentPath = ordered[0].slice(0, -1);
  const array = getAtPath(root, parentPath);
  if (!Array.isArray(array) || ordered.some(path => !Number.isInteger(path.at(-1)) || !array[path.at(-1)])) return null;
  return { paths: ordered, parentPath, array, indices: ordered.map(path => path.at(-1)) };
}

export function groupSiblingNodes(root, paths) {
  const selection = getSiblingSelection(root, paths);
  if (!selection || selection.indices.length < 2) return null;
  const { array, indices, parentPath } = selection;
  const first = indices[0];
  const children = indices.map(index => array[index]);
  for (const index of [...indices].sort((a, b) => b - a)) array.splice(index, 1);
  array.splice(first, 0, { type: "group", children });
  const path = parentPath.concat(first);
  return { path, paths: [path], count: children.length };
}

export function duplicateSiblingNodes(root, paths) {
  const selection = getSiblingSelection(root, paths);
  if (!selection) return null;
  const { array, indices, parentPath } = selection;
  const copies = indices.map(index => structuredClone(array[index]));
  const at = indices.at(-1) + 1;
  array.splice(at, 0, ...copies);
  const nextPaths = copies.map((_, index) => parentPath.concat(at + index));
  return { path: nextPaths.at(-1), paths: nextPaths, count: copies.length };
}

export function deleteSiblingNodes(root, paths) {
  const selection = getSiblingSelection(root, paths);
  if (!selection) return null;
  const { array, indices } = selection;
  for (const index of [...indices].sort((a, b) => b - a)) array.splice(index, 1);
  return { path: null, paths: [], count: indices.length };
}

/** Atomically reposition a node in its current list, another container or the Page root.
 * Resolves destination by object identity after removal to avoid index-shift bugs.
 */
export function moveNode(root, sourcePath, targetPath = null, placement = "after") {
  if (!["before", "after", "inside", "root"].includes(placement)) return null;
  const sourceArray = getAtPath(root, sourcePath?.slice(0, -1));
  const index = sourcePath?.at(-1);
  if (!Array.isArray(sourceArray) || !Number.isInteger(index) || index < 0 || index >= sourceArray.length) return null;
  const node = sourceArray[index];
  const target = targetPath ? getAtPath(root, targetPath) : null;
  if (placement !== "root") {
    if (!target || target === node || !targetPath?.length || sourcePath.join(".") === targetPath.join(".")) return null;
    if (targetPath.length > sourcePath.length && targetPath.slice(0, sourcePath.length).every((part, i) => part === sourcePath[i])) return null;
    if (placement === "inside" && !["group", "repeat"].includes(target.type)) return null;
  }
  sourceArray.splice(index, 1);
  let destination, position;
  if (placement === "root") {
    destination = root.items;
    position = destination.length;
  } else if (placement === "inside") {
    destination = target.children || (target.children = []);
    position = destination.length;
  } else {
    const parent = findNodePath(root, target);
    if (!parent) { sourceArray.splice(index, 0, node); return null; }
    destination = getAtPath(root, parent.slice(0, -1));
    position = parent.at(-1) + (placement === "after" ? 1 : 0);
  }
  destination.splice(position, 0, node);
  return findNodePath(root, node);
}

export function findNodePath(root, target) {
  function visit(nodes, prefix) {
    for (let i = 0; i < (nodes || []).length; i++) {
      const path = prefix.concat(i), node = nodes[i];
      if (node === target) return path;
      if (["group", "repeat"].includes(node?.type)) {
        const found = visit(node.children, path.concat("children"));
        if (found) return found;
      }
    }
    return null;
  }
  return visit(root.items, ["items"]);
}

/** Move a set of sibling layers exactly one slot, preserving their relative order. */
export function nudgeSiblingNodes(root, paths, direction) {
  if (direction !== "up" && direction !== "down") return null;
  const selected = getSiblingSelection(root, paths);
  if (!selected) return null;
  const { array, indices } = selected;
  const nodes = indices.map(index => array[index]), selectedSet = new Set(nodes);
  let moved = false;
  if (direction === "up") {
    for (let i = 1; i < array.length; i++) {
      if (selectedSet.has(array[i]) && !selectedSet.has(array[i - 1])) {
        [array[i - 1], array[i]] = [array[i], array[i - 1]];
        moved = true;
      }
    }
  } else {
    for (let i = array.length - 2; i >= 0; i--) {
      if (selectedSet.has(array[i]) && !selectedSet.has(array[i + 1])) {
        [array[i], array[i + 1]] = [array[i + 1], array[i]];
        moved = true;
      }
    }
  }
  return moved ? nodes.map(node => findNodePath(root, node)) : [];
}
