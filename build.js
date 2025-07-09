// Usage examples:
//   node build.js chrome unpacked   // Only builds unpacked folder on Desktop
//   node build.js chrome zip        // Only builds zip on Desktop
//   node build.js firefox unpacked
//   node build.js firefox zip

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const os = require('os');

const FILES_TO_INCLUDE = [
  'docs',
  'icons',
  'images',
  'screenshots',
  'src',
  '.gitignore',
  'LICENSE',
  'README.md'
];

const BUILD_DIR = 'build';

function getDesktopDir() {
  // Cross-platform way to get desktop path
  return path.join(os.homedir(), 'Desktop');
}

function ensureDesktopDir() {
  const desktopDir = getDesktopDir();
  if (!fs.existsSync(desktopDir)) {
    fs.ensureDirSync(desktopDir);
    console.log(`Created Desktop directory at: ${desktopDir}`);
  }
}

async function build(target) {
  ensureDesktopDir();

  const manifestSrc = target === 'chrome' ? 'chrome.json' : 'firefox.json';
  const manifestDest = path.join(BUILD_DIR, 'manifest.json');
  const zipName = path.join(getDesktopDir(), `inbox-reborn-${target}.zip`);

  // Clean build dir
  await fs.remove(BUILD_DIR);
  await fs.ensureDir(BUILD_DIR);

  // Copy files/folders
  for (const item of FILES_TO_INCLUDE) {
    if (fs.existsSync(item)) {
      await fs.copy(item, path.join(BUILD_DIR, item));
    }
  }

  // Copy manifest
  await fs.copy(manifestSrc, manifestDest);

  // Zip it
  const output = fs.createWriteStream(zipName);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`${zipName} created on Desktop (${archive.pointer()} total bytes)`);
    // Optionally: clean up build folder
    fs.removeSync(BUILD_DIR);
  });

  archive.on('error', err => { throw err; });

  archive.pipe(output);
  archive.directory(BUILD_DIR + '/', false);
  await archive.finalize();
}

async function buildUnpacked(target) {
  ensureDesktopDir();

  const manifestSrc = target === 'chrome' ? 'chrome.json' : 'firefox.json';
  const desktop = getDesktopDir();
  const unpackedDir = path.join(desktop, `inbox-reborn-${target}`);

  // Clean and create the unpacked dir
  await fs.remove(unpackedDir);
  await fs.ensureDir(unpackedDir);

  // Copy files/folders
  for (const item of FILES_TO_INCLUDE) {
    if (fs.existsSync(item)) {
      await fs.copy(item, path.join(unpackedDir, item));
    }
  }

  // Copy manifest
  await fs.copy(manifestSrc, path.join(unpackedDir, 'manifest.json'));

  console.log(`Unpacked folder for ${target} created at: ${unpackedDir}`);
}

const target = process.argv[2];
const buildType = process.argv[3];

if (!['chrome', 'firefox'].includes(target) || !['unpacked', 'zip'].includes(buildType)) {
  console.error('Usage: node build.js [chrome|firefox] [unpacked|zip]');
  process.exit(1);
}

if (buildType === 'unpacked') {
  buildUnpacked(target);
} else if (buildType === 'zip') {
  build(target);
}