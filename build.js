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
  'README.md',
];

const BUILD_DIR = 'build';

function getOutputDir() {
  // Defaults to the Desktop; override with BUILD_OUTPUT_DIR (used by CI)
  return process.env.BUILD_OUTPUT_DIR || path.join(os.homedir(), 'Desktop');
}

function ensureOutputDir() {
  const outputDir = getOutputDir();
  if (!fs.existsSync(outputDir)) {
    fs.ensureDirSync(outputDir);
    console.log(`Created output directory at: ${outputDir}`);
  }
}

async function build(target) {
  ensureOutputDir();

  const manifestSrc = target === 'chrome' ? 'chrome.json' : 'firefox.json';
  const manifestDest = path.join(BUILD_DIR, 'manifest.json');
  const zipName = path.join(getOutputDir(), `inbox-reborn-${target}.zip`);

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
    console.log(`${zipName} created (${archive.pointer()} total bytes)`);
    // Optionally: clean up build folder
    fs.removeSync(BUILD_DIR);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(BUILD_DIR + '/', false);
  await archive.finalize();
}

async function buildUnpacked(target) {
  ensureOutputDir();

  const manifestSrc = target === 'chrome' ? 'chrome.json' : 'firefox.json';
  const outputDir = getOutputDir();
  const unpackedDir = path.join(outputDir, `inbox-reborn-${target}`);

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
