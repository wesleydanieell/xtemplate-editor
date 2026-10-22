/** Canonical editable node catalog for the XTemplate format. */
export const NODE_TYPES = Object.freeze([
  "group", "repeat", "line", "hline", "vline", "rect", "image", "circle",
  "ellipse", "dot", "polyline", "polygon", "text", "path", "hatch",
]);

const DEFAULTS = Object.freeze({
  group: () => ({ type: "group", children: [] }),
  repeat: () => ({ type: "repeat", axis: "y", period: "8mm", fit: "repeat", children: [{ type: "hline", y: "100%", stroke: "ink", strokeWidth: "0.2mm" }] }),
  hline: () => ({ type: "hline", y: "50%", stroke: "ink", strokeWidth: "0.25mm" }),
  vline: () => ({ type: "vline", x: "50%", stroke: "ink", strokeWidth: "0.25mm" }),
  line: () => ({ type: "line", x1: "10mm", y1: "10mm", x2: "50mm", y2: "40mm", stroke: "ink", strokeWidth: "0.3mm" }),
  image: () => ({ type: "image", src: "", x: "20mm", y: "20mm", w: "170mm", h: "120mm", fit: "contain", position: "center" }),
  rect: () => ({ type: "rect", x: "20mm", y: "20mm", w: "60mm", h: "35mm", stroke: "ink", fill: "none", strokeWidth: "0.3mm" }),
  circle: () => ({ type: "circle", cx: "50%", cy: "50%", r: "10mm", stroke: "ink", fill: "none", strokeWidth: "0.3mm" }),
  ellipse: () => ({ type: "ellipse", cx: "50%", cy: "50%", rx: "15mm", ry: "8mm", stroke: "ink", fill: "none", strokeWidth: "0.3mm" }),
  dot: () => ({ type: "dot", cx: "50%", cy: "50%", r: "0.35mm", fill: "ink" }),
  polyline: () => ({ type: "polyline", points: [[0, 0], [25, 20], [50, 0]], stroke: "ink", fill: "none", strokeWidth: "0.3mm" }),
  polygon: () => ({ type: "polygon", points: [[0, 0], [25, 0], [30, 20], [12, 30], [0, 15]], stroke: "ink", fill: "none", strokeWidth: "0.3mm" }),
  text: () => ({ type: "text", x: "15mm", y: "20mm", text: "Novo texto", size: "4mm", fill: "ink" }),
  path: () => ({ type: "path", x: "20mm", y: "20mm", w: "60mm", h: "40mm", viewBox: [0, 0, 100, 60], d: "M 0 60 L 50 0 L 100 60", stroke: "ink", fill: "none" }),
  hatch: () => ({ type: "hatch", period: "4mm", angle: 45, stroke: "ink", strokeWidth: "0.15mm" }),
});

/** Return a fresh, editable example node; unknown types are rejected explicitly. */
export function createDefaultNode(type) {
  const factory = DEFAULTS[type];
  return factory ? factory() : null;
}
