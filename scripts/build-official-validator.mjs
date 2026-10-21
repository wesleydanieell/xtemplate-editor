/** Compile the pinned official xtemplate v1 JSON Schema into standalone ESM.
 * Browser/desktop runtime has no AJV or network dependency. */
import {readFile,writeFile} from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
const schema=JSON.parse(await readFile(new URL('../docs/spec/xtemplate.schema.json',import.meta.url),'utf8'));
const ajv=new Ajv2020({strict:false,allErrors:false,code:{source:true,esm:true}});
const validate=ajv.compile(schema);
// The only AJV runtime helper needed here counts Unicode code points in strings.
// Inline it so the portable browser build does not import Node/CommonJS.
const generated=standaloneCode(ajv,validate);
const helper='require("ajv/dist/runtime/ucs2length").default';
const imports=[...generated.matchAll(/require\("([^"]+)"\)/g)].map(match=>match[1]);
if(imports.some(name=>name!=='ajv/dist/runtime/ucs2length'))throw Error('Unexpected AJV runtime dependencies: '+imports.join(', '));
const output='// Generated from docs/spec/xtemplate.schema.json using `npm run schema:build`. Do not edit manually.\n'+generated.replaceAll(helper,'(str => [...str].length)')+'\n';
await writeFile(new URL('../src/core/official-schema-validator.js',import.meta.url),output);
console.log('Built offline official .xtemplate schema validator ('+output.length+' bytes)');
