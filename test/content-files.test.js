// The content script is a set of classic scripts that share one scope and
// load in manifest order. These guard the contract: both manifests list the
// same files, every file exists, the set loads without error, and no file
// declares a binding another file already declared (a SyntaxError in the
// browser that no lint catches, since each file lints on its own).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadScript, FILES } = require('./load-script');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('chrome.json and firefox.json load the same content files in the same order', () => {
  const firefox = JSON.parse(read('firefox.json'));
  const firefoxFiles = firefox.content_scripts.find((entry) => entry.world !== 'MAIN').js;
  assert.deepStrictEqual(firefoxFiles, FILES);
});

test('every listed content file exists under src/content and every file there is listed', () => {
  for (const file of FILES) assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} is missing`);
  const onDisk = fs
    .readdirSync(path.join(ROOT, 'src', 'content'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => `src/content/${f}`)
    .sort();
  assert.deepStrictEqual(onDisk, [...FILES].sort());
});

test('the content files load in order without error and start with the init file last', () => {
  assert.doesNotThrow(() => loadScript());
  assert.strictEqual(FILES[FILES.length - 1], 'src/content/init.js');
});

test('no top-level binding is declared in two content files', () => {
  const owners = new Map();
  for (const file of FILES) {
    for (const m of read(file).matchAll(
      /^(?:const|let|var|function|async function)\s+([\w$]+)/gm,
    )) {
      const name = m[1];
      assert.ok(!owners.has(name), `${name} is declared in ${owners.get(name)} and ${file}`);
      owners.set(name, file);
    }
  }
  assert.ok(owners.size > 100, 'the regex found the top-level bindings');
});

// ESLint checks unused bindings and let-vs-const per file; across the set,
// a binding used only from another file is fine and one used nowhere is not
const BINDING = /^(const|let|var|function|async function)\s+([\w$]+)/gm;
// (spreads become plain words, so `...name` counts as a use)
const allCode = () =>
  FILES.map((file) => read(file))
    .join('\n')
    .replaceAll('...', ' ');

test('every top-level binding is used somewhere in the content files', () => {
  const code = allCode();
  const unused = [];
  for (const file of FILES) {
    for (const m of read(file).matchAll(BINDING)) {
      const uses = code.match(new RegExp(`(?<![\\w$.])${m[2].replace('$', '\\$')}(?![\\w$])`, 'g'));
      if (uses.length < 2) unused.push(`${m[2]} in ${file}`);
    }
  }
  assert.deepStrictEqual(unused, []);
});

test('a top-level let is reassigned somewhere, or it should be a const', () => {
  const code = allCode();
  const constant = [];
  for (const file of FILES) {
    for (const m of read(file).matchAll(BINDING)) {
      if (m[1] !== 'let') continue;
      const name = m[2].replace('$', '\\$');
      const assigned = new RegExp(`(?<![\\w$.])${name}\\s*(=[^=]|\\+\\+|--|[-+*/]=)`).test(
        code.replace(m[0], ''),
      );
      if (!assigned) constant.push(`${m[2]} in ${file}`);
    }
  }
  assert.deepStrictEqual(constant, []);
});
