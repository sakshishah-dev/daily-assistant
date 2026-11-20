// Draws the app icon (a bookmark on green) and saves PNG sizes using the Chromium that Playwright installs.
// Run once: node scripts/make-icons.mjs   (the PNG files are committed, so this is not part of the build)
import { chromium } from 'playwright';

const svg = (pad, radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="#2d6a4f"/>
  <g transform="translate(256 256) scale(${(15.6 * pad).toFixed(2)}) translate(-12 -12)" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
  </g>
</svg>`;

const jobs = [
  { file: 'icon-192.png', size: 192, pad: 1.0, radius: 96 },
  { file: 'icon-512.png', size: 512, pad: 1.0, radius: 112 },
  { file: 'icon-maskable-512.png', size: 512, pad: 0.7, radius: 0 }, // full bleed, symbol inside the safe zone
  { file: 'apple-touch-icon.png', size: 180, pad: 1.0, radius: 0 },   // iOS rounds the corners itself
  { file: 'favicon-32.png', size: 32, pad: 1.0, radius: 8 },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  await page.setContent(`<body style="margin:0;background:transparent">${svg(j.pad, j.radius).replace('<svg ', `<svg width="${j.size}" height="${j.size}" `)}</body>`);
  await page.screenshot({ path: new URL(`../public/icons/${j.file}`, import.meta.url).pathname, omitBackground: true });
  console.log('wrote', j.file);
}
await browser.close();
