/** Keep a page point under the cursor while the page scale and layout change. */
export function anchoredPan({ pan, anchor, oldRect, newRect, scale }) {
  if (!anchor || !oldRect || !newRect || !Number.isFinite(scale) || scale <= 0) {
    return { x: pan.x, y: pan.y };
  }
  return {
    x: pan.x + (anchor.x - oldRect.left) * (1 - scale) + (oldRect.left - newRect.left),
    y: pan.y + (anchor.y - oldRect.top) * (1 - scale) + (oldRect.top - newRect.top),
  };
}

export function nextZoomLevel(current, direction, levels = [25, 50, 75, 100, 125, 150, 200, 300]) {
  if (!levels.length) return current;
  const value = current === "fit" ? 100 : Number(current);
  let index = levels.findIndex(level => level >= value);
  if (index < 0) index = levels.length - 1;
  if (direction > 0 && levels[index] <= value && index < levels.length - 1) index++;
  else if (direction < 0 && levels[index] >= value && index > 0) index--;
  return String(levels[index]);
}
