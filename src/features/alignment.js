/**
 * Page-relative alignment commands for XTemplate Studio.
 * The editor injects its document/geometry operations so this feature stays
 * independent from the rendering and UI implementation.
 */
const mm = value => `${Number(value.toFixed(3))}mm`;

export function createAlignmentTools(api) {
  function apply(action) {
    const ctx = api.getContext();
    if (!ctx) return;
    const { node, type, bounds: b, pageSize: [pageW, pageH], parent } = ctx;
    if (!b || !node) return;

    const moveTo = (x, y) => api.moveBy(node, x - b.x, y - b.y);
    const alignments = {
      'left': () => moveTo(0, b.y),
      'center-x': () => moveTo((pageW - b.w) / 2, b.y),
      'right': () => moveTo(pageW - b.w, b.y),
      'top': () => moveTo(b.x, 0),
      'center-y': () => moveTo(b.x, (pageH - b.h) / 2),
      'bottom': () => moveTo(b.x, pageH - b.h),
    };

    if (alignments[action]) {
      if (type === 'text') {
        const box = parent;
        const targetX = action === 'left' ? 0 : action === 'right' ? pageW - b.w : action === 'center-x' ? (pageW - b.w) / 2 : b.x;
        const targetY = action === 'top' ? 0 : action === 'bottom' ? pageH - b.h : action === 'center-y' ? (pageH - b.h) / 2 : b.y;
        node.x = mm(targetX - box.x);
        node.y = mm(targetY - box.y);
      } else {
        alignments[action]();
      }
      api.commit();
      return;
    }

    if (!['fill-x', 'fill-y'].includes(action)) return;
    const horizontal = action === 'fill-x';
    const targetStart = 0;
    const targetSize = horizontal ? pageW : pageH;
    const origin = horizontal ? parent.x : parent.y;
    const startKey = horizontal ? 'x' : 'y';
    const sizeKey = horizontal ? 'w' : 'h';

    if (['rect', 'group', 'path'].includes(type)) {
      node[startKey] = mm(targetStart - origin);
      node[sizeKey] = mm(targetSize);
    } else if (type === 'ellipse') {
      if (horizontal) {
        node.cx = mm(pageW / 2 - parent.x);
        node.rx = mm(pageW / 2);
      } else {
        node.cy = mm(pageH / 2 - parent.y);
        node.ry = mm(pageH / 2);
      }
    } else if (['circle', 'dot'].includes(type)) {
      if (horizontal) {
        node.cx = mm(pageW / 2 - parent.x);
        node.r = mm(pageW / 2);
      } else {
        node.cy = mm(pageH / 2 - parent.y);
        node.r = mm(pageH / 2);
      }
    } else if (type === 'hline' && horizontal) {
      node.x1 = mm(-parent.x);
      node.x2 = mm(pageW - parent.x);
    } else if (type === 'vline' && !horizontal) {
      node.y1 = mm(-parent.y);
      node.y2 = mm(pageH - parent.y);
    } else if (type === 'line') {
      const box = api.getParentBox();
      if (horizontal) {
        node.x1 = mm(-box.x);
        node.x2 = mm(pageW - box.x);
      } else {
        node.y1 = mm(-box.y);
        node.y2 = mm(pageH - box.y);
      }
    } else {
      api.toast(horizontal ? 'Este tipo de elemento não possui largura ajustável.' : 'Este tipo de elemento não possui altura ajustável.');
      return;
    }
    api.commit();
  }

  document.querySelectorAll('[data-align]').forEach(button => {
    button.addEventListener('click', () => apply(button.dataset.align));
  });
  return { apply };
}
