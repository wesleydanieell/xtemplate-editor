import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {readTemplate,writeTemplate,validateImageAssets,imageSources,PACKAGE_LIMITS} from '../src/core/xtemplate-package.js';
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,11,73,68,65,84,120,156,99,96,0,2,0,0,5,0,1,165,245,100,64,0,0,0,0,73,69,78,68,174,66,96,130]);
const simple={xtemplate:1,name:'Cover',kind:'cover',items:[{type:'image',src:'images/photo.png',x:'3mm',y:'4mm',w:'100%',h:'100%',fit:'cover',position:'top'}]};
test('simple documents stay plain JSON (not ZIP)',async()=>{
 const doc={xtemplate:1,name:'Grid',items:[{type:'rect',fill:'#fafafa'}]};const output=writeTemplate(doc);assert.equal(output.type,'application/json');
 const parsed=await readTemplate(await output.arrayBuffer());assert.deepEqual(parsed.document,doc);assert.equal(parsed.packaged,false);
});
test('native image packages round-trip without mutating image bytes',async()=>{
 const assets=new Map([['images/photo.png',png]]);const packageFile=writeTemplate(simple,assets);
 assert.equal(packageFile.type,'application/zip');const buffer=new Uint8Array(await packageFile.arrayBuffer());assert.equal(buffer[0],80);assert.equal(buffer[1],75);
 const opened=await readTemplate(buffer);assert.equal(opened.packaged,true);assert.deepEqual(opened.document,simple);
 assert.deepEqual(opened.assets.get('images/photo.png'),png);
 const second=await readTemplate(await writeTemplate(opened.document,opened.assets).arrayBuffer());assert.deepEqual(second.assets.get('images/photo.png'),png);
});
test('official ZIP conventions: raw DEFLATE for JSON and images',async()=>{
 const input=await readFile(new URL('./fixtures/deflated-image.xtemplate',import.meta.url));
 const opened=await readTemplate(input);
 assert.equal(opened.packaged,true);assert.equal(opened.document.kind,'cover');
 assert.equal(opened.document.items[0].src,'images/tiny.png');assert.equal(opened.assets.size,1);
 const output=await readTemplate(await writeTemplate(opened.document,opened.assets).arrayBuffer());
 assert.deepEqual(output.document,opened.document);
 assert.deepEqual(output.assets.get('images/tiny.png'),opened.assets.get('images/tiny.png'));
});
test('path traversal, absent sources, invalid content and oversized JSON fail closed',async()=>{
 assert.throws(()=>imageSources({items:[{type:'image',src:'../private.png'}]}),/Invalid image src/);
 assert.throws(()=>writeTemplate(simple),/Missing image/);
 assert.throws(()=>validateImageAssets(simple,new Map([['images/photo.png',new Uint8Array([1,2,3])]])),/Unsupported image data/);
 assert.throws(()=>writeTemplate({xtemplate:1,name:'A'.repeat(PACKAGE_LIMITS.maxJson),items:[]}),/exceeds 1 MiB/);
});
