import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = 'file://' + path.join(__dirname, 'reel.html');
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--force-device-scale-factor=1','--disable-gpu']});
const page = await browser.newPage({ viewport:{width:1080,height:1920}, deviceScaleFactor:1 });
await page.goto(htmlPath,{waitUntil:'load'});
await page.evaluate(()=>document.fonts.ready);
await page.waitForFunction(()=>window.__ready===true);
const stage = await page.$('#stage');
const shots = {s1:1.3, s2:4.6, s3:9.2, s4:11.6, s5:13.6};
for (const [k,t] of Object.entries(shots)){
  await page.evaluate(tt=>window.render(tt), t);
  await stage.screenshot({path:path.join(__dirname,'preview',k+'.png')});
  console.log('shot',k,t);
}
await browser.close();
