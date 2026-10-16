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
