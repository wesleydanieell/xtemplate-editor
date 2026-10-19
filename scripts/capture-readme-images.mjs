/** Reproducible screenshots of real XTemplate Studio UI for docs.
 * Usage: node scripts/capture-readme-images.mjs
 * Requires the local editor running at http://127.0.0.1:8765/ and Chromium.
 * It never modifies user documents or interacts with GitHub. */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const root=resolve(fileURLToPath(new URL('..', import.meta.url)));
const output=resolve(root,'docs/images');
const candidates=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/usr/bin/brave-browser','/usr/bin/brave','/opt/google/chrome/chrome',...['chromium','chromium_headless_shell'].flatMap(kind=>{
  const base=resolve(homedir(),'.cache/ms-playwright');
  try{return readdirSync(base).filter(n=>n.startsWith(kind+'-')).map(n=>resolve(base,n,kind==='chromium'?'chrome-linux64/chrome':'chrome-linux/headless_shell'));}catch{return []}
})];
const executablePath=candidates.find(p=>p&&existsSync(p));
if(!executablePath)throw new Error('Chrome/Chromium not found; configure XTEMPLATE_BROWSER_PATH');
mkdirSync(output,{recursive:true});

const document={
  xtemplate:1,id:'xtemplate.demo.studio-cover',name:'Creative cover — Studio demo',
  description:'Screenshot fixture demonstrating actual .xtemplate canvas editing.',
  params:{accentColor:{type:'color',default:'#5ccbd9',label:'Accent color'},
    ribbonColor:{type:'color',default:'#ffb479',label:'Ribbon color'}},
  items:[
    {type:'rect',name:'Midnight background',x:'0mm',y:'0mm',w:'210mm',h:'297mm',fill:'#172840',stroke:'none'},
    {type:'ellipse',name:'Large teal ellipse',cx:'221mm',cy:'63mm',rx:'105mm',ry:'91mm',fill:'#2d6e84',stroke:'none'},
    {type:'ellipse',name:'Deep blue accent',cx:'218mm',cy:'78mm',rx:'72mm',ry:'74mm',fill:'#315eab',stroke:'none'},
    {type:'ellipse',name:'Corner spot',cx:'-20mm',cy:'296mm',rx:'108mm',ry:'82mm',fill:'#24516c',stroke:'none'},
    {type:'polygon',name:'Coral accent',points:[['119mm','0mm'],['210mm','0mm'],['210mm','20mm'],['135mm','56mm']],fill:'ribbonColor',stroke:'none'},
    {type:'path',name:'Organic wave',x:'12mm',y:'153mm',w:'183mm',h:'84mm',viewBox:[0,0,183,84],d:'M 0 58 C 38 -12 83 12 115 29 C 148 45 151 81 183 44',fill:'none',stroke:'accentColor',strokeWidth:'1.6mm'},
    {type:'text',name:'Eyebrow',x:'19mm',y:'41mm',text:'XNOTES  /  CREATIVE SERIES',size:'4mm',fill:'#a5d9ee'},
    {type:'text',name:'Title line 1',x:'19mm',y:'85mm',text:'YOUR NEXT',size:'13.4mm',fill:'#f4f8ff'},
    {type:'text',name:'Title line 2',x:'19mm',y:'104mm',text:'BIG IDEA',size:'13.4mm',fill:'#f4f8ff'},
    {type:'hline',name:'Separator',y:'123mm',x1:'19mm',x2:'107mm',stroke:'ribbonColor',strokeWidth:'1.2mm'},
    {type:'text',name:'Subtitle',x:'19mm',y:'136mm',text:'A SPACE TO CREATE AND EXPLORE',size:'3.9mm',fill:'#cdddf2'},
    {type:'text',name:'Footer',x:'19mm',y:'277mm',text:'STUDIO   /   001',size:'3.5mm',fill:'#a5d9ee'},
  ]
};

const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});
try{
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:880,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.STUDIO_URL||'http://127.0.0.1:8765/',{waitUntil:'networkidle0'});
  await page.$eval('#fileInput',(input,content)=>{
    const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(content)],'demo-cover.xtemplate',{type:'application/json'}));
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  },document);
  await page.waitForFunction(()=>document.querySelector('#docName')?.textContent?.includes('Creative cover'));
  // Leave the Structure layer selected to show the editing context.
  await page.$eval('.tree-item[data-path="items.4"]',el=>el.click());
  await new Promise(done=>setTimeout(done,2500)); // wait for the import toast to clear
  const overview=resolve(output,'studio-overview.png');
  await page.screenshot({path:overview});
  // SVG cubic handles and inspector in a second genuine UI state.
  await page.$eval('.tree-item[data-path="items.5"]',el=>el.click());
  const found=await page.$$eval('#contextualElementTools button',buttons=>buttons.map(x=>x.textContent));
  const buttonText=found.find(x=>/edit.*point|edit.*path|edit.*node/i.test(x));
  if(!buttonText)throw new Error('No SVG path editing button found: '+JSON.stringify(found));
  await page.$$eval('#contextualElementTools button',(buttons,label)=>buttons.find(x=>x.textContent===label)?.click(),buttonText);
  await page.waitForFunction(()=>document.querySelectorAll('#svg-path-overlay [data-svg-path-point]').length>=4);
  await page.screenshot({path:resolve(output,'pen-and-bezier.png')});
  // Variable panel with interactive HEX pickers and exported defaults.
  await page.click('[data-inspector="params"]');
  await page.$eval('.param-card',el=>el.open=true);
  await page.screenshot({path:resolve(output,'color-variables.png')});
  if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
  await page.close();
  for(const name of ['studio-overview','pen-and-bezier','color-variables']){
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',resolve(output,name+'.png'),'-c:v','libwebp','-q:v','82','-compression_level','6',resolve(output,name+'.webp')]);
    unlinkSync(resolve(output,name+'.png'));
  }
  console.log('Captured three live UI states in '+output+' (compressed WebP screenshots)');
}finally{await browser.close();}
