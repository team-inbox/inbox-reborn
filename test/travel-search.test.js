// The Travel search the left menu's Travel row, the Travel bundle and its
// click share: Google's travel mail plus the person's travel labels

const test = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('./load-script');

test('travelSearch is the plain category without travel labels', () => {
  assert.strictEqual(loadScript()('travelSearch')([]), 'category:travel');
});

test('travelSearch ORs the category with each travel label', () => {
  assert.strictEqual(
    loadScript()('travelSearch')(['Cruise', 'Trips/Japan', 'Summer Vacation']),
    '{category:travel label:Cruise label:Trips-Japan label:Summer-Vacation}',
  );
});

test('TRAVEL_LABEL_WORDS matches whole travel words only', () => {
  const words = loadScript()('TRAVEL_LABEL_WORDS');
  ['Cruise', 'Trips/Japan', 'Summer Vacation', 'flights', 'Hotel bookings'].forEach((name) =>
    assert.ok(words.test(name), name),
  );
  ['Cruising', 'Traveller', 'Work'].forEach((name) => assert.ok(!words.test(name), name));
});
