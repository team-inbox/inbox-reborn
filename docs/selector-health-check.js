/**
 * Inbox Reborn - Gmail selector health check (standalone)
 *
 * Paste this whole file into the DevTools console on https://mail.google.com
 * and press Enter. It checks every Gmail DOM hook the extension depends on
 * and prints a table of what matched and what didn't - so when Google ships
 * a DOM change, the dead hooks are identified in seconds.
 *
 * For the most complete picture, run it three times:
 *   1. with the inbox visible,
 *   2. with a conversation open,
 *   3. with a compose window open.
 * Checks whose required state isn't active are reported as "skipped (state)".
 *
 * Rows marked FAIL are hooks that should always match in their state.
 * Rows marked "new markup?" are detectors for Gmail's 2026 Wiz rebuild: if a
 * NEW-token row matches while its LEGACY twin is 0, Gmail has migrated that
 * surface on this account and the legacy-only rules need the new tokens.
 *
 * Compiled 2026-07 from a cross-reference of this extension's selectors
 * against InboxSDK, FlowCrypt, gmail.js, and Gmail userstyle projects.
 */
(() => {
  // state detectors
  const states = {
    inbox: !!document.querySelector('div[role="main"]'),
    conversation: !!document.querySelector('.nH.a98.iY.aHo, .Bs.nH.iY'),
    compose: !!document.querySelector('.nH.Hd[role="dialog"], [role="dialog"] input[name="subjectbox"]'),
    menu: !!document.querySelector('[role="menu"]'),
    quickSettings: !!document.querySelector('.IU'),
    themeDialog: !!document.querySelector('.uW2Fw-bHo'),
  };

  // { group, selector, expect, state } - state defaults to 'inbox'
  const CHECKS = [
    // core thread list
    { group: 'core threadlist', selector: 'div[role="main"]', expect: 'exactly 1 visible main pane' },
    { group: 'core threadlist', selector: '.oy8Mbf[role=main]', expect: '1 (JS scoping compound; 0 while div[role=main] matches means .oy8Mbf rotated)' },
    { group: 'core threadlist', selector: 'tr.zA', expect: '>=1 thread row in a loaded inbox' },
    { group: 'core threadlist', selector: '.oy8Mbf[role=main] .zA[id]', expect: '>=1; rows need non-empty ids (bundling hide keys)' },
    { group: 'core threadlist (canary)', selector: '[gh="tl"]', expect: '>=1 (stable thread-list anchor)' },
    // date grouping
    { group: 'date headers', selector: '.zA .xW.xY span[title]', expect: '>=1 per row; title parses as full timestamp' },
    { group: 'date headers', selector: '.zA .by1.cL', expect: '>=1 in Snoozed view only (0 in plain inbox is OK)' },
    // bundling
    { group: 'bundling', selector: '.nH.ar4.z', expect: 'exactly 1 (hide-rule scope; 0 = bundled rows duplicate)' },
    { group: 'bundling', selector: '.zA .ar .at', expect: '>=1 on rows with labels' },
    { group: 'bundling', selector: '.zA .at .av', expect: '1 per label chip' },
    { group: 'bundling', selector: '.zA td.WA.xY', expect: '1 per row if importance markers on' },
    { group: 'bundling', selector: '.zA .T-KT.T-KT-Jp', expect: '>=1 when a starred row is visible' },
    { group: 'bundling', selector: '.zA.zE', expect: '>=1 when unread emails visible' },
    { group: 'bundling (tabs)', selector: '.aKz', expect: '1 per enabled category tab' },
    { group: 'bundling (tabs)', selector: '.aAy[aria-selected="true"]', expect: 'exactly 1 when tabs enabled' },
    { group: 'bundling (gate)', selector: '.nZ[data-tooltip="Inbox"]', expect: 'exactly 1 in Inbox view (English UI) - 0 silently disables bundling' },
    // reminders / rows
    { group: 'reminders', selector: '.zA .yW span[email]', expect: '>=1 per row (participants, avatars)' },
    { group: 'reminders', selector: '.zA .y6', expect: '1 per row (subject match)' },
    { group: 'reminders', selector: '.zA .y2', expect: '1 per row (snippet recolor)' },
    { group: 'reminders', selector: '.zA .yP, .zA .zF', expect: '>=1 per row (sender-name spans)' },
    { group: 'avatars', selector: '.zA .oZ-x3', expect: '1 per row (avatar cell)' },
    // calendar
    { group: 'calendar cards', selector: '.zA .bqe, .zA .bog', expect: '>=1 on invite rows' },
    { group: 'calendar cards', selector: '.zA .aKS .aJ6', expect: '>=1 on invite rows, innerText === "RSVP"' },
    { group: 'calendar cards', selector: '.zA .a4W', expect: '1 per row (card insertion point)' },
    // sidebar
    { group: 'sidebar / Done', selector: '.wT .byl', expect: 'exactly 1 (observer root + insertion parent)' },
    { group: 'sidebar / Done', selector: '.wT .byl > .TK', expect: '>=1 (insertBefore reference)' },
    { group: 'sidebar / Done', selector: '.aHS-bu1', expect: 'exactly 1 (Snoozed icon; Done item cloned from it)' },
    { group: 'sidebar / Done', selector: '.aHS-bnq, .aHS-bnu, .aHS-aHO, .aHS-bnx, .aHS-bnv', expect: '5 (Drafts/Sent/All Mail/Trash/Spam) - a missing one makes reorderMenuItems poll forever' },
    { group: 'sidebar / Done', selector: '.TO .nU > .n0', expect: '1 per nav row (label rewrite target)' },
    { group: 'sidebar icons', selector: '.TO .qj', expect: '1 per nav row - 0 blanks all replaced icons' },
    { group: 'sidebar labels', selector: '.qj.aEe', expect: '>=1 when labels have custom colors' },
    { group: 'sidebar labels', selector: '.aAw.FgKVne ~ .yJ', expect: 'exactly 1 - 0 = color observer needs fallback' },
    { group: 'sidebar labels (fallback)', selector: '.aeN .yJ', expect: '>=1 (stable fallback anchor)' },
    { group: 'sidebar (canary)', selector: '.aeN[role="navigation"], .aeN [role="navigation"], .aeN', expect: '>=1 (stable nav co-anchor)' },
    // header
    { group: 'header', selector: 'a[aria-label="Gmail"]', expect: 'exactly 2 - other counts corrupt retitling' },
    { group: 'header', selector: 'header[role="banner"] a[aria-label="Gmail"]', expect: 'exactly 1 (stable anchor now used first)' },
    { group: 'header', selector: '.w-asV.bbg.aiw', expect: 'exactly 1 (pageTitle carrier; 0 kills header colors/titles)' },
    { group: 'header (canary)', selector: 'header[role="banner"]', expect: 'exactly 1' },
    { group: 'account', selector: 'a[aria-label^="Google Account: "]', expect: 'exactly 1 - 0 disables reminders + avatar self-exclusion' },
    { group: 'favicon', selector: 'link[rel*="shortcut icon"]', expect: '>=1' },
    // compose button / FABs
    { group: 'compose/FABs', selector: '.Yh.akV', expect: 'exactly 1 (0 breaks floating compose AND add-reminder)' },
    { group: 'compose/FABs (canary)', selector: '[gh="cm"]', expect: '1 (stable compose anchor)' },
    { group: 'compose/FABs (legacy)', selector: '.T-I.T-I-KE.L3', expect: '0 on current Gmail (legacy fallback)' },
    // compose window (needs compose open)
    { group: 'compose', selector: '.nH.Hd[role="dialog"]', expect: '1 per open compose - 0 while [role=dialog] matches means .nH.Hd rotated (dark menus double-invert)', state: 'compose' },
    { group: 'compose', selector: 'input[peoplekit-id="BbVjBd"]', expect: '1 (build-hashed - expected first casualty; fallbacks now wired)', state: 'compose' },
    { group: 'compose (fallback)', selector: 'input[aria-label="To recipients"], textarea[name="to"]', expect: '>=1 (stable To-field fallback)', state: 'compose' },
    { group: 'compose', selector: 'input[name="subjectbox"]', expect: '1', state: 'compose' },
    { group: 'compose', selector: 'input[name="from"]', expect: '0 or 1 (absent without send-as aliases)', state: 'compose' },
    { group: 'compose', selector: 'div[aria-label="Message Body"]', expect: '1; cross-check twin below', state: 'compose' },
    { group: 'compose (canary)', selector: 'div[role="textbox"][g_editable="true"]', expect: '>=1 (stable body twin)', state: 'compose' },
    { group: 'compose titlebar', selector: '.nH.Hd .Ht', expect: '1 per titlebar on current Gmail (June 2026 markup) - if >0, .Hk/.Hl/.Hq/.Ha rules need re-scoping', state: 'compose' },
    { group: 'compose titlebar', selector: '.Hk, .Hl, .Hq, .Ha', expect: '4 control buttons per compose window', state: 'compose' },
    // side panel / FABs
    { group: 'side panel', selector: 'div[aria-label="Side panel"]', expect: 'exactly 1 - actively churning June 2026' },
    { group: 'side panel (legacy)', selector: 'div[aria-label="Side panel"] .bse-bvF-I.aT5-aOt-I', expect: '>=1 (Calendar/Keep/Tasks, old markup)' },
    { group: 'side panel (new)', selector: 'div[role="complementary"][aria-label="Side panel"] [role="tab"], div[role="complementary"][aria-label="Side panel"] [role="button"]', expect: '>=1 on new markup (fallback now wired)' },
    { group: 'side panel', selector: '#qJTzr', expect: '0 or 1 (get-add-ons button)' },
    { group: 'side panel', selector: '.buW', expect: 'exactly 1 (ResizeObserver target, old markup)' },
    { group: 'side panel (canary)', selector: 'div[role="complementary"][aria-label="Side panel"], div.aUx', expect: '>=1 (stable region)' },
    // dark mode: reading pane (needs a conversation open)
    { group: 'dark: reading pane', selector: '.nH.a98.iY.aHo', expect: 'exactly 1 with conversation open - 0 kills the whole reading-pane dark theme', state: 'conversation' },
    { group: 'dark: reading pane', selector: '.Bs.nH.iY.bAt', expect: '1 with conversation open (card)', state: 'conversation' },
    { group: 'dark: reading pane', selector: '.a3s', expect: '>=1 per open message (body text)', state: 'conversation' },
    { group: 'dark: pills LEGACY', selector: '.amn .ams, .aaq', expect: '>=1 if legacy pill bar served', state: 'conversation' },
    { group: 'dark: pills NEW (new markup?)', selector: '.btDi4d, .DILLkc', expect: 'if >=1 while legacy is 0: Wiz pill bar - now styled as of this fix', state: 'conversation' },
    { group: 'dark: 3-dot LEGACY', selector: '.aap', expect: '>=1 with message open (legacy)', state: 'conversation' },
    { group: 'dark: 3-dot NEW (new markup?)', selector: '.Wsq5Cf', expect: 'if >=1: Wiz 3-dot - now styled as of this fix', state: 'conversation' },
    // dark mode: menus / toolbar / misc
    { group: 'dark: menus', selector: '[role="menu"]', expect: '>=1 while a menu is open (role foundation)', state: 'menu' },
    { group: 'dark: menus LEGACY', selector: '.J-M', expect: '0 on new menu stack is expected', state: 'menu' },
    { group: 'dark: menus NEW (new markup?)', selector: '.tB5Jxf-M-S5Cmsd, ul.aqdrmf-Kf[role="menu"]', expect: 'if >=1: Wiz menus - surface now styled', state: 'menu' },
    { group: 'dark: toolbar', selector: '.D.E.G-atb', expect: '>=1 (mask replacements scope here)' },
    { group: 'dark: toolbar (canary)', selector: '[gh="mtb"], [gh="tm"]', expect: '>=1 (stable toolbar anchors)' },
    { group: 'dark: toolbar', selector: '.G-atb .asa', expect: '>=1 when list toolbar visible (mask glyph wrappers)' },
    { group: 'dark: row hover', selector: '.zA .bqY .bqX', expect: '>=1 (present without hovering)' },
    { group: 'dark: quick settings', selector: '.IU', expect: '1 with Quick Settings open', state: 'quickSettings' },
    { group: 'dark: theme dialog', selector: '.uW2Fw-bHo', expect: '1 with Pick-a-theme open - Wiz-hashed, reverify each build', state: 'themeDialog' },
    // search / One Bar
    { group: 'search', selector: 'form.bas', expect: '1 (search form)' },
    { group: 'search (canary)', selector: 'form[role="search"] input', expect: '>=1 (stable anchor)' },
    { group: 'search / One Bar', selector: '[class*="gb_"]', expect: '>=1; if specific gb_ compounds in style.css match 0, the One Bar build rotated' },
  ];

  const rows = CHECKS.map((c) => {
    const state = c.state || 'inbox';
    if (!states[state]) {
      return { group: c.group, selector: c.selector, count: '-', status: `skipped (open ${state} first)`, expect: c.expect };
    }
    let count;
    try {
      count = document.querySelectorAll(c.selector).length;
    } catch (e) {
      return { group: c.group, selector: c.selector, count: '-', status: 'INVALID SELECTOR', expect: c.expect };
    }
    const zeroExpected = /^0 /.test(c.expect) || /expect(ed)?.*0/.test(c.expect);
    const isCanaryOrNew = /canary|new markup\?|LEGACY|fallback/i.test(c.group);
    const status = count > 0 ? 'ok' : zeroExpected || isCanaryOrNew ? 'note' : 'FAIL';
    return { group: c.group, selector: c.selector, count, status, expect: c.expect };
  });

  const fails = rows.filter((r) => r.status === 'FAIL');
  const skipped = rows.filter((r) => String(r.status).startsWith('skipped'));

  console.group('%cInbox Reborn selector health check', 'font-weight:bold');
  console.table(rows, ['group', 'selector', 'count', 'status']);
  if (fails.length) {
    console.warn(`${fails.length} FAILED hook(s) - Gmail likely changed these:`);
    fails.forEach((f) => console.warn(`  ${f.selector}\n    -> ${f.group}: ${f.expect}`));
  } else {
    console.info('No hard failures in the current state.');
  }
  if (skipped.length) console.info(`${skipped.length} check(s) skipped - re-run with a conversation/compose/menu open to cover them.`);
  console.info('Copy for a bug report:', JSON.stringify(rows.filter((r) => r.status !== 'ok'), null, 1));
  console.groupEnd();
  return rows;
})();
