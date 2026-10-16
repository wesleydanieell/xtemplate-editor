const EPSILON = 1e-7;

/**
 * Calculate repeat-cell positions in one dimension. Indices intentionally follow the Android
 * TemplateEval layout rules: when count accompanies a period, it is an exact upper bound on
 * generated indices (0..count-1), even if some cells extend beyond the parent box.
 */
export function repeatPositions(start, size, period, count, fit, limit = 500, extended = null, shift = 0) {
  if (period == null) {
    const total = Math.floor(Number(count));
    if (!Number.isFinite(total) || total < 1 || total > limit) return [];
    const cellSize = size / total;
    return Array.from({ length: total }, (_, index) => ({
      index,
      pos: start + shift + index * cellSize,
      size: cellSize,
    }));
  }

  if (!Number.isFinite(period) || period < 0.5) return [];
  if (count != null && (!Number.isFinite(Number(count)) || Number(count) < 1 || Number(count) > limit)) return [];

  let total = Math.floor(size / period + EPSILON);
  if (count != null) total = Math.min(total, Math.floor(Number(count)));

  if (fit === "round") {
    total = count == null ? Math.max(1, Math.round(size / period)) : Math.floor(Number(count));
    if (total < 1 || total > limit) return [];
    const cellSize = size / total;
    return Array.from({ length: total }, (_, index) => ({
      index,
      pos: start + shift + index * cellSize,
      size: cellSize,
    }));
  }

  if (fit === "space") {
    if (total < 1) return [];
    if (total === 1) return [{ index: 0, pos: start + shift + (size - period) / 2, size: period }];
    const gap = (size - total * period) / (total - 1);
    return Array.from({ length: total }, (_, index) => ({
      index,
      pos: start + shift + index * (period + gap),
      size: period,
    }));
  }

  if (fit === "center") {
    if (total < 1) return [];
    const offset = (size - total * period) / 2;
    return Array.from({ length: total }, (_, index) => ({
      index,
      pos: start + shift + offset + index * period,
      size: period,
    }));
  }

  let first = count == null ? Math.floor(-shift / period + EPSILON) : 0;
  let last = count == null
    ? Math.ceil((size - shift) / period - EPSILON) - 1
    : Math.floor(Number(count)) - 1;

  // Extended repeats fill the viewport, including cells whose origin is before the local box.
  if (extended) {
    first = Math.floor((extended.lo - start - shift) / period + EPSILON);
    last = Math.ceil((extended.hi - start - shift) / period - EPSILON) - 1;
  }

  const length = last - first + 1;
  if (length < 1 || length > limit) return [];
  return Array.from({ length }, (_, index) => {
    const cellIndex = first + index;
    return { index: cellIndex, pos: start + shift + cellIndex * period, size: period };
  });
}
