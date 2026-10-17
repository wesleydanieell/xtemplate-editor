/** Find properties explicitly shared by every selected node. */
export const EDITABLE_PROPERTIES = Object.freeze([
  "stroke", "fill", "strokeWidth", "opacity", "rotate", "font", "size",
  "weight", "italic", "align", "baseline", "dash", "clip", "inset",
  "axis", "period", "count", "fit", "index", "stagger", "extend", "text",
  "x", "y", "w", "h", "rx", "cx", "cy", "r", "ry", "points",
  "d", "viewBox", "aspect", "angle", "offset", "select", "x1", "y1", "x2", "y2",
]);

export function sharedEditableProperties(nodes) {
  if (!Array.isArray(nodes) || !nodes.length || nodes.some(node => !node || typeof node !== "object")) return [];
  return EDITABLE_PROPERTIES.filter(key => nodes.every(node => Object.hasOwn(node, key)));
}
