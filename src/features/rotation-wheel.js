/** Rotation dial geometry. Zero is at 12 o'clock, positive angles clockwise. */
export function rotationFromPointer(clientX,clientY,centerX,centerY,increment=1){
 if(![clientX,clientY,centerX,centerY].every(Number.isFinite))return null;
 const dx=clientX-centerX,dy=clientY-centerY;
 if(Math.hypot(dx,dy)<3)return null;
 const degrees=(Math.atan2(dy,dx)*180/Math.PI+90+540)%360-180;
 const step=Number.isFinite(increment)&&increment>0?increment:1;
 return Number((Math.round(degrees/step)*step).toFixed(3));
}
export function normalizeDialAngle(angle){
 if(!Number.isFinite(Number(angle)))return 0;
 return ((Number(angle)+180)%360+360)%360-180;
}
