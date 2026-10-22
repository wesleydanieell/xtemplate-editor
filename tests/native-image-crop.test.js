import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeCropGroup,isCropGroup,cropCoverGeometry,constrainCrop,moveCropPicture,zoomCropPicture} from '../src/features/native-image-crop.js';
import {validateTemplate} from '../src/core/validate-template.js';
const frame={w:100,h:80};
test('native clip wrapper initially matches cover with focal position',()=>{
 const image={type:'image',src:'images/p.webp',x:'15mm',y:'20mm',w:'100mm',h:'80mm',fit:'cover',position:'right',opacity:.55,'x-name':'Photo'};
 const group=createNativeCropGroup(image,frame,{width:300,height:150});
 assert(isCropGroup(group));assert.equal(group['x-name'],'Photo');assert.equal(group.children[0].src,'images/p.webp');
 assert.equal(group.children[0].opacity,.55);assert.equal(group.children[0].x,'-60mm');assert.equal(group.children[0].w,'160mm');
 assert.equal(validateTemplate({xtemplate:1,name:'Crop',items:[group]}),true);
});
test('pan stays in the frame while preserving width/height and bytes',()=>{
 const image={x:'-20mm',y:'0mm',w:'160mm',h:'80mm'};
 moveCropPicture(image,frame,15,30);assert.equal(image.x,'-5mm');assert.equal(image.y,'0mm');
 moveCropPicture(image,frame,-100,-20);assert.equal(image.x,'-60mm');assert.equal(image.y,'0mm');
});
test('zoom anchors to frame center and never leaves blank canvas',()=>{
 const image={x:'0mm',y:'0mm',w:'100mm',h:'80mm'};
 zoomCropPicture(image,frame,1.5);assert.equal(image.w,'150mm');assert.equal(image.h,'120mm');
 assert.equal(image.x,'-25mm');assert.equal(image.y,'-20mm');
 zoomCropPicture(image,frame,.3);
 assert(parseFloat(image.w)>=100);assert(parseFloat(image.h)>=80);
});
test('larger crop frames automatically enlarge the photo to cover',()=>{
 const image={x:'-20mm',y:'-10mm',w:'120mm',h:'90mm'};
 constrainCrop(image,{w:200,h:150});assert(parseFloat(image.w)>=200);assert(parseFloat(image.h)>=150);
});
