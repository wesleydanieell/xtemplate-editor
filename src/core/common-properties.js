/** Editable capabilities of XTemplate nodes, independent of whether an optional
 * key is present in the JSON. Adding a property uses the renderer's defaults
 * and overrides an inherited style only after the user actually edits it. */
export const EDITABLE_PROPERTIES = Object.freeze([
  "stroke", "fill", "strokeWidth", "opacity", "rotate", "font", "size",
  "weight", "italic", "align", "baseline", "dash", "clip", "inset",
  "axis", "period", "count", "fit", "index", "stagger", "extend", "text",
  "x", "y", "w", "h", "rx", "cx", "cy", "r", "ry", "points",
  "d", "viewBox", "aspect", "angle", "offset", "src", "position", "select", "x1", "y1", "x2", "y2",
]);
const STYLE = ["stroke", "fill", "strokeWidth", "opacity", "dash"];
const LINE_STYLE = ["stroke", "strokeWidth", "opacity", "dash"];
const DOT_STYLE = ["fill", "stroke", "opacity"];
const TEXT_DRAW_STYLE = ["fill", "stroke", "opacity"];
const TEXT_STYLE = ["font", "size", "weight", "italic", "align", "baseline"];
const XYWH = ["x", "y", "w", "h"];
const TYPE_PROPERTIES = Object.freeze({
  group: [...STYLE, ...TEXT_STYLE, ...XYWH, "inset", "clip"],
  repeat: [...STYLE, ...TEXT_STYLE, "axis", "period", "count", "fit", "index", "stagger", "extend"],
  rect: [...STYLE, ...XYWH, "rx"],
  image: [...XYWH, "src", "fit", "position", "opacity"],
  hline: [...LINE_STYLE, "y", "x1", "x2"],
  vline: [...LINE_STYLE, "x", "y1", "y2"],
  line: [...LINE_STYLE, "x1", "y1", "x2", "y2"],
  circle: [...STYLE, "cx", "cy", "r"],
  dot: [...DOT_STYLE, "cx", "cy", "r"],
  ellipse: [...STYLE, "cx", "cy", "rx", "ry"],
  polyline: [...STYLE, "points"],
  polygon: [...STYLE, "points"],
  text: [...TEXT_DRAW_STYLE, ...TEXT_STYLE, "x", "y", "text", "select"],
  path: [...STYLE, ...XYWH, "d", "viewBox", "aspect"],
  hatch: [...LINE_STYLE, "period", "angle", "offset", "extend"],
});
const GEOMETRY_DEFAULTS = Object.freeze({
  x: "0mm", y: "0mm", w: "100%", h: "100%", x1: "0mm", y1: "0mm",
  x2: "100%", y2: "100%", cx: "0mm", cy: "0mm", rx: "0mm", ry: "0mm",
  r: "0.35mm", rotate: 0, opacity: 1,
});
const TYPE_DEFAULTS = Object.freeze({
  hline: { y: "0mm", x1: "0mm", x2: "100%" },
  vline: { x: "0mm", y1: "0mm", y2: "100%" },
  line: { x1: "0mm", x2: "0mm", y1: "0mm", y2: "0mm" },
  repeat: { axis: "y", fit: "repeat" },
  ellipse: { rx: "15mm", ry: "8mm" },
  text: {},
  group: { clip: false },
});
export function supportsEditableProperty(type, key) {
  return Boolean(TYPE_PROPERTIES[type]?.includes(key));
}
export function sharedEditableProperties(nodes) {
  if (!Array.isArray(nodes) || !nodes.length || nodes.some(node => !node || typeof node !== "object")) return [];
  return EDITABLE_PROPERTIES.filter(key => nodes.every(node => supportsEditableProperty(node.type, key)));
}
/** Return an explicit value, a renderer default, or undefined for an inherited
 * or unset value. `undefined` must not be applied back until an edit occurs. */
export function editablePropertyValue(node, key) {
  if (!supportsEditableProperty(node?.type, key)) return undefined;
  if (Object.hasOwn(node, key)) return node[key];
  return TYPE_DEFAULTS[node.type]?.[key] ?? GEOMETRY_DEFAULTS[key];
}
