// The Bundled in the inbox / Unbundled label sections and the drags between them
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

// =============================================================================
// BUNDLED / UNBUNDLED LABEL SECTIONS
// =============================================================================

/* Inbox split the left menu's labels in two. "Bundled in the inbox" held the
   category bundles and the labels whose mail collapsed into bundles;
   "Unbundled" held the labels whose mail showed as single rows. Dragging a
   label from one section to the other switched it over.

   As in Inbox, the categories always bundle and a label bundles only once
   it has been dragged to "Bundled in the inbox", so what is stored
   (chrome.storage.local, per account) is the set of bundled labels. Gmail's
   rows never move: Gmail redraws a row when it changes (a nested label
   expands, a count changes) and looks for it where it left it. The sections
   are made inside Gmail's own label list with CSS order (style.css,
   "BUNDLED / UNBUNDLED LABEL SECTIONS"): copies of the category rows go to
   the top and Gmail's own are hidden, each label row is tagged with its
   section, and an "Unbundled" title sits between the two. Gmail's "Labels"
   title reads "Bundled in the inbox". A nested label follows the label it
   is nested under. */
const LABEL_SECTIONS = { BUNDLED: 'bundled', UNBUNDLED: 'unbundled' };
const LABEL_SECTION_ATTR = 'data-inbox-section';
const DROP_TARGET_ATTR = 'data-drop-target';
const LABEL_SECTION_CLASSES = {
  ON: 'inbox-reborn-label-sections-on', // on <body> while the sections are drawn
  LIST: 'inbox-reborn-label-sections', // Gmail's label list, once split
  TITLE: 'inbox-reborn-section-title', // the Unbundled title row
  ARROW: 'inbox-reborn-section-arrow', // the title's collapse arrow
  COLLAPSED: 'inbox-reborn-unbundled-collapsed', // on the list while Unbundled is folded
  HINT: 'inbox-reborn-section-hint', // how-to row, shown while no label is bundled
  DRAGGING: 'inbox-reborn-label-dragging', // on <body> during a drag
  GHOST: 'inbox-reborn-label-ghost', // the label name under the pointer
  DRAG_SOURCE: 'inbox-reborn-label-drag-source', // the row being dragged
};
const BUNDLED_SECTION_TITLE = 'Bundled in the inbox';
const UNBUNDLED_SECTION_TITLE = 'Unbundled';
const BUNDLED_SECTION_HINT = 'Drag a label up here to bundle its emails in the inbox';

/* Two sets of names, each kept per account in chrome.storage.local under its
   own key: the labels dragged up to Bundled in the inbox, and the categories
   dragged down to Unbundled (labels start unbundled, categories bundled).
   `store` is the stored value, { [account]: names }, null until read;
   `cache` is the signed-in account's share as a Set. */
const bundledLabels = { key: 'bundledLabels', store: null, cache: { account: null, set: null } };
const unbundledCategories = {
  key: 'unbundledCategories',
  store: null,
  cache: { account: null, set: null },
};
const LABEL_SECTION_SETS = [bundledLabels, unbundledCategories];

/* What a drag down archived, per account and bundle name, so a drag up
   brings back exactly that and nothing else:
   { [account]: { [name]: { ids: thread ids (hex), since: "YYYY-MM-DD" } } }
   `since` is the oldest day among them, which bounds the search that finds
   them again. */
const archivedByDrag = { key: 'archivedByDrag', store: null };

/* Whether the Unbundled section is folded up (its rows hidden, the title
   and its arrow left). One setting for every account: it is a way of
   reading the menu, not something about the labels. */
const unbundledCollapsed = { key: 'unbundledCollapsed', value: false };

/**
 * The account the sets belong to, as getSectionSet works it out
 * @returns {string} The address, or 'default' until Gmail has drawn it
 */
const sectionsAccount = () => {
  getSectionSet(bundledLabels);
  return bundledLabels.cache.account;
};

/**
 * What dragging a label or category down archived, if anything
 * @param {string} name - The label or category
 * @returns {{ ids: string[], since: string }|null}
 */
const getArchivedByDrag = (name) => archivedByDrag.store?.[sectionsAccount()]?.[name] || null;

/**
 * Remembers (or, with null, forgets) what dragging a name down archived
 * @param {string} name - The label or category
 * @param {{ ids: string[], since: string }|null} memory - The conversations
 */
const setArchivedByDrag = (name, memory) => {
  const account = sectionsAccount();
  const mine = { ...(archivedByDrag.store?.[account] || {}) };
  if (memory?.ids?.length) mine[name] = memory;
  else delete mine[name];
  archivedByDrag.store = { ...archivedByDrag.store, [account]: mine };
  chrome.storage.local.set({ [archivedByDrag.key]: archivedByDrag.store });
};

/**
 * Reads the two sets from storage and follows later changes (a drop in
 * another Gmail tab)
 */
const loadLabelSections = () => {
  const keys = [
    ...LABEL_SECTION_SETS.map((entry) => entry.key),
    archivedByDrag.key,
    unbundledCollapsed.key,
  ];
  chrome.storage?.local.get(keys, (result) => {
    LABEL_SECTION_SETS.forEach((entry) => {
      entry.store = result[entry.key] || {};
      entry.cache = { account: null, set: null };
    });
    archivedByDrag.store = result[archivedByDrag.key] || {};
    unbundledCollapsed.value = result[unbundledCollapsed.key] === true;
    rebuildBundles();
    layoutLabelSections();
  });
  chrome.storage?.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !instanceActive()) return;
    if (changes[archivedByDrag.key])
      archivedByDrag.store = changes[archivedByDrag.key].newValue || {};
    if (changes[unbundledCollapsed.key]) {
      // Folded or unfolded in another Gmail tab
      unbundledCollapsed.value = changes[unbundledCollapsed.key].newValue === true;
      layoutLabelSections();
    }
    let changed = false;
    LABEL_SECTION_SETS.forEach((entry) => {
      if (!changes[entry.key]) return;
      const next = changes[entry.key].newValue || {};
      if (JSON.stringify(next) === JSON.stringify(entry.store)) return; // this tab's own write
      entry.store = next;
      entry.cache = { account: null, set: null };
      changed = true;
    });
    if (!changed) return;
    rebuildBundles();
    layoutLabelSections();
  });
};

/**
 * One of the sets, for the signed-in account. The account is looked up until
 * Gmail has drawn it; after that the Set is reused.
 * @param {Object} entry - bundledLabels or unbundledCategories
 * @returns {Set<string>} The names (empty until storage has answered)
 */
const getSectionSet = (entry) => {
  if (!entry.cache.account || entry.cache.account === 'default') {
    const account = getMyEmailAddress() || 'default';
    if (entry.cache.account !== account) {
      entry.cache = { account, set: new Set(entry.store?.[account] || []) };
    }
  }
  return entry.cache.set;
};

/**
 * Adds a name to one of the sets or takes it out, and saves the set
 * @param {Object} entry - bundledLabels or unbundledCategories
 * @param {string} name - The label or category
 * @param {boolean} present - True to add
 * @returns {boolean} True when the set changed
 */
const updateSectionSet = (entry, name, present) => {
  const set = getSectionSet(entry);
  if (set.has(name) === present) return false;
  if (present) set.add(name);
  else set.delete(name);
  entry.store = { ...entry.store, [entry.cache.account]: [...set].sort() };
  chrome.storage.local.set({ [entry.key]: entry.store });
  return true;
};

/**
 * Whether the left menu is split into the two sections: bundling is on and
 * the stored sets have been read
 * @returns {boolean} True when the sections are drawn
 */
const areLabelSectionsOn = () =>
  options.emailBundling === 'enabled' && LABEL_SECTION_SETS.every((entry) => !!entry.store);

/**
 * Whether a name is one of the seven categories drawn at the top of the
 * label list
 * @param {string} name - A label or category name
 * @returns {boolean} True for Travel, Purchases, Finance, Social, Updates,
 *   Forums or Promotions
 */
const isCategoryName = (name) => CATEGORY_MENU_ORDER.includes(name);

/**
 * Whether a category's mail bundles in the inbox: it bundles unless it was
 * dragged to Unbundled, and - for Purchases, Travel and Finance, which Gmail
 * marks nowhere on a row - unless its switch in the options is off
 * @param {string} name - A category name
 * @returns {boolean} True for a bundling category
 */
const isCategoryBundled = (name) =>
  !getSectionSet(unbundledCategories).has(name) &&
  (!(name in CATEGORY_BUNDLE_OPTIONS) || !!options[CATEGORY_BUNDLE_OPTIONS[name]]);

/**
 * A label and the labels it is nested under, outermost first
 * @param {string} label - e.g. "Work/Projects/Alpha"
 * @returns {string[]} e.g. ["Work", "Work/Projects", "Work/Projects/Alpha"]
 */
const labelAndParents = (label) =>
  label.split('/').map((_, i, parts) => parts.slice(0, i + 1).join('/'));

/**
 * Whether a label's or category's mail bundles in the inbox: a category does
 * until dragged to Unbundled (isCategoryBundled); a label does once it (or a
 * label it is nested under) was dragged to "Bundled in the inbox". No label
 * bundles until storage has answered.
 * @param {string} label - The label or category name
 * @returns {boolean} True for a bundled label
 */
const isLabelBundled = (label) => {
  if (isCategoryName(label)) return isCategoryBundled(label);
  if (!bundledLabels.store || hasUnbundledParentLabel(label)) return false;
  return labelAndParents(label).some((name) => getSectionSet(bundledLabels).has(name));
};

/**
 * Whether a left-menu row can be dragged between the sections: the
 * categories and top-level labels. Nested labels follow their parent, and
 * labels under an "Unbundled" label are unbundled by name.
 * @param {string} label - The label or category name
 * @returns {boolean} True when the row can be dragged
 */
const isLabelDraggable = (label) =>
  !!label && !label.includes('/') && !hasUnbundledParentLabel(label);

/**
 * Takes the inbox back to plain rows, so the next pass (updateReminders)
 * bundles it again by the current rules
 */
const rebuildBundles = () => {
  closeBundleMenu(false);
  document
    .querySelectorAll(`.${CSS_CLASSES.BUNDLED_EMAIL}, .${CSS_CLASSES.UNBUNDLED_EMAIL}`)
    .forEach((el) => el.classList.remove(CSS_CLASSES.BUNDLED_EMAIL, CSS_CLASSES.UNBUNDLED_EMAIL));
  document.querySelectorAll(`.${CSS_CLASSES.BUNDLE_WRAPPER}`).forEach((el) => el.remove());
  [...hiddenEmailIds].forEach(removeStyleNodeWithEmailId);
  document.querySelectorAll('.time-row[hidden]').forEach((row) => (row.hidden = false));
};

/**
 * Moves a label or category into or out of "Bundled in the inbox", saves
 * it, and redraws the left menu and the inbox. Dragging Purchases, Travel or
 * Finance up while its switch in the options is off turns the switch on
 * (which reloads the page, as any change to the options does).
 * @param {string} name - A category or top-level label name
 * @param {boolean} bundled - True to start bundling it
 */
const setLabelBundled = (name, bundled) => {
  let turnOnOption = null;
  if (!isCategoryName(name)) {
    if (!updateSectionSet(bundledLabels, name, bundled)) return;
  } else {
    updateSectionSet(unbundledCategories, name, !bundled);
    const optionKey = CATEGORY_BUNDLE_OPTIONS[name];
    if (bundled && optionKey && !options[optionKey]) turnOnOption = optionKey;
  }
  rebuildBundles();
  layoutLabelSections();
  // The mail moves first: turning the switch on reloads the page
  moveLabelMail(name, bundled).then(() => {
    if (!turnOnOption) return;
    chrome.storage.local.get('options', (result) => {
      chrome.storage.local.set({ options: { ...result.options, [turnOnOption]: true } });
    });
  });
};

// ---------------------------------------------------------------------------
// A label's mail follows it between the sections
// ---------------------------------------------------------------------------

/* Dragged down, a label's or category's inbox mail is archived, and what
   went is remembered (archivedByDrag). Dragged up, exactly those
   conversations come back to the inbox - never the rest of the archive,
   which for a category can be years of mail someone reads on their phone
   too. Both go through Gmail's own list and toolbar: open the search for
   that mail, tick the rows (the page's select-all box when archiving, the
   remembered rows when restoring), press Archive or Move to Inbox, and
   again until done (Gmail offers no "select all conversations" link on a
   search), then go back to where the drag started. Gmail's Undo toast and
   sync apply as if done by hand. The page limit below is where a move
   stops and says so. */
const LABEL_MAIL_PAGE_LIMIT = 50; // pages of up to 100 threads - a safety stop
const LIST_WAIT_TRIES = 100; // 100ms apart: 10s for Gmail to show a list
const TOAST_CLASS = 'inbox-reborn-toast';
let movingLabelMail = false;

/**
 * Gmail's search for the mail a drag moves
 * @param {string} label - The label or category name
 * @param {boolean} intoInbox - True for the archived mail, false for the inbox mail
 * @returns {string} The query, e.g. "label:Cruise -in:inbox" or
 *   "in:inbox category:finance"
 */
const labelMailQuery = (label, intoInbox) => {
  const term = isCategoryName(label)
    ? `category:${label.toLowerCase()}`
    : `label:${searchLabel(label)}`;
  return intoInbox ? `${term} -in:inbox` : `in:inbox ${term}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isShown = (el) => !!el && el.getClientRects().length > 0;
const firstShown = (nodes) => [...nodes].find(isShown);

/**
 * Polls until test() returns something, LIST_WAIT_TRIES times 100ms apart
 * @param {Function} test - Returns the value waited for, or a falsy value
 * @param {number} [tries] - Attempts
 * @returns {Promise<*>} The value, or null on timeout
 */
const pollFor = async (test, tries = LIST_WAIT_TRIES) => {
  for (let i = 0; i < tries; i++) {
    const value = test();
    if (value) return value;
    await sleep(100);
  }
  return null;
};

/**
 * The thread list Gmail is showing, with its visible rows - or null while
 * Gmail is between lists. An empty search shows Gmail's "No messages
 * matched" note (.TC) and counts as a list with no rows. Gmail keeps one
 * list pane and hides the others with display: none; the pane carries
 * role="main" in the inbox but not on a search, so the role isn't used (the
 * left menu is a .oy8Mbf too, with role="navigation").
 * @returns {{ pane: Element, rows: Element[] }|null}
 */
const shownList = () => {
  const pane = firstShown(document.querySelectorAll('.oy8Mbf:not([role=navigation])'));
  if (!pane) return null;
  const rows = [...pane.querySelectorAll('.zA')].filter(isShown);
  if (rows.length) return { pane, rows };
  return firstShown(document.querySelectorAll('.TC')) ? { pane, rows: [] } : null;
};

/**
 * A small status note at the bottom left, in place of Gmail's toasts while
 * the mail is being moved
 * @param {string} text - What to say
 */
const showToast = (text) => {
  let toast = document.querySelector(`.${TOAST_CLASS}`);
  if (!toast) {
    toast = createEl('div', TOAST_CLASS, { role: 'status' });
    document.body.append(toast);
  }
  toast.textContent = text;
};

const hideToast = () => document.querySelector(`.${TOAST_CLASS}`)?.remove();

/**
 * Opens a Gmail search and waits for its list: another list element, a new
 * title, rows that weren't there, or an empty result where there were rows
 * @param {string} query - The search
 * @returns {Promise<{ pane: Element, rows: Element[] }|null>} The list, or
 *   null if Gmail showed nothing in time
 */
const openSearch = (query) => {
  const startList = shownList();
  const startTitle = document.title;
  const startIds = new Set((startList?.rows || []).map(getThreadId));
  window.location.hash = toSearchHash(query);
  return pollFor(() => {
    const shown = shownList();
    if (!shown) return null;
    const changed =
      shown.pane !== startList?.pane ||
      document.title !== startTitle ||
      (shown.rows.length ? !startIds.has(getThreadId(shown.rows[0])) : startList?.rows.length > 0);
    return changed ? shown : null;
  });
};

/**
 * Presses a button on the shown toolbar
 * @param {string} selector - Within .G-atb
 * @returns {boolean} False if Gmail isn't showing it
 */
const pressToolbar = (selector) => {
  const button = firstShown(document.querySelectorAll(`.G-atb ${selector}`));
  if (!button || button.getAttribute('aria-disabled') === 'true') return false;
  simulateClick(button);
  return true;
};

/** A date as "YYYY-MM-DD" in local time, which sorts as text */
const localDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Gmail's "after:" date for a remembered day: the day before it, in Gmail's
 * YYYY/MM/DD, so the day itself is covered whichever way Gmail reads "after"
 * @param {string} day - "YYYY-MM-DD"
 * @returns {string} e.g. "2026/10/31"
 */
const searchAfter = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  const before = new Date(y, m - 1, d - 1);
  return `${before.getFullYear()}/${before.getMonth() + 1}/${before.getDate()}`;
};

/**
 * Ticks the page's select-all box and presses a toolbar action, page after
 * page, until the shown search is empty or the page limit is reached
 * @param {{ pane: Element, rows: Element[] }|null} list - The search's first page
 * @param {number} action - Gmail's act id: 7 Archive, 8 Move to Inbox
 * @param {Function} progress - Called with the running count
 * @param {Function} [onRows] - Called with each page's rows before they go
 * @returns {Promise<{ moved: number, more: boolean }>} How many went, and
 *   whether rows were left when the page limit stopped it
 */
const moveShownPages = async (list, action, progress, onRows) => {
  let moved = 0;
  let page = 0;
  for (; list && list.rows.length && page < LABEL_MAIL_PAGE_LIMIT; page++) {
    const { rows } = list;
    const toolbar = firstShown(document.querySelectorAll('.G-atb'));
    const selectAll = toolbar && firstShown(toolbar.querySelectorAll('[role=checkbox]'));
    if (!selectAll) break;
    if (selectAll.getAttribute('aria-checked') !== 'true') simulateClick(selectAll);
    const selected = await pollFor(
      () =>
        selectAll.getAttribute('aria-checked') === 'true' &&
        rows.some((row) => row.classList.contains('x7')),
      30,
    );
    if (!selected) break;
    if (onRows) onRows(rows);
    if (!pressToolbar(`[act="${action}"]`)) break;
    moved += rows.length;
    progress(moved);
    // Gmail takes these rows out, then shows the next page or its empty note
    list = await pollFor(() => (rows.some(isShown) ? null : shownList()));
  }
  return { moved, more: page >= LABEL_MAIL_PAGE_LIMIT && !!list?.rows.length };
};

/**
 * How many conversations the shown search has, from Gmail's "1–50 of 123"
 * counter. Gmail says "many" past a point.
 * @returns {string} e.g. "123 conversations" or "more than 100 conversations"
 */
const shownCount = () => {
  const counter = firstShown(document.querySelectorAll('.Dj'))?.textContent || '';
  const total = counter.match(/\d[\d,.]*\s*$/)?.[0].trim();
  if (!total) return 'more than 100 conversations';
  return total === '1' ? '1 conversation' : `${total} conversations`;
};

const DIALOG_CLASS = 'inbox-reborn-dialog';

/**
 * Asks before a drag up moves mail into the inbox
 * @param {string} label - The label or category name
 * @param {string[]} lines - What will move, a paragraph each
 * @returns {Promise<boolean>} True on Move
 */
const askToMove = (label, lines) =>
  new Promise((resolve) => {
    const button = (text, className) =>
      createEl('button', `inbox-reborn-dialog-button ${className}`, { type: 'button' }, [text]);
    const cancel = button('Cancel', 'is-cancel');
    const move = button('Move to inbox', 'is-move');
    const dialog = createEl(
      'div',
      DIALOG_CLASS,
      { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'inbox-reborn-dialog-title' },
      [
        createEl('div', 'inbox-reborn-dialog-card', {}, [
          createEl('h2', 'inbox-reborn-dialog-title', { id: 'inbox-reborn-dialog-title' }, [
            `Bring ${label} into the inbox?`,
          ]),
          ...lines.map((line) => createEl('p', 'inbox-reborn-dialog-text', {}, [line])),
          createEl('p', 'inbox-reborn-dialog-text', {}, [
            `Cancel keeps ${label} bundled; its bundle fills as new mail arrives.`,
          ]),
          createEl('div', 'inbox-reborn-dialog-actions', {}, [cancel, move]),
        ]),
      ],
    );
    const finish = (answer) => {
      dialog.remove();
      window.removeEventListener('keydown', onKey, true);
      resolve(answer);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
      else if (e.key === 'Enter') finish(true);
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    cancel.addEventListener('click', () => finish(false));
    move.addEventListener('click', () => finish(true));
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) finish(false);
    });
    window.addEventListener('keydown', onKey, true);
    document.body.append(dialog);
    move.focus();
  });

/**
 * Archives the inbox mail of a label or category a page at a time, and
 * remembers every conversation it archived so a drag up can bring exactly
 * those back
 * @param {string} label - The label or category name
 */
const archiveInboxMail = async (label) => {
  showToast(`Archiving ${label}…`);
  const memory = getArchivedByDrag(label);
  const ids = new Set(memory?.ids || []);
  let since = memory?.since || null;

  const list = await openSearch(labelMailQuery(label, false));
  const { moved, more } = await moveShownPages(
    list,
    7,
    (count) => showToast(`Archiving ${label}… ${count}`),
    (rows) => {
      // Remember what is about to go, and how far back it reaches
      rows.forEach((row) => {
        const id = getThreadId(row);
        if (id) ids.add(id);
        const date = getDate(getRawDate(row));
        if (date && !Number.isNaN(date.getTime())) {
          const day = localDay(date);
          if (!since || day < since) since = day;
        }
      });
    },
  );

  if (moved) setArchivedByDrag(label, { ids: [...ids], since: since || localDay(new Date()) });

  const what = moved === 1 ? '1 conversation' : `${moved} conversations`;
  showToast(
    moved
      ? `Archived ${what}${more ? ' so far - drag again for the rest' : ''}`
      : `${label} has no mail in the inbox`,
  );
};

/**
 * Brings back into the inbox the conversations a drag down archived - those
 * and no others. Walks Gmail's search for the label's or category's archived
 * mail, bounded to the days those conversations are from, ticking the
 * remembered rows on each page and pressing Move to Inbox, and paging with
 * Older where a page has none.
 * @param {string} label - The label or category name
 * @param {{ ids: string[], since: string }} memory - What a drag down archived
 */
const restoreRemembered = async (label, memory) => {
  const count = memory.ids.length === 1 ? '1 conversation' : `${memory.ids.length} conversations`;
  const lines = [
    `The ${count} that dragging ${label} down archived will move back to the inbox and show in its bundle. Nothing else moves.`,
  ];
  if (!(await askToMove(label, lines))) {
    showToast(`${label} stays bundled; its bundle fills as mail arrives`);
    return;
  }
  showToast(`Bringing ${label} back into the inbox…`);
  const remaining = new Set(memory.ids);
  let moved = 0;
  let pages = 0;
  let scannedAll = false;

  let list = await openSearch(`${labelMailQuery(label, true)} after:${searchAfter(memory.since)}`);
  for (let step = 0; list && remaining.size && step < LABEL_MAIL_PAGE_LIMIT * 2; step++) {
    if (!list.rows.length) {
      scannedAll = true;
      break;
    }
    const wanted = list.rows.filter((row) => remaining.has(getThreadId(row)));
    if (wanted.length) {
      selectOnlyEmails(list.pane, wanted);
      const selected = await pollFor(() => wanted.every((row) => row.classList.contains('x7')), 30);
      if (!selected || !pressToolbar('[act="8"]')) break;
      wanted.forEach((row) => remaining.delete(getThreadId(row)));
      moved += wanted.length;
      showToast(`Bringing ${label} back into the inbox… ${moved}`);
      // Gmail takes them out and fills the page from the next ones
      list = await pollFor(() => (wanted.some(isShown) ? null : shownList()));
    } else {
      // Nothing of ours on this page: the next one, if there is one
      const firstId = getThreadId(list.rows[0]);
      if (
        ++pages >= LABEL_MAIL_PAGE_LIMIT ||
        !pressToolbar('.amD.T-I-Js-Gs, [aria-label="Older"]')
      ) {
        scannedAll = pages < LABEL_MAIL_PAGE_LIMIT;
        break;
      }
      list = await pollFor(() => {
        const shown = shownList();
        return shown && (!shown.rows.length || getThreadId(shown.rows[0]) !== firstId)
          ? shown
          : null;
      });
    }
  }

  // Found or gone for good (deleted, moved by hand): forget them. Stopped
  // early: keep the rest for another drag.
  setArchivedByDrag(
    label,
    remaining.size && !scannedAll ? { ids: [...remaining], since: memory.since } : null,
  );

  const what = moved === 1 ? '1 conversation' : `${moved} conversations`;
  const more = remaining.size && !scannedAll ? ' so far - drag again for the rest' : '';
  showToast(
    moved
      ? `Brought ${what} back into the inbox${more}`
      : `The archived ${label} mail is no longer there`,
  );
};

/**
 * A drag up with nothing remembered: shows the name's archived mail and asks
 * before moving all of it into the inbox
 * @param {string} label - The label or category name
 */
const offerWholeArchive = async (label) => {
  showToast(`Looking for archived ${label} mail…`);
  const list = await openSearch(labelMailQuery(label, true));
  if (!list?.rows.length) {
    showToast(`${label} has no archived mail; its bundle fills as mail arrives`);
    return;
  }
  hideToast();
  const lines = [
    `All of ${label}'s archived mail - ${shownCount()}, the list behind this - will move to the inbox and show in its bundle. Mail in Trash and Spam stays where it is.`,
  ];
  if (!(await askToMove(label, lines))) {
    showToast(`${label} stays bundled; its bundle fills as mail arrives`);
    return;
  }
  showToast(`Moving ${label} into the inbox…`);
  const { moved, more } = await moveShownPages(list, 8, (count) =>
    showToast(`Moving ${label} into the inbox… ${count}`),
  );
  const what = moved === 1 ? '1 conversation' : `${moved} conversations`;
  showToast(
    moved
      ? `Moved ${what} into the inbox${more ? ' so far - drag again for the rest' : ''}`
      : `Couldn't move ${label}'s mail`,
  );
};

/**
 * Moves a label's or category's mail with it. Dragged down, its inbox mail
 * is archived and remembered. Dragged up, what a drag down archived comes
 * back; with nothing remembered, the person is shown the archive and asked
 * before all of it moves in. Returns to the view the drag started in. One
 * move at a time; a drag during a move only changes the section.
 * @param {string} label - The label or category name
 * @param {boolean} intoInbox - True for a drag up
 */
const moveLabelMail = async (label, intoInbox) => {
  if (movingLabelMail) return;
  movingLabelMail = true;
  const returnHash = getViewHash();
  try {
    if (!intoInbox) await archiveInboxMail(label);
    else {
      const memory = getArchivedByDrag(label);
      if (memory?.ids?.length) await restoreRemembered(label, memory);
      else await offerWholeArchive(label);
    }
  } catch (e) {
    console.warn(`[Inbox Reborn] Moving ${label}'s mail stopped (${e.message})`);
    showToast(`Couldn't finish moving ${label}'s mail`);
  } finally {
    document.querySelector(`.${DIALOG_CLASS}`)?.remove();
    window.location.hash = returnHash;
    movingLabelMail = false;
    setTimeout(hideToast, 4000);
  }
};

/**
 * The full name of the label a left-menu row shows ("Software/Chess" - the
 * row's tooltip only has the last part)
 * @param {Element} row - A label row (.aim)
 * @returns {string} The label name, or '' for other rows
 */
const getLabelRowName = (row) => {
  const href = row.querySelector('a[href*="#label/"]')?.getAttribute('href') || '';
  return href ? decodeHashPart(href.split('#label/')[1] || '') : '';
};

/**
 * Gmail's label rows in the label list - not the category copies or the title
 * @param {Element} list - The label list (.zw > .TK)
 * @returns {Element[]} The rows
 */
const getLabelRows = (list) =>
  [...list.children].filter(
    (row) =>
      row.classList.contains('aim') &&
      !row.classList.contains('inbox-reborn-category') &&
      getLabelRowName(row),
  );

/**
 * Gmail's own row for a category, wherever Gmail drew it
 * @param {string} name - The category name
 * @returns {Element|undefined} The row (.aim)
 */
const getGmailCategoryRow = (name) =>
  [...document.querySelectorAll(`.TO[data-tooltip="${name}"]`)]
    .map((row) => row.closest('.aim'))
    .find((row) => row && !row.classList.contains('inbox-reborn-category'));

/**
 * Draws the category rows at the top of the label list, in Inbox's order:
 * copies of Gmail's own rows (which the stylesheet hides while the sections
 * are on) plus Travel and Finance. Only adds what is missing. A category
 * hidden from the label list in Gmail's settings stays hidden; Travel and
 * Finance are drawn even when every category is, from a copy of a system
 * row (getFallbackTemplateRow).
 * @param {Element} list - The label list
 */
const placeCategoryRows = (list) => {
  const gmailRows = Object.fromEntries(
    CATEGORY_MENU_ORDER.map((name) => [name, getGmailCategoryRow(name)]),
  );
  const template =
    CATEGORY_MENU_ORDER.map((name) => gmailRows[name]).find(Boolean) || getFallbackTemplateRow();
  if (!template) return;

  const copies = new Set(
    [...list.querySelectorAll(':scope > .inbox-reborn-category .TO')].map((row) =>
      row.getAttribute('data-tooltip'),
    ),
  );
  const wanted = (name) => gmailRows[name] || EXTRA_CATEGORIES.includes(name);
  if (CATEGORY_MENU_ORDER.every((name) => copies.has(name) || !wanted(name))) return;

  // Normalize first so copies carry a .qj for the icon rules
  normalizeSidebarIcons();
  CATEGORY_MENU_ORDER.forEach((name) => {
    const source = gmailRows[name];
    if (copies.has(name) || !wanted(name)) return;
    // Gmail's rows keep their own page; Travel and Finance work theirs out
    const href = source && !EXTRA_CATEGORIES.includes(name) ? source.querySelector('a')?.href : '';
    list.append(
      buildCategoryMenuItem(source || template, name, href ? `#${href.split('#')[1]}` : undefined),
    );
  });
  updateCategoryHighlight();
};

/**
 * Folds the Unbundled section up or out and saves which, for every tab
 * @param {boolean} collapsed - True to fold it up
 */
const setUnbundledCollapsed = (collapsed) => {
  if (unbundledCollapsed.value === collapsed) return;
  unbundledCollapsed.value = collapsed;
  chrome.storage.local.set({ [unbundledCollapsed.key]: collapsed });
  layoutLabelSections();
};

/**
 * Draws the saved fold on the list and its arrow; only writes a change
 * @param {Element} list - The label list
 */
const applyUnbundledCollapsed = (list) => {
  const collapsed = unbundledCollapsed.value;
  if (list.classList.contains(LABEL_SECTION_CLASSES.COLLAPSED) !== collapsed) {
    list.classList.toggle(LABEL_SECTION_CLASSES.COLLAPSED, collapsed);
  }
  const arrow = list.querySelector(`:scope > .${LABEL_SECTION_CLASSES.TITLE} [role="button"]`);
  if (!arrow) return;
  const expanded = String(!collapsed);
  if (arrow.getAttribute('aria-expanded') !== expanded) {
    arrow.setAttribute('aria-expanded', expanded);
    arrow.setAttribute('aria-label', collapsed ? 'Show Unbundled' : 'Hide Unbundled');
  }
};

/**
 * Builds the Unbundled title row: the arrow that folds the section up, then
 * the title, laid out like Gmail's More row (the chevron is Gmail's own
 * expand_more, drawn in the title's color so it reads in light and dark
 * mode). The whole row toggles.
 * @returns {Element} The title row
 */
const buildUnbundledTitle = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z');
  svg.append(path);

  const arrow = createEl(
    'span',
    LABEL_SECTION_CLASSES.ARROW,
    { role: 'button', tabindex: '0', 'aria-expanded': 'true', 'aria-label': 'Hide Unbundled' },
    [svg],
  );
  const title = createEl(
    'div',
    LABEL_SECTION_CLASSES.TITLE,
    { role: 'heading', 'aria-level': '2' },
    [arrow, createEl('span', '', {}, [UNBUNDLED_SECTION_TITLE])],
  );

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setUnbundledCollapsed(!unbundledCollapsed.value);
  };
  title.addEventListener('click', toggle);
  arrow.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') toggle(e);
  });
  return title;
};

/**
 * Splits Gmail's label list into the two sections (or leaves it alone while
 * bundling is off). Runs on every change to the list and on a timer, and
 * only writes what differs, so a redrawn row is tagged before it is painted.
 */
const layoutLabelSections = () => {
  const list = select.labelList();
  const on = !!list && areLabelSectionsOn();
  toggleBodyClass(LABEL_SECTION_CLASSES.ON, on);
  if (!on) return;

  // Only write a change: adding a class that is there still rewrites the
  // attribute, which woke the label-color observer twice a second
  if (!list.classList.contains(LABEL_SECTION_CLASSES.LIST)) {
    list.classList.add(LABEL_SECTION_CLASSES.LIST);
  }
  const title = select.labelListTitle();
  if (title && title.textContent !== BUNDLED_SECTION_TITLE) {
    title.textContent = BUNDLED_SECTION_TITLE;
  }

  placeCategoryRows(list);

  // The how-to row (below the categories, until a label joins them) and the
  // Unbundled title
  if (!list.querySelector(`:scope > .${LABEL_SECTION_CLASSES.TITLE}`)) {
    list.append(
      createEl('div', LABEL_SECTION_CLASSES.HINT, {}, [BUNDLED_SECTION_HINT]),
      buildUnbundledTitle(),
    );
  }
  applyUnbundledCollapsed(list);

  const tag = (row, bundled) => {
    const section = bundled ? LABEL_SECTIONS.BUNDLED : LABEL_SECTIONS.UNBUNDLED;
    if (row.getAttribute(LABEL_SECTION_ATTR) !== section) {
      row.setAttribute(LABEL_SECTION_ATTR, section);
    }
  };

  // The categories: in Inbox's order at the top (style.css) or, dragged to
  // Unbundled, in that order ahead of the unbundled labels
  list.querySelectorAll(':scope > .inbox-reborn-category').forEach((row) => {
    const name = row.querySelector('.TO')?.getAttribute('data-tooltip');
    const bundled = isCategoryBundled(name);
    tag(row, bundled);
    const order = bundled ? '' : String(300 + CATEGORY_MENU_ORDER.indexOf(name));
    if (row.style.order !== order) row.style.order = order;
  });

  let bundledCount = 0;
  getLabelRows(list).forEach((row) => {
    const bundled = isLabelBundled(getLabelRowName(row));
    if (bundled) bundledCount++;
    tag(row, bundled);
  });
  // classList.toggle(name, force) rewrites the attribute even when nothing
  // changes (Chrome), so check first
  if (list.classList.contains('has-bundled-labels') !== bundledCount > 0) {
    list.classList.toggle('has-bundled-labels', bundledCount > 0);
  }
};

/**
 * Keeps the sections in step with Gmail's label list: Gmail redraws rows as
 * labels expand, collapse, get created or renamed
 */
const watchLabelList = () => {
  waitForElement('.wT .zw', (zw) => {
    new MutationObserver(layoutLabelSections).observe(zw, { childList: true, subtree: true });
    layoutLabelSections();
  });
};

/**
 * Lets a label row be dragged between the two sections. Gmail's rows don't
 * drag natively, so this follows the pointer itself: past a few pixels the
 * label's name follows the pointer, the section under it lights up, and
 * releasing over the other section moves the label there. The click Gmail
 * would take from the release (opening the label) is swallowed.
 */
const watchLabelSectionDrags = () => {
  let drag = null; // { row, label, x, y, ghost }

  // The section under a point. Looks through everything stacked there, as
  // Gmail lays a transparent layer over the page while the button is down.
  const sectionAt = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.closest(`.aAw, .${LABEL_SECTION_CLASSES.HINT}`)) return LABEL_SECTIONS.BUNDLED;
      if (el.closest(`.${LABEL_SECTION_CLASSES.TITLE}`)) return LABEL_SECTIONS.UNBUNDLED;
      const row = el.closest(`.${LABEL_SECTION_CLASSES.LIST} > .aim`);
      if (row) return row.getAttribute(LABEL_SECTION_ATTR);
    }
    return null;
  };

  const setDropTarget = (section) => {
    [select.labelList(), select.labelListTitle()?.closest('.aAw')].forEach((el) => {
      if (!el) return;
      if (section) el.setAttribute(DROP_TARGET_ATTR, section);
      else el.removeAttribute(DROP_TARGET_ATTR);
    });
  };

  const stopDrag = () => {
    const current = drag;
    drag = null;
    if (!current?.ghost) return;
    current.ghost.remove();
    current.row.classList.remove(LABEL_SECTION_CLASSES.DRAG_SOURCE);
    removeClassFromBody(LABEL_SECTION_CLASSES.DRAGGING);
    setDropTarget(null);
  };

  const swallowClick = (e) => {
    e.stopImmediatePropagation();
    e.preventDefault();
  };
  const swallowNextClick = () => {
    window.addEventListener('click', swallowClick, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallowClick, true), 500);
  };

  window.addEventListener(
    'pointerdown',
    (e) => {
      stopDrag();
      if (e.button !== 0 || !e.isTrusted || !areLabelSectionsOn()) return;
      const row = e.target.closest?.(`.${LABEL_SECTION_CLASSES.LIST} > .aim`);
      if (!row) return;
      // The label's ⋮ menu and the nested-labels arrow keep Gmail's behavior
      if (e.target.closest('.nL, .TH')) return;
      const label = row.classList.contains('inbox-reborn-category')
        ? row.querySelector('.TO')?.getAttribute('data-tooltip')
        : getLabelRowName(row);
      if (!isLabelDraggable(label)) return;
      drag = { row, label, x: e.clientX, y: e.clientY, ghost: null };
    },
    true,
  );

  window.addEventListener(
    'pointermove',
    (e) => {
      if (!drag) return;
      if (!drag.ghost) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD_PX) return;
        const name = drag.row.querySelector('.n0, a')?.textContent?.trim() || drag.label;
        drag.ghost = createEl('div', LABEL_SECTION_CLASSES.GHOST, {}, [name]);
        document.body.append(drag.ghost);
        drag.row.classList.add(LABEL_SECTION_CLASSES.DRAG_SOURCE);
        addClassToBody(LABEL_SECTION_CLASSES.DRAGGING);
      }
      drag.ghost.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
      setDropTarget(sectionAt(e.clientX, e.clientY));
    },
    true,
  );

  const endDrag = (e) => {
    if (!drag) return;
    if (!drag.ghost) {
      drag = null; // a click, not a drag
      return;
    }
    const { label } = drag;
    const target = e.type === 'pointerup' ? sectionAt(e.clientX, e.clientY) : null;
    stopDrag();
    swallowNextClick();
    if (target) setLabelBundled(label, target === LABEL_SECTIONS.BUNDLED);
  };
  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('pointercancel', endDrag, true);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drag?.ghost) stopDrag();
  });
};

/**
 * Inserts a "Done" menu item in the sidebar
 */
const insertDoneMenuItem = () => {
  // Prevent duplicate Done menu item
  if (document.querySelector('.TO.inbox-reborn-done')) return;

  // Normalize first so the cloned row carries a .qj for the icon swap below
  normalizeSidebarIcons();

  const snoozedTO = document.querySelector('.aHS-bu1')?.closest('.TO');
  if (!snoozedTO) return;

  // Clone snoozed menu item and change to Done
  const doneTO = snoozedTO.cloneNode(true);
  doneTO.classList.remove('aHS-bu1');
  doneTO.classList.add('inbox-reborn-done');
  doneTO.classList.remove('nZ'); // remove highlight

  // The icon is painted by style.css ("DONE MENU ROW")

  // Fix label and link
  const labelContainer = doneTO.querySelector('.nU');
  if (labelContainer) {
    // Remove any existing children (like <a>)
    labelContainer.innerHTML = '';
    // Insert the visible label as a span
    const visibleLabel = document.createElement('span');
    visibleLabel.className = 'n0';
    visibleLabel.textContent = 'Done';
    labelContainer.appendChild(visibleLabel);
  }

  // Create the absolutely positioned <a> for clickability
  let link = doneTO.querySelector('a');
  if (!link) {
    link = document.createElement('a');
    link.href = '#archive';
    link.setAttribute('aria-label', 'Done');
    link.className = 'inbox-reborn-done-link';
    link.style.position = 'absolute';
    link.style.left = '0';
    link.style.top = '0';
    link.style.width = '100%';
    link.style.height = '100%';
    link.style.zIndex = '2';
    link.style.background = 'none';
    link.onclick = function (e) {
      e.preventDefault();
      window.location.hash = '#archive';
    };
    doneTO.appendChild(link);
  }

  // Make the whole row clickable
  doneTO.onclick = function (e) {
    if (e.target.tagName.toLowerCase() !== 'a') {
      window.location.hash = '#archive';
    }
  };

  // Insert after Snoozed
  snoozedTO.parentNode.insertBefore(doneTO, snoozedTO.nextSibling);
  updateDoneHighlight();
};

/**
 * Highlights the Done row while its view is showing. Gmail rebuilds the
 * menu now and then, so the row is looked up each time rather than kept.
 */
const updateDoneHighlight = () => {
  if (!instanceActive()) return;
  const doneMenu = document.querySelector('.TO.inbox-reborn-done');
  if (!doneMenu) return;
  const active = getViewHash() === '#archive';
  doneMenu.classList.toggle('nZ', active);
  if (active) document.querySelector('.aHS-bu1')?.closest('.TO')?.classList.remove('nZ');
};

window.addEventListener('hashchange', updateDoneHighlight);

/**
 * The Reminders row the extension adds to the left menu: starred inbox mail
 * plus emails to yourself with "reminder" in the subject
 */
const REMINDERS_SEARCH = 'in:inbox (is:starred OR (from:me to:me subject:reminder))';
const REMINDERS_CLASS = 'inbox-reborn-reminders';

/**
 * Highlights the Reminders row while its search is showing
 */
const updateRemindersHighlight = () => {
  if (!instanceActive()) return;
  const row = document.querySelector(`.${REMINDERS_CLASS} .TO`);
  if (!row) return;
  const active = getViewHash() === toSearchHash(REMINDERS_SEARCH);
  row.classList.toggle('nZ', active);
  row.classList.toggle('aiq', active);
};

/**
 * Adds a Reminders row to the system group, built from a copy of Sent's row
 * with Gmail's ids, click wiring, count and Sent marker stripped so it acts
 * only as a link to REMINDERS_SEARCH.
 *
 * The row is appended after Gmail's own and the group is put in order with
 * CSS (style.css, "SYSTEM MENU ORDER"). Gmail updates the menu by position,
 * so inserting or moving rows between its own made it draw All Mail twice.
 */
const insertRemindersMenuItem = () => {
  if (!instanceActive()) return;
  if (document.querySelector(`.wT .${REMINDERS_CLASS}`)) return;
  const sent = document.querySelector('.wT .aHS-bnu')?.closest('.aim');
  if (!sent) return;

  // Normalize first so the copy carries a .qj for the icon rule
  normalizeSidebarIcons();

  const item = sent.cloneNode(true);
  item.classList.add(REMINDERS_CLASS);
  item
    .querySelectorAll('*')
    .forEach((el) =>
      ['id', 'jslog', 'jsaction', 'jscontroller', 'jsmodel', 'data-label-name'].forEach((attr) =>
        el.removeAttribute(attr),
      ),
    );
  item.querySelectorAll('.bsU, .nL').forEach((el) => el.remove());
  item.querySelectorAll('[class*="aHS-"]').forEach((el) => {
    [...el.classList].filter((c) => c.startsWith('aHS-')).forEach((c) => el.classList.remove(c));
  });

  const row = item.querySelector('.TO');
  if (row) {
    row.setAttribute('data-tooltip', 'Reminders');
    row.className = 'TO';
  }

  const hash = toSearchHash(REMINDERS_SEARCH);
  const link = item.querySelector('a');
  if (link) {
    link.href = hash;
    link.textContent = 'Reminders';
    link.setAttribute('aria-label', 'Reminders');
    link.removeAttribute('title');
  }

  item.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.hash = hash;
  });

  sent.parentElement.append(item);
  updateRemindersHighlight();
};

window.addEventListener('hashchange', updateRemindersHighlight);

/**
 * Adds the Reminders row once Sent renders, and again if Gmail rebuilds the
 * menu without it
 */
const watchRemindersMenuItem = () => {
  // Gmail can take well over 10s to draw the menu on a slow load; pages
  // without one (a popped-out compose window) stop the retries here
  const tryInsert = (triesLeft = 300) => {
    insertRemindersMenuItem();
    if (!document.querySelector(`.wT .${REMINDERS_CLASS}`) && triesLeft > 0) {
      setTimeout(() => tryInsert(triesLeft - 1), 250);
    }
  };
  tryInsert();
  window.addEventListener('hashchange', insertRemindersMenuItem);
};
