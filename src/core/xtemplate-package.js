/** Official .xtemplate package: ZIP(template.json + images/*), no executable
 * payload or external fetches. ZIP stores and raw DEFLATE are supported. */
export const PACKAGE_LIMITS=Object.freeze({maxPackage:16*1024*1024,maxJson:1024*1024,maxPixels:8192,maxEntries:200});
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const u16=(v,o)=>v.getUint16(o,true),u32=(v,o)=>v.getUint32(o,true);
const safePath=path=>typeof path==='string'&&path.length>0&&path.length<300&&
 !path.startsWith('/')&&!path.includes('\\')&&!path.split('/').some(x=>!x||x==='.'||x==='..')&&
 !/[\x00-\x1f]/.test(path);
const formatMime=bytes=>{
 if(bytes.length>8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13)return 'image/png';
 if(bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.length>12&&decoderSoft(bytes.subarray(0,4))==='RIFF'&&decoderSoft(bytes.subarray(8,12))==='WEBP')return 'image/webp';
 return null;
};
const decoderSoft=bytes=>new TextDecoder().decode(bytes);
export function imageSources(doc){const result=new Set();const walk=nodes=>{for(const n of nodes||[]){if(n?.type==='image'){if(!safePath(n.src))throw Error('Invalid image src: '+String(n.src));result.add(n.src);}if(n?.type==='group'||n?.type==='repeat')walk(n.children);}};walk(doc.items);return result;}
export function imageFileType(bytes){return formatMime(bytes);}
export function validateImageAssets(doc,assets,{requireAssets=true}={}){
 const used=imageSources(doc);
 for(const name of used){const image=assets.get(name);if(!image&&requireAssets)throw Error('Missing image in package: '+name);if(image&&!formatMime(image))throw Error('Unsupported image data: '+name);}
 return used;
}
let crcTable;
function crc32(bytes){if(!crcTable){crcTable=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);crcTable[i]=c>>>0;}}let c=0xffffffff;for(const x of bytes)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
const put16=(v,o,n)=>v.setUint16(o,n,true),put32=(v,o,n)=>v.setUint32(o,n>>>0,true);
function join(parts){const len=parts.reduce((n,b)=>n+b.length,0);const out=new Uint8Array(len);let at=0;for(const b of parts){out.set(b,at);at+=b.length;}return out;}
function storedZip(entries){let offset=0;const locals=[],central=[];for(const [name,bytes] of entries){if(!safePath(name))throw Error('Invalid ZIP path: '+name);const path=encoder.encode(name),crc=crc32(bytes);
 const local=new Uint8Array(30+path.length+bytes.length),l=new DataView(local.buffer);put32(l,0,0x04034b50);put16(l,4,20);put16(l,6,0x800);put16(l,8,0);put32(l,14,crc);put32(l,18,bytes.length);put32(l,22,bytes.length);put16(l,26,path.length);local.set(path,30);local.set(bytes,30+path.length);locals.push(local);
 const entry=new Uint8Array(46+path.length),c=new DataView(entry.buffer);put32(c,0,0x02014b50);put16(c,4,20);put16(c,6,20);put16(c,8,0x800);put32(c,16,crc);put32(c,20,bytes.length);put32(c,24,bytes.length);put16(c,28,path.length);put32(c,42,offset);entry.set(path,46);central.push(entry);offset+=local.length;}
 const centralBytes=join(central),end=new Uint8Array(22),e=new DataView(end.buffer);put32(e,0,0x06054b50);put16(e,8,entries.length);put16(e,10,entries.length);put32(e,12,centralBytes.length);put32(e,16,offset);return join([...locals,centralBytes,end]);}
async function inflate(raw,limit=PACKAGE_LIMITS.maxPackage){
 if(typeof DecompressionStream==='undefined')throw Error('This browser does not support ZIP decompression');
 const reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
 const chunks=[];let total=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;
  total+=value.byteLength;if(total>limit)throw Error('ZIP entry exceeds decompression size limit');
  chunks.push(value);
 }}finally{await reader.cancel().catch(()=>{});}
 return join(chunks);
}
export async function readTemplate(bytes){const input=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(input.length>PACKAGE_LIMITS.maxPackage)throw Error('Package exceeds 16 MiB');
 const view=new DataView(input.buffer,input.byteOffset,input.byteLength);
 if(input.length<4||u32(view,0)!==0x04034b50){if(input.length>PACKAGE_LIMITS.maxJson)throw Error('Template JSON exceeds 1 MiB');return {document:JSON.parse(decoder.decode(input).replace(/^\ufeff/,'')),assets:new Map(),packaged:false};}
 let end=-1;for(let p=input.length-22;p>=Math.max(0,input.length-65557);p--)if(u32(view,p)===0x06054b50){end=p;break;}
 if(end<0)throw Error('Invalid ZIP central directory');
 const count=u16(view,end+10),centralSize=u32(view,end+12),centralAt=u32(view,end+16);
 if(count>PACKAGE_LIMITS.maxEntries||centralAt+centralSize>input.length)throw Error('Invalid or excessive ZIP entries');
 const entries=new Map();let at=centralAt,total=0;
 for(let i=0;i<count;i++){
  if(at+46>input.length||u32(view,at)!==0x02014b50)throw Error('Invalid ZIP entry header');
  const flag=u16(view,at+8),method=u16(view,at+10),crc=u32(view,at+16),compressed=u32(view,at+20),size=u32(view,at+24),nameLen=u16(view,at+28),extra=u16(view,at+30),comment=u16(view,at+32),start=u32(view,at+42);
  if(flag&1||![0,8].includes(method))throw Error('Unsupported encrypted or compressed ZIP entry');
  if(size>PACKAGE_LIMITS.maxPackage||(total+=size)>PACKAGE_LIMITS.maxPackage)throw Error('Decompressed ZIP exceeds 16 MiB');
  if(at+46+nameLen+extra+comment>input.length)throw Error('Invalid ZIP filename');
  const name=decoder.decode(input.subarray(at+46,at+46+nameLen));at+=46+nameLen+extra+comment;
  if(name.endsWith('/'))continue;
  if(!safePath(name)||entries.has(name))throw Error('Unsafe or duplicate ZIP entry: '+name);
  if(start+30>input.length||u32(view,start)!==0x04034b50)throw Error('Invalid ZIP local header');
  const dataAt=start+30+u16(view,start+26)+u16(view,start+28);
  if(dataAt+compressed>input.length)throw Error('Truncated ZIP payload');
  const raw=input.subarray(dataAt,dataAt+compressed);
  const content=method===0?raw.slice():await inflate(raw,size);
  if(content.length!==size||crc32(content)!==crc)throw Error('ZIP entry failed size or CRC check: '+name);
  entries.set(name,content);
 }
 const json=entries.get('template.json');if(!json)throw Error('ZIP missing template.json');if(json.length>PACKAGE_LIMITS.maxJson)throw Error('Template JSON exceeds 1 MiB');
 const document=JSON.parse(decoder.decode(json));const assets=new Map();
 for(const src of imageSources(document)){
  const data=entries.get(src);if(!data)throw Error('Image asset not found: '+src);
  if(!formatMime(data))throw Error('Unsupported image format: '+src);
  assets.set(src,data);
 }
 return {document,assets,packaged:true};
}
export function writeTemplate(doc,assets=new Map()){
 const json=encoder.encode(JSON.stringify(doc,null,2)+'\n');if(json.length>PACKAGE_LIMITS.maxJson)throw Error('Template JSON exceeds 1 MiB');
 const used=validateImageAssets(doc,assets);
 if(!used.size)return new Blob([json],{type:'application/json'});
 const entries=[['template.json',json],...([...used].sort().map(name=>[name,assets.get(name)]))];
 const result=storedZip(entries);if(result.length>PACKAGE_LIMITS.maxPackage)throw Error('Template package exceeds 16 MiB');return new Blob([result],{type:'application/zip'});
}
export function safeImagePath(name){return safePath(name);}
