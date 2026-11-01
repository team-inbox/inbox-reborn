// The left menu's Bundled in the inbox / Unbundled sections: which labels
// bundle, and which rows can be dragged between the sections.

const test = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('./load-script');

// A loaded script with these labels dragged to Bundled in the inbox for the
// signed-in account (an account name is set, so no Gmail lookup happens)
const withBundled = (labels) => {
  const get = loadScript();
  get(
    `(() => { bundledLabelsStore = { 't@example.com': ${JSON.stringify(labels)} };
      bundledLabels = { account: 't@example.com', set: new Set(${JSON.stringify(labels)}) }; })()`,
  );
  return get;
};

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
  const isLabelBundled = withBundled(['Work'])('isLabelBundled');
  assert.strictEqual(isLabelBundled('Work'), true);
  assert.strictEqual(isLabelBundled('Work/Projects'), true);
  assert.strictEqual(isLabelBundled('Workshop'), false);
  assert.strictEqual(isLabelBundled('Taxes'), false);
});

test('the categories always bundle, labels under an "Unbundled" label never do', () => {
  const isLabelBundled = withBundled(['Unbundled'])('isLabelBundled');
  ['Travel', 'Purchases', 'Finance', 'Social', 'Updates', 'Forums', 'Promotions'].forEach((name) =>
    assert.strictEqual(isLabelBundled(name), true, name),
  );
  assert.strictEqual(isLabelBundled('Unbundled/Newsletter'), false);
});

test('nothing but the categories bundles before storage has answered', () => {
  const isLabelBundled = loadScript()('isLabelBundled');
  assert.strictEqual(isLabelBundled('Work'), false);
  assert.strictEqual(isLabelBundled('Updates'), true);
});

test('an email under an "Unbundled" label stays out of bundles', () => {
  const checkEmailUnbundledLabel = loadScript()('checkEmailUnbundledLabel');
  assert.strictEqual(checkEmailUnbundledLabel(['Taxes', 'Unbundled/Receipts']), true);
  assert.strictEqual(checkEmailUnbundledLabel(['Taxes']), false);
  assert.strictEqual(checkEmailUnbundledLabel([]), false);
});

test('only top-level labels drag; nested, Unbundled/ and category-named ones do not', () => {
  const isLabelDraggable = loadScript()('isLabelDraggable');
  assert.strictEqual(isLabelDraggable('Taxes'), true);
  assert.strictEqual(isLabelDraggable('AC Stuff'), true);
  assert.strictEqual(isLabelDraggable('Software/Chess'), false);
  assert.strictEqual(isLabelDraggable('Unbundled/Newsletter'), false);
  assert.strictEqual(isLabelDraggable('Purchases'), false);
  assert.strictEqual(isLabelDraggable('Updates'), false);
  assert.strictEqual(isLabelDraggable(''), false);
});
