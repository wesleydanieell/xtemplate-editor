/** SVG-compatible 2D affine matrices. Points are column vectors: A * B applies B first. */
export const identity = () => [1, 0, 0, 1, 0, 0];
export const translate = (x, y) => [1, 0, 0, 1, x, y];
export const scale = (x, y = x) => [x, 0, 0, y, 0, 0];
export const rotate = degrees => {
  const angle = degrees * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return [cos, sin, -sin, cos, 0, 0];
};
export function multiply(a, b) {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
    a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
    a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}
export function inverse(m) {
  const det = m[0]*m[3]-m[1]*m[2];
  if (!Number.isFinite(det) || Math.abs(det)<1e-12) throw new RangeError('Singular 2D transform');
  return [m[3]/det, -m[1]/det, -m[2]/det, m[0]/det,
    (m[2]*m[5]-m[3]*m[4])/det, (m[1]*m[4]-m[0]*m[5])/det];
}
export const applyPoint = (m,p) => ({x:m[0]*p.x+m[2]*p.y+m[4], y:m[1]*p.x+m[3]*p.y+m[5]});
export const around = (matrix,cx,cy) => multiply(multiply(translate(cx,cy),matrix),translate(-cx,-cy));
export const fromDOM = m => [m.a,m.b,m.c,m.d,m.e,m.f];
export function transformBounds(matrix,bounds) {
  const points=[{x:bounds.x,y:bounds.y},{x:bounds.x+bounds.w,y:bounds.y},
    {x:bounds.x,y:bounds.y+bounds.h},{x:bounds.x+bounds.w,y:bounds.y+bounds.h}].map(p=>applyPoint(matrix,p));
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
}
export const toSVG = m => `matrix(${m.join(' ')})`;
