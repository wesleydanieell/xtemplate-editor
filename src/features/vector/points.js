/** XNotes Poly.points: [[x,y], ...] with numbers or expression strings; legacy numeric string. */
export function readPointPairs(value) {
  if (typeof value === 'string') {
    const tokens=value.trim().split(/[\s,]+/).filter(Boolean);
    if(tokens.length<4||tokens.length%2||tokens.some(v=>!Number.isFinite(Number(v))))throw new Error('Invalid numeric point list');
    return Array.from({length:tokens.length/2},(_,i)=>[Number(tokens[2*i]),Number(tokens[2*i+1])]);
  }
  if(!Array.isArray(value)||value.length<2||value.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='string'&&typeof v!=='number')))
    throw new Error('XNotes points require at least two coordinate pairs');
  return value.map(p=>p.slice());
}
export function requiresBake(value) {
  return typeof value === 'string'&&!Number.isFinite(Number(value))&&!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:mm|cm|in|pt)$/.test(value.trim());
}
export function pointValue(value,axis,evalCoord){return evalCoord(value,axis);}
export function replacePointCoordinate(points,index,axis,newValue) {
  const pairs=readPointPairs(points);
  if(index<0||index>=pairs.length||![0,1].includes(axis)||!Number.isFinite(newValue))throw new RangeError('Invalid vertex coordinate');
  pairs[index][axis]=`${Number(newValue.toFixed(3))}mm`;
  return pairs;
}
export function addPoint(points,index,pair) {
  const pairs=readPointPairs(points);
  if(index<0||index>pairs.length||!Array.isArray(pair)||pair.length!==2)throw new RangeError('Invalid insert');
  pairs.splice(index,0,pair.slice());return pairs;
}
export function removePoint(points,index,closed) {
  const pairs=readPointPairs(points),minimum=closed?3:2;
  if(pairs.length<=minimum)throw new RangeError(`A ${closed?'polygon':'polyline'} requires ${minimum} points`);
  if(index<0||index>=pairs.length)throw new RangeError('Invalid vertex');
  pairs.splice(index,1);return pairs;
}
export function reversePoints(points){return readPointPairs(points).reverse();}
export function midpoint(a,b){return [(a[0]+b[0])/2,(a[1]+b[1])/2];}
export function distributePoints(pairs,axis,evalCoord){
  const result=readPointPairs(pairs);
  if(result.length<3)return result;
  const first=evalCoord(result[0][axis],axis?'y':'x'),last=evalCoord(result.at(-1)[axis],axis?'y':'x');
  result.forEach((p,i)=>{if(i>0&&i<result.length-1)p[axis]=`${Number((first+(last-first)*i/(result.length-1)).toFixed(3))}mm`;});
  return result;
}
export function alignPoints(pairs,indices,axis,value){
  const result=readPointPairs(pairs);
  for(const index of indices)if(result[index])result[index][axis]=`${Number(value.toFixed(3))}mm`;
  return result;
}
/** Use document mm space, never screen pixel deltas, for persistent model coordinates. */
export function positionWithinParent(documentPoint,parentBox){return {x:documentPoint.x-parentBox.x,y:documentPoint.y-parentBox.y};}
