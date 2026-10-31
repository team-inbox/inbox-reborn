// Fails when the code or manifests point at an image that isn't in the repo.
// A missing file doesn't error anywhere - Gmail just shows a blank icon.

const fs = require('fs');
const path = require('path');

const SOURCES = ['chrome.json', 'firefox.json'];
const SOURCE_DIRS = ['src'];
const ASSET_REF = /\b(?:images|icons)\/[\w.@-]+\.(?:png|svg|gif|jpe?g|ico|webp)\b/g;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(css|js|html)$/.test(entry.name) ? [full] : [];
  });

const files = [...SOURCES, ...SOURCE_DIRS.flatMap(walk)];
const missing = [];
let checked = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const refs = new Set(text.match(ASSET_REF) || []);
  for (const ref of refs) {
    checked++;
    if (!fs.existsSync(ref)) missing.push(`${file}: ${ref}`);
  }
}

if (missing.length) {
  console.error(`Missing assets (${missing.length}):`);
  missing.forEach((line) => console.error(`  ${line}`));
  process.exit(1);
}

console.log(`All ${checked} asset references found`);
