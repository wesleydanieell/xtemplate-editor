/** Normalize the Studio's historic, nonstandard node `name` field into the
 * official v1 schema extension namespace. `x-name` stays in the export and
 * never changes rendering in XNotes. Metadata on the root is untouched.
 * Unknown fields are left intact for schema validation to report faithfully. */
export function migrateLegacyLayerNames(document){
 const walk=items=>{
  for(const node of items||[]){
   if(!node||typeof node!=='object'||Array.isArray(node))continue;
   if(Object.hasOwn(node,'name')){
    if(!Object.hasOwn(node,'x-name'))node['x-name']=node.name;
    delete node.name;
   }
   if(Array.isArray(node.children))walk(node.children);
  }
 };
 walk(document?.items);
 return document;
}
