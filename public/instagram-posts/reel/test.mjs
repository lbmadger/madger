import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
import { fileURLToPath } from 'url'; import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--force-device-scale-factor=1','--disable-gpu']});
const page = await browser.newPage({ viewport:{width:1080,height:1920}, deviceScaleFactor:1 });
await page.goto('file://'+path.join(__dirname,'reel.html'),{waitUntil:'load'});
await page.evaluate(()=>document.fonts.ready);
await page.waitForFunction(()=>window.__ready===true);
const stage = await page.$('#stage');
for (const [k,t] of Object.entries({c1:2.0,c2:9.6,c3:20.6,c4:28.0,c5:34.0})){
  await page.evaluate(tt=>window.render(tt), t);
  await stage.screenshot({path:path.join(__dirname,'preview',k+'.png')}); console.log('shot',k,t);
}
await browser.close();
