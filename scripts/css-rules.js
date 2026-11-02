// A small reader for src/style.css: every rule with its selectors, nesting
// context, specificity and declarations, each with source offsets. Enough for
// the cascade questions the checks ask (which rule wins a tie, which
// declaration can never apply); not a general CSS parser.

/**
 * Blanks comments (and optionally string contents) so braces and semicolons
 * inside them are never read as structure. Line breaks are kept, so offsets
 * and line numbers still match the source.
 * @param {string} text
 * @param {boolean} stringsToo
 * @returns {string}
 */
const blank = (text, stringsToo) => {
  const out = text.split('');
  const n = text.length;
  let i = 0;
  while (i < n) {
    if (text.startsWith('/*', i)) {
      let j = text.indexOf('*/', i + 2);
      j = j < 0 ? n : j + 2;
      for (let k = i; k < j; k++) if (out[k] !== '\n') out[k] = ' ';
      i = j;
    } else if (stringsToo && (text[i] === '"' || text[i] === "'")) {
      const q = text[i];
      let j = i + 1;
      while (j < n && text[j] !== q) {
        if (text[j] === '\\') j++;
        j++;
      }
      for (let k = i + 1; k < Math.min(j, n); k++) if (out[k] !== '\n') out[k] = 'x';
      i = j + 1;
    } else {
      i++;
    }
  }
  return out.join('');
};

/**
 * Splits on a separator outside parentheses
 * @param {string} text
 * @param {string} [sep]
 * @returns {string[]}
 */
const splitTop = (text, sep = ',') => {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
};

const WORD = /[\w-]/;

/**
 * Specificity as [ids, classes/attributes/pseudo-classes, elements].
 * :is/:not/:has take their most specific argument, :where counts nothing,
 * pseudo-elements count as elements.
 * @param {string} sel - One selector (no commas)
 * @returns {number[]}
 */
const specificity = (sel) => {
  let a = 0;
  let b = 0;
  let c = 0;
  let i = 0;
  const skipWord = () => {
    while (i < sel.length && WORD.test(sel[i])) i++;
  };
  while (i < sel.length) {
    const ch = sel[i];
    if (ch === '#') {
      a++;
      i++;
      skipWord();
    } else if (ch === '.') {
      b++;
      i++;
      skipWord();
    } else if (ch === '[') {
      b++;
      i = sel.indexOf(']', i) + 1;
    } else if (ch === ':') {
      if (sel.startsWith('::', i)) {
        c++;
        i += 2;
        skipWord();
      } else {
        const m = /^:([\w-]+)(\()?/.exec(sel.slice(i));
        const name = m[1];
        i += m[0].length;
        if (m[2]) {
          let depth = 1;
          const start = i;
          while (i < sel.length && depth) {
            if (sel[i] === '(') depth++;
            else if (sel[i] === ')') depth--;
            i++;
          }
          const inner = sel.slice(start, i - 1);
          if (['is', 'not', 'has', 'matches'].includes(name)) {
            const best = splitTop(inner).map(specificity).sort(compareSpecificity).pop() || [
              0, 0, 0,
            ];
            a += best[0];
            b += best[1];
            c += best[2];
          } else if (name !== 'where') {
            b++; // :nth-child(...) and friends
          }
        } else {
          b++;
        }
      }
    } else if (WORD.test(ch) || ch === '*') {
      if (ch !== '*') c++;
      i++;
      skipWord();
    } else {
      i++;
    }
  }
  return [a, b, c];
};

/**
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number} negative when x is less specific than y
 */
const compareSpecificity = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];

const sameSpecificity = (x, y) => compareSpecificity(x, y) === 0;

/**
 * The last compound of a selector as a set of tokens, plus its
 * pseudo-element. Two selectors can only match the same element when their
 * subjects are compatible.
 * @param {string} sel
 * @returns {{tokens: Set<string>, pseudo: string}}
 */
const subject = (sel) => {
  const stripped = sel.replace(/:(is|not|where|has)\([^()]*(\([^()]*\))?[^()]*\)/g, '');
  const parts = stripped.trim().split(/\s*[>+~]\s*|\s+/);
  let last = parts[parts.length - 1] || '';
  const pseudo = /::[\w-]+/.exec(last);
  last = last.replace(/::[\w-]+/, '');
  const tokens = new Set(last.match(/\.[\w-]+|\[[^\]]*\]|^[a-z][\w-]*/g) || []);
  return { tokens, pseudo: pseudo ? pseudo[0] : '' };
};

const DARK = 'body.dark-mode';
const LIGHT_ONLY = 'body:not(.dark-mode)';
const ATTR_VALUE = /\[([\w-]+)=['"]([^'"]+)['"]\]/g;

/**
 * Attribute equality tests, by attribute name
 * @param {string} sel
 * @returns {Map<string, string[]>}
 */
const attrValues = (sel) => {
  const out = new Map();
  for (const m of sel.matchAll(ATTR_VALUE)) {
    if (!out.has(m[1])) out.set(m[1], []);
    out.get(m[1]).push(m[2]);
  }
  return out;
};

/**
 * Whether two selectors could match one element. A conservative answer: true
 * unless the two provably exclude each other.
 * @param {string} x
 * @param {string} y
 * @returns {boolean}
 */
const canCoexist = (x, y) => {
  // one theme each
  if (
    (x.includes(DARK) && y.includes(LIGHT_ONLY)) ||
    (y.includes(DARK) && x.includes(LIGHT_ONLY))
  ) {
    return false;
  }
  // the same attribute tested for different values: a different sidebar row
  // ([data-inbox-nav]) or widget state ([aria-checked]). The stylesheet tests
  // these on the subject or on a row that never nests, so one value holds
  // for an element and its ancestors.
  const attrsX = attrValues(x);
  for (const [name, valuesY] of attrValues(y)) {
    const valuesX = attrsX.get(name);
    if (valuesX && !valuesX.some((v) => valuesY.includes(v))) return false;
  }
  const sx = subject(x);
  const sy = subject(y);
  if (sx.pseudo !== sy.pseudo) return false;
  // a universal or bare-pseudo subject can be anything; otherwise the subjects
  // must share a tag or class
  if (!sx.tokens.size || !sy.tokens.size) return true;
  for (const t of sx.tokens) if (sy.tokens.has(t)) return true;
  return false;
};

/**
 * Parses a stylesheet into its style rules (at-rules are context, not rules)
 * @param {string} src
 * @returns {Array<{sels: string[], specs: number[][], ctx: string[], start: number,
 *   end: number, bodyStart: number, bodyEnd: number, line: number,
 *   decls: Array<{prop: string, important: boolean, raw: string}>}>}
 */
const parse = (src) => {
  const masked = blank(src, true);
  const noComment = blank(src, false);
  const n = src.length;
  const rules = [];
  const stack = [];
  let seg = 0;
  for (const m of masked.matchAll(/[{};]/g)) {
    const tok = m[0];
    if (tok === '{') {
      const preludeRaw = noComment.slice(seg, m.index);
      const lead = preludeRaw.length - preludeRaw.trimStart().length;
      stack.push({ prelude: preludeRaw.trim(), start: seg + lead, bodyStart: m.index + 1 });
      seg = m.index + 1;
    } else if (tok === '}') {
      const top = stack.pop();
      if (top) {
        let end = m.index + 1;
        if (end < n && src[end] === '\n') end++;
        if (!top.prelude.startsWith('@')) {
          const decls = [];
          let pos = top.bodyStart;
          for (const part of masked.slice(top.bodyStart, m.index).split(';')) {
            const text = noComment.slice(pos, pos + part.length);
            const raw = src.slice(pos, pos + part.length).trim();
            pos += part.length + 1;
            const colon = text.indexOf(':');
            if (colon < 0) continue;
            const prop = text.slice(0, colon).trim().toLowerCase();
            if (!prop) continue;
            const important = /!\s*important/i.test(text.slice(colon + 1));
            decls.push({ prop, important, raw });
          }
          const sels = splitTop(top.prelude.replace(/\s+/g, ' '));
          rules.push({
            sels,
            specs: sels.map(specificity),
            ctx: stack.map((s) => s.prelude.replace(/\s+/g, ' ')),
            start: top.start,
            end,
            bodyStart: top.bodyStart,
            bodyEnd: m.index,
            line: lineOf(src, top.start),
            decls,
          });
        }
      }
      seg = m.index + 1;
    } else {
      seg = m.index + 1;
    }
  }
  return rules;
};

/**
 * @param {string} src
 * @param {number} offset
 * @returns {number} 1-based line number
 */
const lineOf = (src, offset) => {
  let line = 1;
  for (let i = 0; i < offset; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
};

/**
 * Whether an earlier rule and a later rule could tie on a property: same
 * specificity, same importance, and selectors that could match one element.
 * When they can, the later one wins, so their order matters.
 * @param {object} earlier
 * @param {object} later
 * @returns {string[]} the properties they could tie on
 */
const tieProps = (earlier, later) => {
  if (earlier.ctx.join('|') !== later.ctx.join('|')) {
    // a rule inside a Firefox-only or media block still competes with
    // top-level rules in that browser
    const onlyAtRules = [...earlier.ctx, ...later.ctx].every((c) => c.startsWith('@'));
    if (!onlyAtRules) return [];
  }
  const shared = earlier.decls
    .filter((d) => later.decls.some((e) => e.prop === d.prop && e.important === d.important))
    .map((d) => d.prop);
  if (!shared.length) return [];
  for (let i = 0; i < earlier.sels.length; i++) {
    for (let j = 0; j < later.sels.length; j++) {
      if (
        sameSpecificity(earlier.specs[i], later.specs[j]) &&
        canCoexist(earlier.sels[i], later.sels[j])
      ) {
        return [...new Set(shared)];
      }
    }
  }
  return [];
};

module.exports = {
  parse,
  blank,
  specificity,
  compareSpecificity,
  canCoexist,
  tieProps,
  splitTop,
  lineOf,
};
