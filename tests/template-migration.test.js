import test from 'node:test';import assert from 'node:assert/strict';
import {migrateLegacyLayerNames} from '../src/core/template-migration.js';
import {validateTemplate} from '../src/core/validate-template.js';
test('legacy Studio layer labels become valid x- namespace extensions',()=>{
 const doc={xtemplate:1,name:'Document title',items:[{type:'group',name:'Cover group',children:[{type:'image',name:'Photo layer',src:'images/f.webp',fit:'cover'}]}]};
 assert.throws(()=>validateTemplate(doc),/Official .xtemplate/);
 assert.equal(migrateLegacyLayerNames(doc),doc);
 assert.equal(doc.name,'Document title','root template name is not a layer');
 assert.equal(doc.items[0]['x-name'],'Cover group');
 assert.equal(doc.items[0].children[0]['x-name'],'Photo layer');
 assert.equal(validateTemplate(doc),true);
});
test('existing x-name takes precedence and migration is idempotent',()=>{
 const doc={xtemplate:1,name:'X',items:[{type:'rect',name:'Legacy', 'x-name':'Current'}]};
 migrateLegacyLayerNames(doc);migrateLegacyLayerNames(doc);
 assert.equal(doc.items[0]['x-name'],'Current');
 assert.equal(Object.hasOwn(doc.items[0],'name'),false);
 assert.equal(validateTemplate(doc),true);
});
