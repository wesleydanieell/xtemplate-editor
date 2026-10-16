function nearestShift(edges, targets, tolerance) {
  let best = null;
  for (const edge of edges) {
    for (const target of targets) {
      const shift = target - edge;
      if (Math.abs(shift) > tolerance) continue;
      if (best === null || Math.abs(shift) < Math.abs(best.shift)) {
        best = { shift, guide: target };
      }
    }
  }
  return best;
}

/**
 * Snap the nearest of an object's start, centre, or end edges to guide targets.
 * Tolerances are expressed in document units by the caller, ideally derived from CSS pixels.
 */
export function calculateSnap(bounds, targetsX, targetsY, toleranceX, toleranceY = toleranceX) {
  const x = nearestShift([bounds.x, bounds.x + bounds.w / 2, bounds.x + bounds.w], targetsX, toleranceX);
  const y = nearestShift([bounds.y, bounds.y + bounds.h / 2, bounds.y + bounds.h], targetsY, toleranceY);
  return {
    dx: x?.shift ?? 0,
    dy: y?.shift ?? 0,
    guides: { x: x?.guide ?? null, y: y?.guide ?? null },
  };
}
