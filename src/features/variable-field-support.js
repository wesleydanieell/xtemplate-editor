/** Official .xtemplate v1 completion affordances.
 * Classify only fields that accept numeric expressions, colour tokens, or
 * interpolation. Types, asset paths, SVG path commands and JSON-only shapes
 * must never receive a suggestion that would invalidate the exported file.
 */
export const NUMERIC_EXPRESSION_KEYS = new Set([
  'x','y','w','h','x1','x2','y1','y2','cx','cy','r','rx','ry',
  'strokeWidth','size','inset','period','count','stagger','angle','offset',
  'opacity','rotate','select',
]);
export const COLOR_TOKEN_KEYS = new Set(['stroke','fill']);
const KNOWN_IDS = {
  elementX:'x',elementY:'y',elementW:'w',elementH:'h',
  elementStroke:'stroke',elementFill:'fill',elementStrokeWidth:'strokeWidth',
  elementText:'text',
};
export function variableFieldKind({id='',property='',type='text',editable=false,disabled=false,readOnly=false,insideInspector=false}={}){
 if(!insideInspector||disabled||readOnly||!editable||!['text','textarea'].includes(type))return null;
 const key=property||KNOWN_IDS[id];
 if(COLOR_TOKEN_KEYS.has(key))return 'color';
 if(key==='text')return 'text';
 if(NUMERIC_EXPRESSION_KEYS.has(key))return 'numeric';
 return null;
}
