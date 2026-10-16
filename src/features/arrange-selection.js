/** Compute non-destructive alignment/distribution deltas for multiple element bounds. */
export function arrangeBounds(items, action) {
  if (!Array.isArray(items) || items.length < 2 || items.some(item => !item?.bounds || !item.path)) return null;
  const entries = items.map(item => ({ path: item.path, bounds: item.bounds }));
  const result = new Map(entries.map(item => [item.path.join("."), { dx: 0, dy: 0 }]));
  const xs = entries.map(item => item.bounds.x);
  const ys = entries.map(item => item.bounds.y);
  const right = entries.map(item => item.bounds.x + item.bounds.w);
  const bottom = entries.map(item => item.bounds.y + item.bounds.h);
  const minX = Math.min(...xs), maxRight = Math.max(...right);
  const minY = Math.min(...ys), maxBottom = Math.max(...bottom);
  const set = (item, dx, dy) => result.set(item.path.join("."), { dx, dy });

  if (["left", "center-x", "right"].includes(action)) {
    for (const item of entries) {
      const b = item.bounds;
      const target = action === "left" ? minX : action === "right" ? maxRight - b.w : (minX + maxRight - b.w) / 2;
      set(item, target - b.x, 0);
    }
    return result;
  }
  if (["top", "center-y", "bottom"].includes(action)) {
    for (const item of entries) {
      const b = item.bounds;
      const target = action === "top" ? minY : action === "bottom" ? maxBottom - b.h : (minY + maxBottom - b.h) / 2;
      set(item, 0, target - b.y);
    }
    return result;
  }
  if (["distribute-x", "distribute-y"].includes(action)) {
    const horizontal = action === "distribute-x";
    const ordered = entries.slice().sort((a, b) => horizontal ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y);
    const start = horizontal ? ordered[0].bounds.x : ordered[0].bounds.y;
    const endItem = ordered.at(-1).bounds;
    const end = horizontal ? endItem.x + endItem.w : endItem.y + endItem.h;
    const occupied = ordered.reduce((sum, item) => sum + (horizontal ? item.bounds.w : item.bounds.h), 0);
    const gap = (end - start - occupied) / (ordered.length - 1);
    let cursor = start;
    for (const item of ordered) {
      const b = item.bounds, current = horizontal ? b.x : b.y, size = horizontal ? b.w : b.h;
      set(item, horizontal ? cursor - current : 0, horizontal ? 0 : cursor - current);
      cursor += size + gap;
    }
    return result;
  }
  return null;
}
