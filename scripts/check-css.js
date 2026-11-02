// Fails when src/style.css carries a declaration that can never apply: a
// later rule with the identical selector list, in the identical at-rule
// context, sets the same property with equal or greater importance. Same
// specificity, later in the file, so it always wins and the earlier
// declaration is dead weight that misleads the next reader.
//
// stylelint's no-duplicate-selectors catches the same selector list written
// twice; this catches the declaration-level leftovers inside rules that
// differ in other properties.

const fs = require('fs');
const path = require('path');
const { parse } = require('./css-rules');

const FILE = path.join(__dirname, '..', 'src', 'style.css');
const src = fs.readFileSync(FILE, 'utf8');
const rules = parse(src);

const byKey = new Map();
rules.forEach((rule, index) => {
  const key = `${rule.ctx.join(' | ')} :: ${rule.sels.join(', ')}`;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push(index);
});

const dead = [];
for (const indexes of byKey.values()) {
  indexes.forEach((a, position) => {
    const later = indexes.slice(position + 1);
    if (!later.length) return;
    for (const decl of rules[a].decls) {
      const winner = later.find((b) =>
        rules[b].decls.some((e) => e.prop === decl.prop && (e.important || !decl.important)),
      );
      if (winner !== undefined) {
        dead.push(
          `  line ${rules[a].line}: ${decl.prop} in "${rules[a].sels[0]}" is overridden at line ${rules[winner].line}`,
        );
        continue;
      }
      // the other direction: a later declaration without !important never
      // beats this one with it
      if (!decl.important) continue;
      for (const b of later) {
        for (const e of rules[b].decls) {
          if (e.prop === decl.prop && !e.important) {
            dead.push(
              `  line ${rules[b].line}: ${e.prop} in "${rules[b].sels[0]}" loses to the !important one at line ${rules[a].line}`,
            );
          }
        }
      }
    }
  });
}

if (dead.length) {
  console.error(`Dead declarations in src/style.css (${dead.length}):`);
  dead.forEach((line) => console.error(line));
  process.exit(1);
}

console.log(`No dead declarations in ${rules.length} rules`);
