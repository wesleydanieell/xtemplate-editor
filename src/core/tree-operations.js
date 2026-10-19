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

/** Atomically drag multiple selected nodes, optionally from different parents.
 * Items retain their original document (not click) order. A selected parent
 * subsumes its children; dropping onto any selected subtree is invalid.
 * Preflight all destinations before removal so invalid operations are no-ops.
 */
export function moveNodes(root, sourcePaths, targetPath = null, placement = 'after') {
  if(!['before','after','inside','root'].includes(placement))return null;
  const paths=normalizePaths(sourcePaths);
  if(!paths.length||paths.some(path=>path[0]!=='items'))return null;
  const entries=paths.map(path=>({path,node:getAtPath(root,path),array:getAtPath(root,path.slice(0,-1)),index:path.at(-1)}));
  if(entries.some(({node,array,index})=>!node||!Array.isArray(array)||!Number.isInteger(index)||array[index]!==node))return null;
  const moved=new Set(entries.map(item=>item.node));
  const target=placement==='root'?null:getAtPath(root,targetPath);
  if(placement!=='root'){
   if(!target||moved.has(target)||!Array.isArray(targetPath)||targetPath[0]!=='items')return null;
   if(placement==='inside'&&!['group','repeat'].includes(target.type))return null;
   if(paths.some(path=>targetPath.length>path.length&&path.every((part,i)=>part===targetPath[i])))return null;
  }
  const destination=placement==='root'?root.items:placement==='inside'?
   (target.children||[]):getAtPath(root,targetPath.slice(0,-1));
  if(!Array.isArray(destination))return null;
  // Sort by document tree traversal to maintain a predictable sequence even
  // when selectedPaths is ordered by Ctrl-clicks rather than source order.
  const inDocumentOrder=[];
  const visit=(nodes)=>{for(const node of nodes||[]){if(moved.has(node))inDocumentOrder.push(node);
   if(['group','repeat'].includes(node?.type))visit(node.children);}};
  visit(root.items);
  if(inDocumentOrder.length!==entries.length)return null;
  // Keep list indices stable while removing multiple siblings in one atomic step.
  const groups=new Map();
  for(const item of entries){if(!groups.has(item.array))groups.set(item.array,[]);groups.get(item.array).push(item.index);}
  for(const [array,indices] of groups)for(const index of indices.sort((a,b)=>b-a))array.splice(index,1);
  let insertArray,position;
  if(placement==='root'){insertArray=root.items;position=insertArray.length;}
  else if(placement==='inside'){insertArray=target.children||(target.children=[]);position=insertArray.length;}
  else{
   // Destination target is guaranteed not removed; use its identity rather
   // than a stale path after siblings have shifted.
   const current=findNodePath(root,target);
   insertArray=getAtPath(root,current.slice(0,-1));
   position=current.at(-1)+(placement==='after'?1:0);
  }
  insertArray.splice(position,0,...inDocumentOrder);
  const resultPaths=inDocumentOrder.map(node=>findNodePath(root,node));
  return {paths:resultPaths,path:resultPaths.at(-1),nodes:inDocumentOrder,count:inDocumentOrder.length};
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
