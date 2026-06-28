import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = 'file://' + path.join(__dirname, 'reel.html');
const framesDir = path.join(__dirname, 'frames');

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-gpu']
});
const page = await browser.newPage({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1
});
await page.goto(htmlPath, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => window.__ready === true);

const FPS = await page.evaluate(() => window.FPS);
const DUR = await page.evaluate(() => window.DURATION);
const total = Math.round(FPS * DUR);
console.log(`Rendering ${total} frames @ ${FPS}fps (${DUR}s)`);

const stage = await page.$('#stage');
for (let f = 0; f < total; f++) {
  const t = f / FPS;
  await page.evaluate((tt) => window.render(tt), t);
  const name = String(f).padStart(5, '0') + '.png';
  await stage.screenshot({ path: path.join(framesDir, name) });
  if (f % 30 === 0) console.log(`  frame ${f}/${total}`);
}
console.log('Done capturing.');
await browser.close();
