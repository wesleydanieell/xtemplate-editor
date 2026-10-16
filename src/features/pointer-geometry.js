/**
 * Convert a viewport pointer to document coordinates.
 *
 * The supplied SVG transform handles CSS zoom, centring and canvas panning.
 * The rectangle fallback keeps this helper usable in older browsers and tests.
 */
export function screenToDocumentPoint({
  clientX,
  clientY,
  rect,
  pageWidth,
  pageHeight,
  toLocal,
}) {
  if (typeof toLocal === "function") {
    try {
      const local = toLocal(clientX, clientY);
      if (Number.isFinite(local?.x) && Number.isFinite(local?.y)) {
        return { x: local.x, y: local.y };
      }
    } catch {
      // Fall back to the viewBox/rect relationship if an SVG transform is unavailable.
    }
  }

  const width = Math.max(1, Number(rect?.width) || 0);
  const height = Math.max(1, Number(rect?.height) || 0);
  return {
    x: (clientX - (Number(rect?.left) || 0)) * pageWidth / width,
    y: (clientY - (Number(rect?.top) || 0)) * pageHeight / height,
  };
}
