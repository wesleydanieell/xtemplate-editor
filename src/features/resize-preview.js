/** Calculate a bounded resize operation in document coordinates. */
export function resizedBounds(bounds, handle, dx, dy) {
  let left = bounds.x;
  let right = bounds.x + bounds.w;
  let top = bounds.y;
  let bottom = bounds.y + bounds.h;

  if (handle.includes("w")) left = Math.min(right - 1, left + dx);
  if (handle.includes("e")) right = Math.max(left + 1, right + dx);
  if (handle.includes("n")) top = Math.min(bottom - 1, top + dy);
  if (handle.includes("s")) bottom = Math.max(top + 1, bottom + dy);

  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Build an SVG-only preview transform without rebuilding its children.
 *
 * baseTransform is the element's original transform (for example, an existing rotation).
 * The generated transform maps the existing visual bounds onto the resized bounds, so a group
 * containing thousands of repeated SVG nodes can be resized with one attribute update per frame.
 */
export function resizePreviewTransform(bounds, handle, dx, dy, baseTransform = "") {
  const next = resizedBounds(bounds, handle, dx, dy);
  const scaleX = next.w / Math.max(bounds.w, 1e-9);
  const scaleY = next.h / Math.max(bounds.h, 1e-9);
  const translateX = next.x - scaleX * bounds.x;
  const translateY = next.y - scaleY * bounds.y;
  const transform = "translate(" + translateX + " " + translateY + ") scale(" + scaleX + " " + scaleY + ")";

  return {
    ...next,
    transform: baseTransform ? transform + " " + baseTransform : transform,
  };
}

/** Preview rotation by adding a transform outside the element's existing rotation. */
export function rotationPreviewTransform(angle, centerX, centerY, baseTransform = "") {
  const rotate = "rotate(" + angle + " " + centerX + " " + centerY + ")";
  return baseTransform ? rotate + " " + baseTransform : rotate;
}
