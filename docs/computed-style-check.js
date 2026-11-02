/**
 * Inbox Reborn - computed-style check for stylesheet changes
 *
 * Proves that a change to src/style.css is a no-op (or shows exactly what it
 * changed) by comparing the computed style of every element in Gmail before
 * and after, in light and dark mode. A glance at a screenshot misses a
 * one-shade regression; this does not.
 *
 * How to use it:
 *   1. With the OLD build loaded, paste this file into the DevTools console on
 *      https://mail.google.com and run, for each view you want covered:
 *        inboxRebornStyleCheck.record('inbox')
 *      Good views: the inbox, a bundle page, an open conversation, a compose
 *      window, the theme picker (quick settings > Theme > View all). The
 *      label is yours; one per view.
 *   2. Rebuild, reload the extension (chrome://extensions), then load Gmail
 *      at a DIFFERENT url than the one open (e.g. /mail/u/0/ without the
 *      hash): navigating to the same url does not reload the page, and the
 *      old content script keeps running.
 *   3. Paste this file again, open the same views and run
 *        inboxRebornStyleCheck.compare('inbox')
 *      for each label. It snapshots again and prints, per region and mode,
 *      how many elements differ and in which properties.
 *   4. inboxRebornStyleCheck.clear() when done (the snapshots live in an
 *      IndexedDB database on the Gmail origin).
 *
 * Expected noise: rows that changed read/unread state (font-weight, date
 * color), checkbox hover opacity, Gmail's regenerated SVG gradient ids,
 * and anything Gmail itself redrew between the two loads. Anything else is a
 * real change.
 *
 * A fresh page nests the top of the DOM differently from a long-lived one, so
 * the comparison is per region (header, left nav, list pane, main pane,
 * compose dialog, theme picker), each found by its signature.
 *
 * inboxRebornStyleCheck.overlap(pairs) answers a cascade question instead:
 * given pairs of selector lists, which pairs match a common element in the
 * current view? Two rules of equal specificity only compete where they
 * overlap, so a pair that never overlaps can be reordered freely.
 */
(() => {
  const DB = 'inboxRebornReview';
  const STORE = 'snaps';

  // What is compared per element, and per ::before/::after with content
  const PROPS = [
    'color',
    'background-color',
    'background-image',
    'border-top-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-width',
    'border-bottom-width',
    'display',
    'visibility',
    'opacity',
    'font-size',
    'font-family',
    'font-weight',
    'margin-top',
    'margin-bottom',
    'margin-left',
    'padding-left',
    'padding-top',
    'filter',
    'fill',
    'order',
    'position',
    'box-shadow',
    'border-radius',
    'mask-image',
    '-webkit-mask-image',
    'text-decoration-line',
    'letter-spacing',
    'scrollbar-color',
    'mix-blend-mode',
    'transition-property',
  ];
  const PSEUDO = [
    'content',
    'background-image',
    'background-color',
    'color',
    'display',
    'width',
    'height',
    'mask-image',
    '-webkit-mask-image',
    'border-bottom-color',
  ];

  // Region roots, by the signature (tag.classes) of their top element
  const ROOTS = {
    header: /^header\b/,
    nav: /^div\.aeN\b/,
    list: /^div\.bGI\.nH\.oy8Mbf/,
    main: /^div\.nH\.bkK/,
    compose: /^div\.nH\.Hd/,
    theme: /uW2Fw-bHo/,
  };

  const openDb = () =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const put = async (key, value) => {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  };
  const get = async (key) => {
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const signature = (el) => {
    const classes = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 4) : [];
    return el.tagName.toLowerCase() + (classes[0] ? '.' + classes.join('.') : '');
  };

  /**
   * Every element under body, keyed by its child-index path, with its
   * computed style dictionary-encoded (the same values repeat thousands of
   * times). Message bodies (.a3s, .ii) are skipped: mail content, not UI.
   */
  const snapshot = () => {
    const dict = new Map();
    const vals = [];
    const encode = (s) => {
      let i = dict.get(s);
      if (i === undefined) {
        i = vals.length;
        vals.push(s);
        dict.set(s, i);
      }
      return i;
    };
    const out = {};
    const walk = (el, path) => {
      const kids = el.children;
      for (let i = 0; i < kids.length; i++) {
        const kid = kids[i];
        if (kid.tagName === 'SCRIPT' || kid.tagName === 'STYLE') continue;
        if (kid.classList.contains('a3s') || kid.classList.contains('ii')) continue;
        const p = path + '.' + i;
        const cs = getComputedStyle(kid);
        let rec = signature(kid) + '\t' + encode(PROPS.map((x) => cs.getPropertyValue(x)).join('|'));
        for (const ps of ['::before', '::after']) {
          const pc = getComputedStyle(kid, ps);
          if (pc.content && pc.content !== 'none' && pc.content !== 'normal') {
            rec += '\t' + ps + encode(PSEUDO.map((x) => pc.getPropertyValue(x)).join('|'));
          }
        }
        out[p] = rec;
        walk(kid, p);
      }
    };
    walk(document.body, 'b');
    return { vals, out };
  };

  const dark = async (on) => {
    if (document.body.classList.contains('dark-mode') !== on) {
      document.body.classList.toggle('dark-mode', on);
      await sleep(800);
    }
  };

  /** Snapshots the view in light and dark mode under label-light / label-dark */
  const record = async (label, suffix = '') => {
    const wasDark = document.body.classList.contains('dark-mode');
    const counts = {};
    for (const mode of ['light', 'dark']) {
      await dark(mode === 'dark');
      const snap = snapshot();
      await put(`${label}-${mode}${suffix}`, JSON.stringify(snap));
      counts[mode] = Object.keys(snap.out).length;
    }
    await dark(wasDark);
    return counts;
  };

  const parseRecord = (snap, rec) => {
    const parts = rec.split('\t');
    const r = { sig: parts[0], main: snap.vals[+parts[1]] };
    for (const p of parts.slice(2)) r[p.slice(0, 8)] = snap.vals[+p.slice(8)];
    return r;
  };

  // Gmail regenerates SVG gradient ids on every load
  const noise = (a, b) => /url\("#c\d+"\)/.test(a + b);
  const short = (v) => (v || '').replace(/url\([^)]*\)/g, 'url(…)').slice(0, 48);

  /** Diffs the elements under one root in two snapshots */
  const diffUnder = (A, B, rootRe) => {
    const rootOf = (snap) => Object.keys(snap.out).find((p) => rootRe.test(snap.out[p].split('\t')[0]));
    const ra = rootOf(A);
    const rb = rootOf(B);
    if (!ra || !rb) return null;
    const under = (snap, root) => {
      const o = {};
      for (const p in snap.out) {
        if (p === root || p.startsWith(root + '.')) o[p.slice(root.length)] = snap.out[p];
      }
      return o;
    };
    const SA = under(A, ra);
    const SB = under(B, rb);
    let matched = 0;
    let unmatched = 0;
    const byProp = {};
    const examples = [];
    for (const p in SA) {
      if (!(p in SB)) {
        unmatched++;
        continue;
      }
      const xa = parseRecord(A, SA[p]);
      const xb = parseRecord(B, SB[p]);
      if (xa.sig !== xb.sig) {
        unmatched++;
        continue;
      }
      matched++;
      const diffs = [];
      const va = xa.main.split('|');
      const vb = xb.main.split('|');
      PROPS.forEach((prop, i) => {
        if (va[i] !== vb[i] && !noise(va[i], vb[i])) diffs.push(`${prop}: ${short(va[i])} -> ${short(vb[i])}`);
      });
      for (const ps of ['::before', '::after']) {
        const pa = xa[ps] || '';
        const pb = xb[ps] || '';
        if (pa === pb) continue;
        const ya = pa.split('|');
        const yb = pb.split('|');
        PSEUDO.forEach((prop, i) => {
          if (ya[i] !== yb[i]) diffs.push(`${ps} ${prop}: ${short(ya[i])} -> ${short(yb[i])}`);
        });
      }
      if (diffs.length) {
        diffs.forEach((d) => {
          const prop = d.split(':')[0];
          byProp[prop] = (byProp[prop] || 0) + 1;
        });
        if (examples.length < 12) examples.push(`${xa.sig.slice(0, 40)} | ${diffs.join(' ; ')}`);
      }
    }
    return { matched, differing: Object.values(byProp).length ? examples.length : 0, unmatched, byProp, examples };
  };

  /**
   * Snapshots the view again (label-light-after / label-dark-after) and
   * reports, per region and mode, what differs from the recorded snapshots
   */
  const compare = async (label) => {
    await record(label, '-after');
    const lines = [];
    for (const mode of ['light', 'dark']) {
      const A = JSON.parse(await get(`${label}-${mode}`));
      const B = JSON.parse(await get(`${label}-${mode}-after`));
      if (!A) {
        lines.push(`${mode}: no recorded snapshot for "${label}"`);
        continue;
      }
      for (const [name, re] of Object.entries(ROOTS)) {
        const d = diffUnder(A, B, re);
        if (!d) continue;
        const props = Object.entries(d.byProp)
          .map(([k, v]) => `${k} ×${v}`)
          .join(', ');
        lines.push(`${mode} ${name}: ${d.matched} matched, ${d.unmatched} unmatched, differing props: ${props || 'none'}`);
        d.examples.forEach((e) => lines.push('    ' + e));
      }
    }
    const report = lines.join('\n');
    console.log(report);
    return report;
  };

  // State pseudo-classes and pseudo-elements never match a query; drop them
  // to ask about the elements the selectors are anchored to
  const structural = (sel) =>
    sel
      .replace(/:not\(:(hover|focus|active|focus-within|focus-visible)\)/g, '')
      .replace(/:(hover|focus|active|focus-within|focus-visible)/g, '')
      .replace(/::[\w-]+/g, '');

  /**
   * @param {Array<{dSels: string[], lSels: string[]}>} pairs
   * @returns {Array<{index: number, d: number, l: number, both: number, error?: string}>}
   *   element counts for each pair, with dark mode on so dark rules match
   */
  const overlap = async (pairs) => {
    const wasDark = document.body.classList.contains('dark-mode');
    await dark(true);
    const results = pairs.map((pair, index) => {
      try {
        const a = new Set(document.querySelectorAll(pair.dSels.map(structural).join(',')));
        const b = document.querySelectorAll(pair.lSels.map(structural).join(','));
        let both = 0;
        b.forEach((el) => {
          if (a.has(el)) both++;
        });
        return { index, d: a.size, l: b.length, both };
      } catch (e) {
        return { index, d: 0, l: 0, both: 0, error: e.message };
      }
    });
    await dark(wasDark);
    return results;
  };

  const clear = () =>
    new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(DB);
      request.onsuccess = request.onerror = request.onblocked = () => resolve('cleared');
    });

  window.inboxRebornStyleCheck = { record, compare, overlap, dark, clear, snapshot };
  console.log('inboxRebornStyleCheck ready: record(label), compare(label), overlap(pairs), clear()');
})();
