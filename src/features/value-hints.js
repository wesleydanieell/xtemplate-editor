/** Human-readable, non-invasive guidance for XTemplate value fields. */
export const VALUE_HINTS = Object.freeze({
  x: ['Length or expression', '10mm · 20% · W / 2'],
  y: ['Length or expression', '10mm · 20% · H / 2'],
  w: ['Width or expression', '100% · 40mm · W / 2'],
  h: ['Height or expression', '100% · 40mm · H / 2'],
  x1: ['Length or expression', '0mm · 100%'],
  y1: ['Length or expression', '0mm · 100%'],
  x2: ['Length or expression', '0mm · 100%'],
  y2: ['Length or expression', '0mm · 100%'],
  cx: ['Center coordinate', '50% · W / 2'],
  cy: ['Center coordinate', '50% · H / 2'],
  r: ['Radius', '5mm · 2%'],
  rx: ['Horizontal radius', '8mm · 5%'],
  ry: ['Vertical radius', '8mm · 5%'],
  strokeWidth: ['Line thickness', '0.3mm · spacing / 8'],
  size: ['Text size', '4mm · 12pt'],
  inset: ['Inset/margin', '10mm · ["5mm", "10mm"]'],
  period: ['Repetition interval', '8mm · spacing'],
  count: ['Count / integer expression', '5 · columns'],
  stroke: ['Color or token', 'ink · accent · #4488cc'],
  fill: ['Color or token', 'none · accent · #4488cc'],
  opacity: ['Opacity', '0–100%'],
  rotate: ['Rotation', '-180° to 180° (or enter exact angle)'],
  text: ['Text content', 'Title or note heading'],
  points: ['Coordinate pairs', '0,0  10,0  10,10'],
  d: ['SVG path data', 'M 0 0 L 10 10'],
  dash: ['Dash lengths', '["2mm", "1mm"]'],
  viewBox: ['SVG view box', '[0, 0, 100, 100]'],
  angle: ['Angle', '45 · 90'],
  offset: ['Offset', '2mm · 10%'],
});

export const VARIABLE_TYPE_HINTS = Object.freeze({
  length: ['Length', 'Measurements in mm, e.g. 8mm. Use this name in position, size or spacing expressions.'],
  color: ['Color', 'HEX color, e.g. #4f7cff. Use the variable name in Stroke or Fill.'],
  number: ['Decimal number', 'Integer or decimal, e.g. 0.5 or 2.75. Useful for multipliers.'],
  integer: ['Integer', 'Whole numbers, e.g. 4 or 12. Useful for counts and repeats.'],
});

export function valueHint(key){return VALUE_HINTS[key]||null;}
export function variableTypeHint(type){return VARIABLE_TYPE_HINTS[type]||null;}
