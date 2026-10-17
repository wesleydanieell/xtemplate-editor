import test from "node:test";
import assert from "node:assert/strict";
import { sharedEditableProperties, supportsEditableProperty, editablePropertyValue } from "../src/core/common-properties.js";

test("same sparse horizontal lines expose all supported coordinates and style",()=>{
 const keys=sharedEditableProperties([{type:"hline",y:"5mm"},{type:"hline",stroke:"ink"}]);
 for(const key of ["y","x1","x2","stroke","strokeWidth","opacity","dash","rotate"])assert(keys.includes(key),key);
 assert(!keys.includes("x")&&!keys.includes("y1")&&!keys.includes("period")&&!keys.includes("fill"));
 assert.equal(editablePropertyValue({type:"hline"},"x2"),"100%");
 assert.equal(editablePropertyValue({type:"hline"},"x1"),"0mm");
});
test("mixed types expose capabilities intersection, not explicit-key intersection",()=>{
 const keys=sharedEditableProperties([{type:"rect",stroke:"ink"},{type:"line",opacity:.7}]);
 assert(keys.includes("stroke")&&keys.includes("opacity")&&keys.includes("rotate"));
 assert(!keys.includes("x")&&!keys.includes("x1")&&!keys.includes("fillOpacity"));
});
test("same sparse repeat nodes expose optional repeat settings",()=>{
 const keys=sharedEditableProperties([{type:"repeat",children:[]},{type:"repeat",axis:"x",children:[]}]);
 for(const key of ["axis","period","count","fit","index","stagger","extend"])assert(keys.includes(key),key);
 assert.equal(editablePropertyValue({type:"repeat"},"axis"),"y");
});
test("hatch fields and group children remain type-safe",()=>{
 const hatch=sharedEditableProperties([{type:"hatch"},{type:"hatch",angle:25}]);
 assert(hatch.includes("angle")&&hatch.includes("offset"));
 assert(!hatch.includes("children")&&!hatch.includes("x1"));
 assert.deepEqual(sharedEditableProperties([{type:"group"},{type:"group",clip:true}]).includes("clip"),true);
 assert(!supportsEditableProperty('hline','fill'),'fill does not paint SVG line');
 assert(!supportsEditableProperty('dot','strokeWidth'),'dots have no visible stroke');
 assert(!supportsEditableProperty('text','strokeWidth'),'text strokes are disabled in preview');
  assert(!supportsEditableProperty("rect","period"));
 assert.equal(editablePropertyValue({type:"rect"},"period"),undefined);
});
test("invalid or empty nodes have no common editable properties",()=>{
 assert.deepEqual(sharedEditableProperties([]),[]);
 assert.deepEqual(sharedEditableProperties([{type:"hline"},null]),[]);
 assert.deepEqual(sharedEditableProperties([{type:"unknown"}]),[]);
});

test("shape capabilities include optional ellipse radii and path metadata",()=>{
 const ellipse=sharedEditableProperties([{type:'ellipse'},{type:'ellipse',ry:'10mm'}]);
 assert(ellipse.includes('rx')&&ellipse.includes('ry')&&ellipse.includes('cx'));
 assert.equal(editablePropertyValue({type:'ellipse'},'rx'),'15mm');
 assert.equal(editablePropertyValue({type:'ellipse'},'ry'),'8mm');
 const paths=sharedEditableProperties([{type:'path',d:'M0 0'},{type:'path'}]);
 assert(paths.includes('viewBox')&&paths.includes('aspect')&&paths.includes('d'));
 assert(!paths.includes('period'));
});
