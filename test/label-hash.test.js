// Top bar title on label pages. Gmail writes nested labels with a plain
// slash and appends the open email's id or a page number after the label,
// so "#label/Cruise/FMfcgz..." once showed the id as the title.

const test = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('./load-script');

const KNOWN = new Set(['Cruise', 'Software', 'Software/Chess', 'AC Stuff']);

// [hash, known labels, expected label]
const CASES = [
  ['#label/Cruise', KNOWN, 'Cruise'],
  ['#label/Cruise/FMfcgzQhWTnlsKjqVbXrGtPmWcDdKsZq', KNOWN, 'Cruise'],
  ['#label/Cruise/p2', KNOWN, 'Cruise'],
  ['#label/Software/Chess', KNOWN, 'Software/Chess'],
  ['#label/Software/Chess/FMfcgzQhWTnlsKjqVbXrGtPmWcDdKsZq', KNOWN, 'Software/Chess'],
  ['#label/AC+Stuff/p3', KNOWN, 'AC Stuff'],

  // A label the menu hasn't drawn - fall back to dropping id and page parts
  ['#label/Trips/FMfcgzQhWTnlsKjqVbXrGtPmWcDdKsZq', new Set(), 'Trips'],
  ['#label/Work/Projects/p2', new Set(), 'Work/Projects'],
  ['#label/Work/Projects', new Set(), 'Work/Projects'],
];

for (const [hash, known, expected] of CASES) {
  test(`${hash} -> ${expected}`, () => {
    const parseLabelHash = loadScript()('parseLabelHash');
    assert.strictEqual(parseLabelHash(hash, known), expected);
  });
}
