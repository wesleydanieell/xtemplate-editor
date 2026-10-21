import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import {writeTemplate,readTemplate} from '../src/core/xtemplate-package.js';
import {validateTemplate} from '../src/core/validate-template.js';
import officialValidator from '../src/core/official-schema-validator.js';
import {readdir} from 'node:fs/promises';
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

test('runtime validator matches official schema for all bundled JSON examples and malformed shapes',async()=>{
 const folder=new URL('../examples/',import.meta.url);
 const samples=await readdir(folder);
 for(const name of samples.filter(n=>n.endsWith('.xtemplate'))){
  const buf=await readFile(new URL(name,folder));
  const template=(await readTemplate(buf)).document;
  const expected=conforms(template);
  const actual=officialValidator(template);
  assert.equal(actual,expected,name);
  assert.equal(validateTemplate(template),true,name);
 }
 for(const invalid of [
  {xtemplate:2,name:'Version two',items:[]},
  {xtemplate:1,name:'No source',items:[{type:'image',fit:'contain'}]},
  {xtemplate:1,name:'Bad fit',items:[{type:'image',src:'images/a.webp',fit:'arbitrary'}]},
  {xtemplate:1,name:'Wrong params',items:[],params:{gap:{type:'length',default:'bad-units'}}},
  {xtemplate:1,name:'Unknown property',items:[{type:'rect',invisibleFlag:true}]},
 ]){
  assert.equal(conforms(invalid),false);
  assert.equal(officialValidator(invalid),false);
  assert.throws(()=>validateTemplate(invalid),/Official .xtemplate|Image src|Invalid image fit/);
 }
});

test('image-backed bundled examples round-trip with identical embedded image bytes',async()=>{
 for(const name of ['cover-aurora-atlas.xtemplate','cover-field-notes.xtemplate','study-watermark.xtemplate']){
  const data=await readFile(new URL('../examples/'+name,import.meta.url));
  const opened=await readTemplate(data);
  assert.equal(opened.packaged,true);
  assert.equal(opened.assets.size,1);
  assert.equal(validateTemplate(opened.document),true);
  const exported=await readTemplate(await writeTemplate(opened.document,opened.assets).arrayBuffer());
  assert.deepEqual(exported.document,opened.document);
  for(const [src,bytes] of opened.assets)
   assert.deepEqual(exported.assets.get(src),bytes,`${name} changed ${src}`);
 }
});
