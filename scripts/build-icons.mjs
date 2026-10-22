/** Copy only the icons we ship; no runtime CDN, fonts, or Lucide dependency. */
import {readFile,writeFile} from 'node:fs/promises';
const names=['panel-left','panel-right','undo-2','redo-2','download','file-plus-2','folder-open','save','layers','layout-template','plus','chevron-down','chevron-right','type','bold','italic','image','square','circle','orbit','pen-tool','spline','pentagon','chart-line','minus','grip','grid-3x3','rows-3','copy','scissors','clipboard','trash-2','arrow-up','arrow-down','group','repeat-2','move','maximize-2','palette','settings-2','sliders-horizontal','align-left','align-center','align-right','align-vertical-space-between','scan','crop','check','x','rotate-cw','eye','eye-off','lock','lock-open','file-code-2','columns-2','search','info','mouse-pointer-2','sparkles','zoom-in','zoom-out','file-text','wand-sparkles','dot','list-tree','sliders-vertical','book-open','panel-top','layout-grid','align-start-vertical','align-center-vertical','align-end-vertical','align-start-horizontal','align-center-horizontal','align-end-horizontal','paintbrush','baseline','whole-word','chevrons-up-down','filter','corner-down-right','shapes'];
const entries=[];
for(const name of names){
 const src=await readFile(new URL('../node_modules/lucide-static/icons/'+name+'.svg',import.meta.url),'utf8');
 const match=src.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
 if(!match)throw Error('Invalid icon '+name);
 entries.push([name,match[1].trim().replace(/\n\s*/g,'')]);
}
const out='// Generated from lucide-static (ISC license) by npm run icons:build.\n// SVG path-only content, no remote dependencies.\nexport const iconPaths='+JSON.stringify(Object.fromEntries(entries),null,1)+';\n';
await writeFile(new URL('../src/ui/icon-data.js',import.meta.url),out);
console.log(`Built ${entries.length} curated Lucide icons`);
