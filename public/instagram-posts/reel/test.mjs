import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
import { fileURLToPath } from 'url'; import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--force-device-scale-factor=1','--disable-gpu']});
const page = await browser.newPage({ viewport:{width:1080,height:1920}, deviceScaleFactor:1 });
const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
await page.goto('file://'+path.join(__dirname,'reel.html'),{waitUntil:'load'});
await page.evaluate(()=>document.fonts.ready);
await page.waitForFunction(()=>window.__ready===true);
const stage = await page.$('#stage');
for (const [k,t] of Object.entries({a:2.9,b:3.5,d:9.6,e:13.4,f:18.6,g:24.6})){
  await page.evaluate(tt=>window.render(tt), t);
  await stage.screenshot({path:path.join(__dirname,'preview',k+'.png')});
}
console.log('errs:',errs.slice(0,5));
await browser.close();
