import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import {writeTemplate,readTemplate} from '../src/core/xtemplate-package.js';
const schema=JSON.parse(await readFile(new URL('../docs/spec/xtemplate.schema.json',import.meta.url),'utf8'));
const ajv=new Ajv2020({strict:false,allErrors:true});const conforms=ajv.compile(schema);
test('native image cover using package agrees with official schema',async()=>{
 const template={xtemplate:1,kind:'cover',name:'Header footer and watermark',params:{faded:{type:'number',default:.25,min:0,max:1}},items:[
  {type:'image',src:'images/header.webp',x:'0mm',y:'0mm',w:'100%',h:'25mm',fit:'contain',position:'top'},
  {type:'image',src:'images/header.webp',x:'0mm',y:'80%',w:'100%',h:'20%',fit:'cover',position:'bottom'},
  {type:'image',src:'images/header.webp',x:'0mm',y:'0mm',w:'100%',h:'100%',fit:'cover',opacity:'faded'}]};
 assert(conforms(template),JSON.stringify(conforms.errors));
 const image=new Uint8Array(await readFile(new URL('../docs/images/studio-overview.webp',import.meta.url)));
 const decoded=await readTemplate(await writeTemplate(template,new Map([['images/header.webp',image]])).arrayBuffer());
 assert.equal(decoded.packaged,true);assert(conforms(decoded.document),JSON.stringify(conforms.errors));
});
test('official schema flags unsupported image fit or unsafe paths',()=>{
 for(const item of [{type:'image',src:'../bad.png'},{type:'image',src:'images/ok.png',fit:'overfill'}]){
  assert.equal(conforms({xtemplate:1,name:'Example',items:[item]}),false);
 }
});
