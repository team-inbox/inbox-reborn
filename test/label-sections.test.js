// The left menu's Bundled in the inbox / Unbundled sections: which labels and
// categories bundle, and which rows can be dragged between the sections.

const test = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('./load-script');

/**
 * A loaded script with the sections' storage in a given state, for a signed-in
 * account (an account name is set, so no Gmail lookup happens)
 * @param {Object} [state]
 * @param {string[]} [state.bundled] - Labels dragged to Bundled in the inbox
 * @param {string[]} [state.unbundledCategories] - Categories dragged to Unbundled
 * @param {boolean} [state.loaded] - False to stand for storage not answered yet
 * @param {Object} [state.options] - The options, e.g. { bundleTravel: true }
 * @returns {Function} get(name) from loadScript
 */
const withSections = ({
  bundled = [],
  unbundledCategories = [],
  loaded = true,
  options = {},
} = {}) => {
  const get = loadScript();
  const entry = (names) =>
    `{ store: ${loaded ? `{ 't@example.com': ${JSON.stringify(names)} }` : 'null'},
       cache: { account: 't@example.com', set: new Set(${JSON.stringify(names)}) } }`;
  get(
    `(() => { Object.assign(bundledLabels, ${entry(bundled)});
      Object.assign(unbundledCategories, ${entry(unbundledCategories)});
      options = ${JSON.stringify(options)}; })()`,
  );
  return get;
};

const ALL_ON = { bundlePurchases: true, bundleTravel: true, bundleFinance: true };

test('labelAndParents lists a label and every label it is nested under', () => {
  // Spread: the script's arrays come from another realm
  const labelAndParents = (label) => [...loadScript()('labelAndParents')(label)];
  assert.deepStrictEqual(labelAndParents('Work'), ['Work']);
  assert.deepStrictEqual(labelAndParents('Work/Projects/Alpha'), [
    'Work',
    'Work/Projects',
    'Work/Projects/Alpha',
  ]);
});

test('a label bundles once dragged to Bundled in the inbox, with its nested labels', () => {
  const isLabelBundled = withSections({ bundled: ['Work'] })('isLabelBundled');
  assert.strictEqual(isLabelBundled('Work'), true);
  assert.strictEqual(isLabelBundled('Work/Projects'), true);
  assert.strictEqual(isLabelBundled('Workshop'), false);
  assert.strictEqual(isLabelBundled('Taxes'), false);
});

test('the categories bundle until dragged to Unbundled', () => {
  const isLabelBundled = withSections({
    unbundledCategories: ['Promotions', 'Travel'],
    options: ALL_ON,
  })('isLabelBundled');
  ['Purchases', 'Finance', 'Social', 'Updates', 'Forums'].forEach((name) =>
    assert.strictEqual(isLabelBundled(name), true, name),
  );
  assert.strictEqual(isLabelBundled('Promotions'), false);
  assert.strictEqual(isLabelBundled('Travel'), false);
});

test('Purchases, Travel and Finance also need their switch in the options', () => {
  const isLabelBundled = withSections({ options: { bundleTravel: true } })('isLabelBundled');
  assert.strictEqual(isLabelBundled('Travel'), true);
  assert.strictEqual(isLabelBundled('Purchases'), false);
  assert.strictEqual(isLabelBundled('Finance'), false);
  assert.strictEqual(isLabelBundled('Updates'), true); // no switch for the tab categories
});

test('labels under an "Unbundled" label never bundle', () => {
  const isLabelBundled = withSections({ bundled: ['Unbundled'] })('isLabelBundled');
  assert.strictEqual(isLabelBundled('Unbundled/Newsletter'), false);
});

test('no label bundles before storage has answered', () => {
  const isLabelBundled = withSections({ bundled: ['Work'], loaded: false })('isLabelBundled');
  assert.strictEqual(isLabelBundled('Work'), false);
  assert.strictEqual(isLabelBundled('Updates'), true);
});

test('an email under an "Unbundled" label stays out of bundles', () => {
  const checkEmailUnbundledLabel = loadScript()('checkEmailUnbundledLabel');
  assert.strictEqual(checkEmailUnbundledLabel(['Taxes', 'Unbundled/Receipts']), true);
  assert.strictEqual(checkEmailUnbundledLabel(['Taxes']), false);
  assert.strictEqual(checkEmailUnbundledLabel([]), false);
});

test('an email goes in one bundle: its own label first, then the first category in Inbox order', () => {
  const pick = (labels) => [...loadScript()('pickBundleLabel')(labels)];
  assert.deepStrictEqual(pick([]), []);
  assert.deepStrictEqual(pick(['Taxes']), ['Taxes']);
  // Gmail chips a conversation with every category its messages got
  assert.deepStrictEqual(pick(['Forums', 'Updates']), ['Updates']);
  assert.deepStrictEqual(pick(['Promotions', 'Social']), ['Social']);
  assert.deepStrictEqual(pick(['Updates', 'Finance']), ['Finance']);
  // A label of your own beats a category, whatever the chip order
  assert.deepStrictEqual(pick(['Updates', 'Receipts']), ['Receipts']);
  assert.deepStrictEqual(pick(['Receipts', 'Work/Projects', 'Forums']), ['Receipts']);
});

test('a dragged label moves its mail with Gmail searches, in Gmail search spelling', () => {
  const labelMailQuery = loadScript()('labelMailQuery');
  assert.strictEqual(labelMailQuery('Cruise', true), 'label:Cruise -in:inbox');
  assert.strictEqual(labelMailQuery('Cruise', false), 'in:inbox label:Cruise');
  assert.strictEqual(labelMailQuery('AC Stuff', false), 'in:inbox label:AC-Stuff');
  assert.strictEqual(labelMailQuery('Software/Chess', true), 'label:Software-Chess -in:inbox');
  // The categories go by Gmail's category: search
  assert.strictEqual(labelMailQuery('Finance', true), 'category:finance -in:inbox');
  assert.strictEqual(labelMailQuery('Promotions', false), 'in:inbox category:promotions');
});

test('the restore search starts the day before the oldest archived conversation', () => {
  const get = loadScript();
  const localDay = get('localDay');
  const searchAfter = get('searchAfter');
  assert.strictEqual(localDay(new Date(2026, 10, 1, 23, 30)), '2026-11-01');
  assert.strictEqual(localDay(new Date(2026, 0, 9)), '2026-01-09');
  assert.strictEqual(searchAfter('2026-11-01'), '2026/10/31');
  assert.strictEqual(searchAfter('2026-03-01'), '2026/2/28');
  assert.strictEqual(searchAfter('2026-01-01'), '2025/12/31');
});

test('categories and top-level labels drag; nested and Unbundled/ labels do not', () => {
  const isLabelDraggable = loadScript()('isLabelDraggable');
  assert.strictEqual(isLabelDraggable('Taxes'), true);
  assert.strictEqual(isLabelDraggable('AC Stuff'), true);
  assert.strictEqual(isLabelDraggable('Purchases'), true);
  assert.strictEqual(isLabelDraggable('Updates'), true);
  assert.strictEqual(isLabelDraggable('Software/Chess'), false);
  assert.strictEqual(isLabelDraggable('Unbundled/Newsletter'), false);
  assert.strictEqual(isLabelDraggable(''), false);
});
