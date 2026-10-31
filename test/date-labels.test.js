// Date group headings (Today / Yesterday / This week / This month / ...).
// The edge cases are month, year and week boundaries, where an off-by-one
// once filed yesterday's mail under last month's name.

const test = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('./load-script');

// [now, email received, expected heading] - local times; weeks start Sunday
const CASES = [
  ['2026-10-30T14:00', '2026-10-30T08:00', 'Today'],
  ['2026-10-30T14:00', '2026-10-29T00:56', 'Yesterday'],
  ['2026-10-30T14:00', '2026-10-27T14:49', 'This week'],
  ['2026-10-30T14:00', '2026-10-25T17:12', 'This week'],
  ['2026-10-30T14:00', '2026-10-24T23:59', 'This month'],
  ['2026-10-30T14:00', '2026-10-21T09:21', 'This month'],
  ['2026-10-30T14:00', '2026-09-16T15:33', 'September'],
  ['2026-10-30T14:00', '2024-05-01T10:00', '2024'],

  // Yesterday across a month boundary
  ['2026-11-01T09:00', '2026-10-31T22:00', 'Yesterday'],
  ['2026-11-01T09:00', '2026-10-30T22:00', 'October'],
  ['2026-10-01T09:00', '2026-09-30T22:00', 'Yesterday'],

  // This week reaching back into the previous month
  ['2026-10-01T09:00', '2026-09-28T10:00', 'This week'],
  ['2026-10-01T09:00', '2026-09-26T10:00', 'September'],

  // Across New Year
  ['2027-01-01T09:00', '2026-12-31T22:00', 'Yesterday'],
  ['2027-01-01T09:00', '2026-12-28T10:00', 'This week'],
  ['2027-01-01T09:00', '2026-12-26T10:00', 'Last year'],

  // Early-morning and late-night mail near day edges
  ['2026-11-02T09:00', '2026-11-01T01:30', 'Yesterday'],
  ['2026-11-03T09:00', '2026-11-01T23:30', 'This week'],
  ['2026-11-02T09:00', '2026-10-31T10:00', 'October'],
];

for (const [now, received, expected] of CASES) {
  test(`${received} seen at ${now} -> ${expected}`, () => {
    const get = loadScript(now);
    const buildDateLabel = get('buildDateLabel');
    const SandboxDate = get('Date');
    assert.strictEqual(buildDateLabel(new SandboxDate(received)), expected);
  });
}
