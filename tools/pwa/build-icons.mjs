// Генерация PWA-иконок из SVG (силуэт вымышленной башни) через Chromium из Playwright.
// Запуск: node tools/pwa/build-icons.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/icons');
mkdirSync(out, { recursive: true });

// scale<1 — запас под safe-zone maskable (содержимое в центральных ~80%)
const svg = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<rect width="512" height="512" fill="#12150f"/>
<g transform="translate(256 256) scale(${scale}) translate(-256 -256)" fill="#c9b98a">
<rect x="96" y="410" width="320" height="40" rx="6"/>
<path d="M150 410 L170 230 H342 L362 410 Z"/>
<rect x="150" y="190" width="212" height="40" rx="4" fill="#a8975f"/>
<rect x="228" y="90" width="56" height="100" rx="6"/>
<rect x="244" y="40" width="24" height="60" rx="4" fill="#e6d9a8"/>
<rect x="236" y="300" width="40" height="70" rx="6" fill="#12150f"/>
</g></svg>`;

const targets = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.78],
  ['apple-touch-icon.png', 180, 0.9],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, scale] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0"><div style="width:${size}px;height:${size}px">${svg(scale).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</div></body>`,
  );
  writeFileSync(resolve(out, name), await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } }));
  console.log('ok', name);
}
await browser.close();
