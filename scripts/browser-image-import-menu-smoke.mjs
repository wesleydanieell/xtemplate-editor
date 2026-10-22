import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {resolve,extname,sep} from 'node:path';
import {readdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{
 try{
  const file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html');
  if(!file.startsWith(root+sep))throw Error('path');
  const body=await readFile(file);
  res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base=resolve(homedir(),'.cache/ms-playwright');
const executablePath=[process.env.XTEMPLATE_BROWSER_PATH,'/usr/bin/chromium',...(existsSync(base)?readdirSync(base):[]).filter(x=>x.startsWith('chromium-')).map(x=>resolve(base,x,'chrome-linux64/chrome'))].find(x=>x&&existsSync(x));
assert(executablePath);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
 assert.equal(await page.$('#canvasAddImage'),null,'image import removed from canvas toolbar');
 assert.equal(await page.$('#insertMenu #insertImageBtn'),null,'image import removed from Insert menu');
 await page.click('#fileMenuToggle');
 assert.equal(await page.$eval('#fileMenu #insertImageBtn',x=>x.textContent.includes('Ctrl+I')),true);
 const fileMenuChooser=page.waitForFileChooser();
 await page.click('#insertImageBtn');
 const chooser=await fileMenuChooser;
 assert(chooser,'File menu launches image picker');
 const hotkeyChooser=page.waitForFileChooser();
 await page.keyboard.down('Control');await page.keyboard.press('i');await page.keyboard.up('Control');
 const secondChooser=await hotkeyChooser;
 assert(secondChooser,'Ctrl+I launches image picker');
 console.log('PASS File > Import image and Ctrl+I open image file chooser');
 await page.close();
}finally{await browser.close();server.close();}
