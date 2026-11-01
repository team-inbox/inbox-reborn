// Usage examples:
//   node build.js chrome unpacked   // Only builds unpacked folder on Desktop
//   node build.js chrome zip        // Only builds zip on Desktop
//   node build.js firefox unpacked
//   node build.js firefox zip

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const os = require('os');

// Only what the extension needs at runtime ships in the package
const FILES_TO_INCLUDE = ['icons', 'images', 'src', 'LICENSE'];

const BUILD_DIR = 'build';

// Finder's .DS_Store and other dotfiles never ship (addons-linter flags them)
const copyOptions = { filter: (src) => !path.basename(src).startsWith('.') };

/**
 * Copies the runtime files and the target's manifest into a folder
 * @param {string} target - 'chrome' or 'firefox'
 * @param {string} dir - The folder to fill
 */
async function copyExtension(target, dir) {
  const manifestSrc = target === 'chrome' ? 'chrome.json' : 'firefox.json';
  for (const item of FILES_TO_INCLUDE) {
    if (fs.existsSync(item)) {
      await fs.copy(item, path.join(dir, item), copyOptions);
    }
  }
  await fs.copy(manifestSrc, path.join(dir, 'manifest.json'));
}

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

  const zipName = path.join(getOutputDir(), `inbox-reborn-${target}.zip`);

  await fs.remove(BUILD_DIR);
  await fs.ensureDir(BUILD_DIR);
  await copyExtension(target, BUILD_DIR);

  // Zip it, and only report success once the file is closed
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipName);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => {
      console.log(`${zipName} created (${archive.pointer()} total bytes)`);
      resolve();
    });
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(BUILD_DIR + '/', false);
    archive.finalize().catch(reject);
  });
  await fs.remove(BUILD_DIR);
}

async function buildUnpacked(target) {
  ensureOutputDir();

  const unpackedDir = path.join(getOutputDir(), `inbox-reborn-${target}`);
  await fs.remove(unpackedDir);
  await fs.ensureDir(unpackedDir);
  await copyExtension(target, unpackedDir);

  console.log(`Unpacked folder for ${target} created at: ${unpackedDir}`);
}

const target = process.argv[2];
const buildType = process.argv[3];

if (!['chrome', 'firefox'].includes(target) || !['unpacked', 'zip'].includes(buildType)) {
  console.error('Usage: node build.js [chrome|firefox] [unpacked|zip]');
  process.exit(1);
}

(buildType === 'unpacked' ? buildUnpacked(target) : build(target)).catch((err) => {
  console.error(`Build failed: ${err.message}`);
  process.exit(1);
});
