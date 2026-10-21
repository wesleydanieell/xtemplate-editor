/** Photoshop-style crop built entirely out of XNotes v1 native primitives:
 * group clip + an image scaled/moved inside that group. No proprietary crop
 * coordinates, rewritten bitmap, lost source pixels or external image links.
 */
export const isCropGroup=n=>n?.type==='group'&&n['x-studio-crop']===true&&n.clip===true&&n.children?.[0]?.type==='image';
const mm=n=>Number(n.toFixed(3))+'mm';
const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
export function cropCoverGeometry(frame,dimensions,position='center'){
 if(!dimensions?.width||!dimensions?.height||!(frame.w>0&&frame.h>0))throw Error('Image dimensions are needed to crop');
 const scale=Math.max(frame.w/dimensions.width,frame.h/dimensions.height),w=dimensions.width*scale,h=dimensions.height*scale;
 const horizontal=position.includes('left')?0:position.includes('right')?1:.5;
 const vertical=position.includes('top')?0:position.includes('bottom')?1:.5;
 return{x:-(w-frame.w)*horizontal,y:-(h-frame.h)*vertical,w,h};
}
export function createNativeCropGroup(node,frame,dimensions){
 const {x,y,w,h}=cropCoverGeometry(frame,dimensions,node.position||'center');
 const image={...node,x:mm(x),y:mm(y),w:mm(w),h:mm(h),fit:'stretch'};
 delete image.position;delete image['x-name'];
 const group={type:'group',clip:true,'x-studio-crop':true,x:node.x??'0mm',y:node.y??'0mm',w:node.w??'100%',h:node.h??'100%',children:[image]};
 if(node['x-name'])group['x-name']=node['x-name'];
 return group;
}
export function constrainCrop(image,frame){
 let x=parseFloat(image.x)||0,y=parseFloat(image.y)||0,w=parseFloat(image.w)||0,h=parseFloat(image.h)||0;
 if(frame.w<=0||frame.h<=0||w<=0||h<=0)return image;
 // The picture always fully covers its crop frame. Enlarge uniformly only
 // when the user makes the frame larger than its content.
 const scale=Math.max(1,frame.w/w,frame.h/h);
 if(scale>1){w*=scale;h*=scale;x*=scale;y*=scale;}
 x=clamp(x,frame.w-w,0);y=clamp(y,frame.h-h,0);
 image.x=mm(x);image.y=mm(y);image.w=mm(w);image.h=mm(h);
 return image;
}
export function moveCropPicture(image,frame,dx,dy){
 image.x=mm((parseFloat(image.x)||0)+dx);image.y=mm((parseFloat(image.y)||0)+dy);
 return constrainCrop(image,frame);
}
export function zoomCropPicture(image,frame,factor){
 const x=parseFloat(image.x)||0,y=parseFloat(image.y)||0,w=parseFloat(image.w)||0,h=parseFloat(image.h)||0;
 const zoom=clamp(Number(factor)||1,.2,10);
 // Zoom about the visible frame center, not the image's top-left corner.
 const centerX=frame.w/2,centerY=frame.h/2;
 image.x=mm(centerX+(x-centerX)*zoom);image.y=mm(centerY+(y-centerY)*zoom);
 image.w=mm(w*zoom);image.h=mm(h*zoom);
 return constrainCrop(image,frame);
}
