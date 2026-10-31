// Loads the real content script into a sandbox so tests can call its
// functions. The stubs cover only what the script touches while loading:
// with no document.head and no chrome.storage it skips Gmail setup entirely.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'src', 'script.js'), 'utf8');

/**
 * @param {string} [now] - Fixed "current time" for new Date() inside the
 *   script, as a local date-time string (e.g. '2026-10-30T14:00')
 * @returns {Function} get(name) - returns a top-level binding of the script
 */
const loadScript = (now) => {
  const context = vm.createContext({
    chrome: {},
    Element: { prototype: { remove() {} } },
    document: { head: null, body: null, addEventListener() {} },
    window: { addEventListener() {} },
    console,
  });

  if (now) {
    context.__now = now;
    vm.runInContext(
      `globalThis.Date = class extends Date {
        constructor(...args) { args.length ? super(...args) : super(__now); }
        static now() { return new Date().getTime(); }
      };`,
      context,
    );
  }

  vm.runInContext(SCRIPT, context, { filename: 'src/script.js' });
  // Top-level const/let live in the context's script scope, not on its global
  return (name) => vm.runInContext(name, context);
};

module.exports = { loadScript };
