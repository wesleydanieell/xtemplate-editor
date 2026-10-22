import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankTemplate } from '../src/core/blank-template.js';
import { validateTemplate } from '../src/core/validate-template.js';

test('default document has no elements or variables and is valid for XNotes',()=>{
 const blank=createBlankTemplate();
 assert.equal(blank.xtemplate,1);
 assert.equal(blank.name,'Untitled template');
 assert.deepEqual(blank.items,[]);
 assert.deepEqual(blank.params,{});
 assert.deepEqual(Object.keys(blank).sort(),['id','items','kind','name','params','xtemplate']);
 assert.equal(blank.kind,'page');
 assert.equal(validateTemplate(blank),true);
 assert.deepEqual(JSON.parse(JSON.stringify(blank,null,2)),blank);
});

test('new document metadata does not inject sample elements or predefined variables',()=>{
 const blank=createBlankTemplate({name:'My cover',id:'xtemplate.custom.cover',description:'Cover',tags:['cover'],license:'MIT'});
 assert.deepEqual(blank.items,[]);
 assert.deepEqual(blank.params,{});
 assert.deepEqual(blank.tags,['cover']);
 assert.equal(blank.license,'MIT');
 assert.equal(validateTemplate(blank),true);
});

test('fresh blank files do not share mutable params, items, or tag arrays',()=>{
 const first=createBlankTemplate({tags:['cover']}),second=createBlankTemplate({tags:['cover']});
 first.items.push({type:'rect'});first.params.color={type:'color',default:'#445566'};first.tags.push('new');
 assert.deepEqual(second.items,[]);
 assert.deepEqual(second.params,{});
 assert.deepEqual(second.tags,['cover']);
});

test('cover documents can be categorized without adding page elements',()=>{
 const cover=createBlankTemplate({name:'Cover',kind:'cover'});
 assert.equal(cover.kind,'cover');assert.deepEqual(cover.items,[]);assert.deepEqual(cover.params,{});
});

test('new page or cover serializes an explicit upstream-compatible kind',()=>{
 for(const kind of ['page','cover']){
  const template=createBlankTemplate({kind});
  assert.equal(template.kind,kind);
  assert.equal(JSON.parse(JSON.stringify(template)).kind,kind);
  assert.equal(validateTemplate(template),true);
 }
});
