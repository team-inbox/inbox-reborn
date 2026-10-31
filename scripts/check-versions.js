// Fails when the version numbers in the manifests and package files disagree.
// A release bumps all of them together; a missed one ships the wrong number.

const fs = require('fs');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const lock = readJson('package-lock.json');
const versions = {
  'chrome.json': readJson('chrome.json').version,
  'firefox.json': readJson('firefox.json').version,
  'package.json': readJson('package.json').version,
  'package-lock.json': lock.version,
  'package-lock.json (packages[""])': lock.packages?.['']?.version,
};

const distinct = new Set(Object.values(versions));
if (distinct.size !== 1) {
  console.error('Version mismatch:');
  for (const [file, version] of Object.entries(versions)) {
    console.error(`  ${file}: ${version}`);
  }
  process.exit(1);
}

console.log(`All versions match: ${[...distinct][0]}`);
