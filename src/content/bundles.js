// Bundles: the hover actions, dragging mail onto a category, building and updating bundle rows, calendar attachments
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

// =============================================================================
// BUNDLE HOVER ACTIONS
// =============================================================================

/**
 * The toolbar actions a bundle's ⋮ menu offers, in toolbar order: Archive,
 * Report spam, Delete, Mark as read/unread, Snooze, Add to Tasks (by Gmail's
 * act id), Move to (.ns) and Labels (.mw). Gmail only shows them while
 * emails are selected, and they act on the whole selection.
 */
const BUNDLE_MENU_ACTIONS = [7, 9, 10, 1, 2, 290, 95]
  .map((act) => `[act="${act}"]`)
  .concat('.ns', '.mw')
  .map((sel) => `.G-atb .T-I${sel}`)
  .join(', ');

const BUNDLE_MENU_CLASS = 'bundle-menu';
const BUNDLE_MENU_OPEN_CLASS = 'bundle-menu-open';

/**
 * Closes the bundle menu
 * @param {boolean} clearSelection - Untick the bundle's emails too (the menu
 *   was dismissed rather than used)
 */
const closeBundleMenu = (clearSelection) => {
  const menu = document.querySelector(`.${BUNDLE_MENU_CLASS}`);
  if (!menu) return;
  const wrapper = document.querySelector(`.${BUNDLE_MENU_OPEN_CLASS}`);
  wrapper?.classList.remove(BUNDLE_MENU_OPEN_CLASS);
  if (clearSelection && wrapper?.parentElement) selectOnlyEmails(wrapper.parentElement, []);
  menu.remove();
};

/**
 * Opens a bundle's ⋮ menu: selects the bundle's emails, then lists Gmail's
 * toolbar actions for that selection under Gmail's own names. Picking one
 * presses that toolbar button, so it applies to every email in the bundle
 * (Move to, Labels and Snooze open their pickers from the toolbar).
 * @param {Element} wrapper - The bundle row
 * @param {Element} anchor - The ⋮ button, to open the menu under
 */
const openBundleMenu = async (wrapper, anchor) => {
  closeBundleMenu(true);
  const list = wrapper.parentElement;
  const emails = getBundleEmails(wrapper).filter((email) => select.emailCheckbox(email));
  if (!emails.length) return;

  selectOnlyEmails(list, emails);
  const visibleActions = () =>
    [...document.querySelectorAll(BUNDLE_MENU_ACTIONS)].filter((el) => el.getClientRects().length);
  // The selection's toolbar draws a beat after the checkboxes tick
  await waitForMatch(() => visibleActions().length && visibleActions());
  const actions = visibleActions();
  if (!actions.length) {
    selectOnlyEmails(list, []);
    return;
  }

  const menu = createEl('div', BUNDLE_MENU_CLASS, { role: 'menu' });
  actions.forEach((button) => {
    const item = createEl('div', 'bundle-menu-item', { role: 'menuitem' }, [
      button.getAttribute('data-tooltip') || button.getAttribute('aria-label') || '',
    ]);
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      closeBundleMenu(false);
      simulateClick(button);
    });
    menu.append(item);
  });

  wrapper.classList.add(BUNDLE_MENU_OPEN_CLASS);
  document.body.append(menu);

  // Under the ⋮, right-aligned to it, flipped above when there's no room
  const rect = anchor.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = menu;
  const below = rect.bottom + 4;
  menu.style.left = `${Math.max(8, rect.right - width)}px`;
  menu.style.top = `${below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 4) : below}px`;
};

/**
 * Builds a bundle's hover actions: sweep (archive the whole bundle, pinned
 * emails stay) and ⋮ (Gmail's toolbar actions for the whole bundle)
 * @param {Element} wrapper - The bundle row
 * @returns {Element} The actions container
 */
const createBundleActions = (wrapper) => {
  const button = (className, title, children, onClick) => {
    const el = createEl('div', `bundle-action ${className}`, { role: 'button', title }, children);
    // Keep the row from opening the bundle
    ['mousedown', 'mouseup'].forEach((type) =>
      el.addEventListener(type, (e) => e.stopPropagation()),
    );
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(el);
    });
    return el;
  };

  return createEl('div', 'bundle-actions', {}, [
    button('bundle-sweep', 'Mark all as done (pinned emails stay)', [createSweepIcon()], () =>
      archiveUnpinned(wrapper.parentElement, getBundleEmails(wrapper)),
    ),
    button('bundle-more', 'More', [], (el) =>
      wrapper.classList.contains(BUNDLE_MENU_OPEN_CLASS)
        ? closeBundleMenu(true)
        : openBundleMenu(wrapper, el),
    ),
  ]);
};

/**
 * Closes the bundle menu on a click outside it, Escape, or leaving the page
 */
const watchBundleMenu = () => {
  document.addEventListener(
    'mousedown',
    (e) => {
      if (!e.target.closest?.(`.${BUNDLE_MENU_CLASS}, .bundle-more`)) closeBundleMenu(true);
    },
    true,
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBundleMenu(true);
  });
  window.addEventListener('hashchange', () => closeBundleMenu(false));
};

// =============================================================================
// DRAG EMAILS ONTO A CATEGORY
// =============================================================================

/**
 * Categories a drag onto the left menu can move mail into. Gmail's own drop
 * there is a "move": it sets the category but also archives the email, so it
 * never shows up under that category in the inbox. Inbox's bundles kept the
 * email in the inbox, so we take over the drop and only change the category.
 * Purchases is left out: Gmail ignores drops on it, and the Labels menu
 * offers no way to assign it by hand.
 */
const DROPPABLE_CATEGORIES = ['Social', 'Updates', 'Forums', 'Promotions'];

// How far the mouse must travel before a press counts as a drag, not a click
const DRAG_THRESHOLD_PX = 5;

/**
 * Polls until find() returns something, for Gmail UI that draws a beat late
 * @param {Function} find - Returns the element, or a falsy value if not there yet
 * @param {number} tries - Attempts, 100ms apart (default: 20)
 * @returns {Promise<Element|null>} The element, or null on timeout
 */
const waitForMatch = (find, tries = 20) =>
  new Promise((resolve) => {
    const attempt = (left) => {
      const found = find();
      if (found || left <= 0) resolve(found || null);
      else setTimeout(() => attempt(left - 1), 100);
    };
    attempt(tries);
  });

/**
 * Moves emails into a Gmail category through the toolbar's Labels menu.
 * Clicking a category there applies it at once, replaces the old category,
 * and shows Gmail's "Undo" toast. Afterwards the selection is set back to
 * what it was.
 * @param {Element} list - The list the emails live in
 * @param {Element[]} emails - Rows to move
 * @param {string} category - One of DROPPABLE_CATEGORIES
 * @param {Element[]} previousSelection - Rows to leave selected afterwards
 */
const moveEmailsToCategory = async (list, emails, category, previousSelection) => {
  const restoreSelection = () =>
    selectOnlyEmails(
      list,
      previousSelection.filter((email) => email.isConnected),
    );

  selectOnlyEmails(list, emails);

  const labelsButton = await waitForMatch(() =>
    [...select.labelsButtons()].find((el) => el.getClientRects().length),
  );
  if (!labelsButton) {
    console.warn('[Inbox Reborn] Labels button not found - could not move emails to', category);
    restoreSelection();
    return;
  }
  simulateClick(labelsButton);

  const menu = await waitForMatch(select.labelsMenu);
  const item =
    menu &&
    [...menu.querySelectorAll('[role=menuitemcheckbox]')].find(
      (el) => el.textContent.trim() === category,
    );

  if (item && item.getAttribute('aria-checked') !== 'true') {
    // The menu shows before Gmail wires it up, and an early click is ignored.
    // A click that lands applies the category and closes the menu.
    for (
      let tries = 0;
      tries < 10 && menu.getClientRects().length && item.getAttribute('aria-checked') !== 'true';
      tries++
    ) {
      simulateClick(item);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } else if (menu) {
    // Already in that category (or Gmail renamed it): close without changes
    (menu.querySelector('input') || menu).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
  }

  // Let Gmail finish the move before handing the old selection back
  setTimeout(restoreSelection, 300);
};

/**
 * Takes over Gmail's drag-to-category: when a drag that started on a list row
 * ends on Social, Updates, Forums, or Promotions in the left menu, keeps the
 * dragged emails in the inbox and just changes their category.
 *
 * Gmail drags with pointer/mouse events, not HTML5 drag and drop, and commits
 * the drop on pointerup. Both pointerup and mouseup are swallowed before
 * Gmail sees them (window, capture phase), then replayed over the row the
 * drag started on, which Gmail treats as a drop on nothing - its drag ends
 * cleanly without archiving anything.
 */
const watchCategoryDrops = () => {
  let drag = null;
  let swallowMouseUp = false;

  window.addEventListener(
    'pointerdown',
    (e) => {
      drag = null;
      swallowMouseUp = false;
      if (e.button !== 0 || !e.isTrusted) return;
      const row = e.target.closest?.('.oy8Mbf .zA');
      if (!row || row.classList.contains(CSS_CLASSES.BUNDLE_WRAPPER)) return;
      // Read the selection now - Gmail ticks the dragged row once it moves
      const selection = [...row.parentElement.querySelectorAll('.zA.x7')];
      drag = { row, x: e.clientX, y: e.clientY, selection };
    },
    true,
  );

  const endDrag = (e) => {
    if (!e.isTrusted) return;
    if (e.type === 'mouseup' && swallowMouseUp) {
      swallowMouseUp = false;
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    const start = drag;
    drag = null;
    if (!start || !start.row.isConnected) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD_PX) return;

    const category = e.target.closest?.('.TO[data-tooltip]')?.getAttribute('data-tooltip');
    if (!DROPPABLE_CATEGORIES.includes(category)) return;

    // Like Gmail: dragging a selected row drags the whole selection
    const list = start.row.parentElement;
    const emails = start.selection.includes(start.row) ? start.selection : [start.row];

    // Keep Gmail's move (and its archive) from running...
    e.stopImmediatePropagation();
    e.preventDefault();
    swallowMouseUp = e.type === 'pointerup';

    // ...and end its drag over the starting row instead. Gmail drops onto
    // whatever the pointer last hovered, so move back over the row first.
    const init = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: start.x,
      clientY: start.y,
      button: 0,
    };
    const pointer = { pointerId: e.pointerId ?? 1, pointerType: 'mouse', isPrimary: true };
    const replay = (type, EventType, extra) =>
      start.row.dispatchEvent(new EventType(type, { ...init, ...extra }));
    replay('pointermove', PointerEvent, { ...pointer, buttons: 1 });
    replay('mousemove', MouseEvent, { buttons: 1 });
    replay('pointerup', PointerEvent, pointer);
    replay('mouseup', MouseEvent, {});

    setTimeout(() => moveEmailsToCategory(list, emails, category, start.selection), 0);
  };

  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('mouseup', endDrag, true);
};

/**
 * Cleans up redundant or empty date labels
 */
const cleanupDateLabels = () => {
  document.querySelectorAll('.time-row').forEach((row) => {
    // Delete any back to back date labels
    if (row.nextSibling && row.nextSibling.className === 'time-row') {
      row.remove();
    }
    // Check if this is an empty date label (all emails are bundled)
    else if (isEmptyDateLabel(row)) {
      row.hidden = true;
    }
  });
};

/**
 * Checks if a date label has no visible emails
 * @param {Element} row - The date label row
 * @returns {boolean} True if the date label has no visible emails
 */
const isEmptyDateLabel = (row) => {
  const sibling = row.nextSibling;
  if (!sibling) return true;
  if (sibling.className === 'time-row') return true;
  if (![...sibling.classList].includes(CSS_CLASSES.BUNDLED_EMAIL)) return false;
  return isEmptyDateLabel(sibling);
};

// =============================================================================
// BUNDLE MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Rules out rows that can't be inbox mail, for the moment after a view
 * switch when the URL already says inbox but Gmail still shows the old list
 * @param {Element} emailEl - The email row
 * @param {string[]} labels - The row's label chips
 * @returns {boolean} False for rows from other views
 */
const canBeInboxRow = (emailEl, labels) =>
  // Gmail only shows an "Inbox" chip outside the inbox
  !labels.includes('Inbox') &&
  // Sent and Drafts rows lead with bare "To:"/"Draft" text, inbox rows with a sender
  emailEl.querySelector('.yW')?.firstChild?.nodeType !== Node.TEXT_NODE;

/**
 * Removes bundles from the visible list when it isn't the inbox - built in
 * the moment a view switch left the next view's rows on screen. The inbox's
 * own list is hidden by then and keeps its bundles.
 */
const removeStrayBundles = () => {
  document.querySelectorAll(`.${CSS_CLASSES.BUNDLE_WRAPPER}`).forEach((wrapper) => {
    if (!wrapper.getClientRects().length) return;
    wrapper.parentElement.querySelectorAll(`.${CSS_CLASSES.BUNDLED_EMAIL}`).forEach((email) => {
      email.classList.remove(CSS_CLASSES.BUNDLED_EMAIL);
      removeStyleNodeWithEmailId(email.id);
    });
    wrapper.remove();
  });
};

/**
 * The one bundle an email goes in when its labels would put it in several,
 * as in Inbox, where an email sat in a single bundle: a label of your own
 * beats the categories, and between categories Inbox's menu order decides
 * (Travel, Purchases, Finance, Social, Updates, Forums, Promotions). Gmail
 * sorts each message of a conversation on its own, so a conversation often
 * carries both an Updates and a Forums chip - it bundles under Updates
 * @param {string[]} labels - The email's labels that bundle
 * @returns {string[]} The label to bundle under, or none
 */
const pickBundleLabel = (labels) => {
  if (labels.length < 2) return labels;
  const own = labels.find((label) => !isCategoryName(label));
  return [own || CATEGORY_MENU_ORDER.find((name) => labels.includes(name))];
};

/**
 * Gets all currently bundled labels
 * @returns {Object} Object with label names as keys
 */
const getBundledLabels = () => {
  return Array.from(select.bundleWrappers()).reduce((bundledLabels, el) => {
    bundledLabels[el.attributes.bundleLabel.value] = true;
    return bundledLabels;
  }, {});
};

/**
 * Adds a CSS class to an email element
 * @param {Element} emailEl - The email DOM element
 * @param {string} klass - The CSS class to add
 */
const addClassToEmail = (emailEl, klass) => emailEl.classList.add(klass);

/**
 * Adds a CSS class to a bundle element
 * @param {string} label - The bundle label
 * @param {string} klass - The CSS class to add
 */
const addClassToBundle = (label, klass) => {
  const bundle = document.querySelector(`div[bundleLabel="${CSS.escape(label)}"]`);
  if (bundle && !bundle.classList.contains(klass)) {
    bundle.classList.add(klass);
  }
};

/**
 * Removes a CSS class from a bundle element
 * @param {string} label - The bundle label
 * @param {string} klass - The CSS class to remove
 */
const removeClassFromBundle = (label, klass) => {
  const bundle = document.querySelector(`div[bundleLabel="${CSS.escape(label)}"]`);
  if (bundle && bundle.classList.contains(klass)) {
    bundle.classList.remove(klass);
  }
};

/**
 * Adds a count badge to a bundle
 * @param {string} label - The bundle label
 * @param {number} count - The count to display
 */
const addCountToBundle = (label, count) => {
  const bundleLabel = document.querySelector(`div[bundleLabel="${CSS.escape(label)}"] .label-link`);
  if (!bundleLabel) return;

  const countText = `(${count})`;
  const [name, badge] = bundleLabel.children;
  if (
    bundleLabel.childNodes.length === 2 &&
    name?.textContent === label &&
    badge?.classList.contains('bundle-count') &&
    badge.textContent === countText
  ) {
    return;
  }
  bundleLabel.replaceChildren(
    createEl('span', '', {}, [label]),
    createEl('span', 'bundle-count', {}, [countText]),
  );
};

/**
 * Adds sender information to a bundle
 * @param {string} label - The bundle label
 * @param {Array} senders - Array of sender objects with name and isUnread properties
 */
const addSendersToBundle = (label, senders) => {
  const bundleSenders = document.querySelector(
    `div[bundleLabel="${CSS.escape(label)}"] .bundle-senders`,
  );
  if (!bundleSenders) return;

  // Get unique senders, prioritizing unread status
  const uniqueSenders = senders.reverse().filter((sender, index, self) => {
    if (self.findIndex((s) => s.name === sender.name && s.isUnread === sender.isUnread) === index) {
      // If this sender appears with unread status elsewhere, skip the read version
      if (!sender.isUnread && self.findIndex((s) => s.name === sender.name && s.isUnread) >= 0) {
        return false;
      }
      return true;
    }
    return false;
  });

  // Only rebuild when the list changed (this runs on every poll)
  const key = JSON.stringify(uniqueSenders.map((sender) => [sender.name, sender.isUnread]));
  if (bundleSenders.dataset.senders === key) return;
  bundleSenders.dataset.senders = key;

  bundleSenders.replaceChildren(
    ...uniqueSenders.flatMap((sender, i) => [
      ...(i ? [', '] : []),
      createEl('span', sender.isUnread ? 'strong' : '', {}, [sender.name]),
    ]),
  );
};

/**
 * Inbox's bundle icons, by kind. The sidebar's label icons (style.css,
 * "LABEL SIDEBAR ICONS") use the same art, keyed by these names.
 */
const BUNDLE_ICONS = {
  promotions: 'images/ic_offers_24px_clr_r3_2x.png',
  finance: 'images/ic_finance_24px_clr_r3_2x.png',
  purchases: 'images/ic_purchases_24px_clr_r3_2x.png',
  travel: 'images/ic_travel_clr_24dp_r1_2x.png',
  updates: 'images/ic_updates_24px_clr_r3_2x.png',
  forums: 'images/ic_forums_24px_clr_r3_2x.png',
  social: 'images/ic_social_24px_clr_r3_2x.png',
  // The left menu's label icon: the same stacked envelopes as Inbox's
  // ic_custom-cluster art, but drawn at full alpha. That file's ink is 60%
  // gray baked into its alpha, so as a mask it let only part of the color
  // through and the bundle read lighter than the menu.
  custom: 'images/menu_label_cluster_24dp.png',
};

/**
 * Picks which of Inbox's bundle icons a label gets: the seven categories
 * have their own, and every label of the person's own gets Inbox's stacked
 * envelopes, whatever it is called (a "Cruise" label is a custom bundle,
 * not Travel)
 * @param {string} label - The label name
 * @returns {string} A BUNDLE_ICONS key
 */
const getBundleIconKind = (label) => CATEGORY_ICON_KINDS[label] || 'custom';

const CATEGORY_ICON_KINDS = {
  Travel: 'travel',
  Purchases: 'purchases',
  Finance: 'finance',
  Social: 'social',
  Updates: 'updates',
  Forums: 'forums',
  Promotions: 'promotions',
};

// Labels whose mail the Travel page also lists (getTravelLabels) - generic
// travel words only, so anyone's "Cruise" or "Flights" label counts
const TRAVEL_LABEL_WORDS = /\b(trips?|travel|cruises?|flights?|vacations?|hotels?)\b/i;

/**
 * Gets the appropriate bundle image for a label
 * @param {string} label - The bundle label
 * @returns {string} URL to the bundle image
 */
const getBundleImageForLabel = (label) =>
  chrome.runtime.getURL(BUNDLE_ICONS[getBundleIconKind(label)]);

/**
 * Tags each label in the left menu with the bundle icon it should show
 * (data-inbox-icon), so the stylesheet can paint the same art the label's
 * bundle uses in the inbox. Only writes when the kind changes.
 */
const tagSidebarLabelIcons = () => {
  document.querySelectorAll('.zw .TO[data-tooltip]').forEach((row) => {
    if (!row.querySelector('.aHS-bnr')) return;
    const kind = getBundleIconKind(row.getAttribute('data-tooltip'));
    if (row.dataset.inboxIcon !== kind) row.dataset.inboxIcon = kind;
  });
};

/* The left menu's rows the stylesheet restyles (category rows, the
   Categories group, AI Inbox, the label-list buttons), keyed by what they
   link to rather than their English tooltip, so the stylesheet's
   [data-inbox-nav] selectors hold in any Gmail language whose links are
   recognizable. The tooltip is the fallback for rows without a link. */
const NAV_BY_HASH = [
  [/^#category\/social/, 'social'],
  [/^#category\/updates/, 'updates'],
  [/^#category\/forums/, 'forums'],
  [/^#category\/promotions/, 'promotions'],
  [/^#category\/purchases/, 'purchases'],
  [/^#category\/travel/, 'travel'],
  [/^#search\/category%3Afinance/, 'finance'],
  [/^#settings\/labels/, 'manage-labels'],
  [/^#subscriptions/, 'manage-subscriptions'],
];
const NAV_BY_TOOLTIP = {
  Social: 'social',
  Updates: 'updates',
  Forums: 'forums',
  Promotions: 'promotions',
  Purchases: 'purchases',
  Purchased: 'purchases',
  Travel: 'travel',
  Finance: 'finance',
  Categories: 'categories',
  'AI Inbox': 'ai-inbox',
  'Manage labels': 'manage-labels',
  'Manage subscriptions': 'manage-subscriptions',
  'Create new label': 'create-label',
};

/**
 * Tags the left menu's rows and buttons with data-inbox-nav (see above).
 * Only writes when the value changes.
 */
const tagSidebarNav = () => {
  const hashOf = (el) => {
    const link = el.matches('a') ? el : el.querySelector('a[href*="#"]') || el.closest('a');
    return link?.getAttribute('href')?.replace(/^[^#]*/, '') || '';
  };
  document.querySelectorAll('.aeN [data-tooltip], .aeN [aria-label]').forEach((el) => {
    const hash = hashOf(el);
    const nav =
      NAV_BY_HASH.find(([pattern]) => pattern.test(hash))?.[1] ||
      NAV_BY_TOOLTIP[el.getAttribute('data-tooltip') || el.getAttribute('aria-label')];
    if (nav && el.dataset.inboxNav !== nav) el.dataset.inboxNav = nav;
  });
};

/**
 * Gets the color for a bundle title based on the label color
 * @param {Element} email - The email DOM element
 * @param {string} label - The bundle label
 * @returns {string|null} The color value or null
 */
const getBundleTitleColorForLabel = (email, label) => {
  const labelEls = select.emailLabelEls(email);
  let bundleTitleColor = null;

  labelEls.forEach((labelEl) => {
    if (labelEl.innerText === label) {
      const labelColor = labelEl.style.backgroundColor;
      // Ignore Gmail's default label chip grays (old and current palettes),
      // otherwise the near-white default reads as a custom bundle color
      if (labelColor !== 'rgb(221, 221, 221)' && labelColor !== 'rgb(225, 227, 225)') {
        bundleTitleColor = labelColor;
      }
    }
  });

  return bundleTitleColor;
};

/**
 * Gets a predefined color for common categories
 * @param {string} label - The category label
 * @returns {string} The color value
 */
const getCategoryColor = (label) =>
  ({
    updates: 'rgb(255, 104, 57)',
    promotions: 'rgb(0, 188, 212)',
    forums: 'rgb(63, 81, 181)',
    social: 'rgb(219, 68, 55)',
    travel: 'rgb(156, 39, 176)',
    finance: 'rgb(103, 159, 56)',
    purchases: 'rgb(121, 85, 72)',
    // Custom bundles: the gray the left menu's label icons come out in; dark
    // mode recolors the bundle icon in CSS
  })[getBundleIconKind(label)] || '#616161';

/**
 * Where clicking a bundle leads: the label's inbox mail, or for Purchases,
 * Travel and Finance the same category search the bundle was built from
 * (plus a label of the same name, if there is one - the two share a bundle)
 * @param {string} label - The bundle label
 * @returns {string} The hash to open
 */
const getBundleHash = (label) => {
  if (!isCategoryBundle(label)) return `#search/in%3Ainbox+label%3A${fixLabel(label)}`;
  const category = `category:${CATEGORY_BUNDLES[label]}`;
  const hasLabel = !!document.querySelector(`.zw .TO a[href$="#label/${fixLabel(label)}"]`);
  const query = hasLabel ? `in:inbox {${category} label:${label}}` : `in:inbox ${category}`;
  return `#search/${encodeURIComponent(query).replace(/%20/g, '+')}`;
};

/**
 * Builds a bundle wrapper element for a label
 * @param {Element} email - The email DOM element
 * @param {string} label - The bundle label
 * @param {boolean} hasImportantMarkers - Whether to show importance markers
 */
const buildBundleWrapper = (email, label, hasImportantMarkers) => {
  const importantMarkerClass = hasImportantMarkers ? '' : 'hide-important-markers';
  const bundleImage = getBundleImageForLabel(label);
  const bundleTitleColor =
    getBundleIconKind(label) === 'custom' && getBundleTitleColorForLabel(email, label);
  const styleColor = bundleTitleColor || getCategoryColor(label);
  const style = `-webkit-mask: url(${bundleImage}) 0 0/100% 100%; background-color: ${styleColor};`;

  // The senders sit inside the date cell (style.css "Parent of .bundle-senders")
  const bundleWrapper = createEl(
    'div',
    'zA yO',
    { bundleLabel: label, bundleKind: getBundleIconKind(label) },
    [
      createEl('span', 'oZ-x3 xY aid bundle-image', { style }),
      createEl('span', `WA xY ${importantMarkerClass}`.trim()),
      createEl(
        'span',
        'yX xY label-link',
        bundleTitleColor ? { style: `color: ${bundleTitleColor}` } : {},
        [label],
      ),
      createEl('span', 'xW xY', {}, [
        createEl('span', '', { title: getRawDate(email) }),
        createEl('div', 'y2 bundle-senders'),
      ]),
    ],
  );

  addClassToEmail(bundleWrapper, CSS_CLASSES.BUNDLE_WRAPPER);
  bundleWrapper.append(createBundleActions(bundleWrapper));

  // Add click handler to navigate to the bundle
  bundleWrapper.onclick = () => (location.href = getBundleHash(label));

  // Insert the bundle wrapper
  if (email && email.parentNode) {
    if (options.bundleToday) {
      // At the top of Today: just under its header when the list starts
      // with one, otherwise first (the next pass adds the header above it)
      const list = email.parentElement;
      const first = list.firstElementChild;
      const startsWithToday =
        first?.className === 'time-row' &&
        first.querySelector('.time')?.innerText === DATE_LABELS.TODAY;
      list.insertBefore(bundleWrapper, startsWithToday ? first.nextSibling : list.firstChild);
    } else {
      email.parentElement.insertBefore(bundleWrapper, email);
    }
  }
};

/**
 * Adds or removes a class to/from the document body
 * @param {string} klass - The CSS class
 * @param {boolean} add - Whether to add (true) or remove (false)
 */
const toggleBodyClass = (klass, add) => {
  if (add && !document.body.classList.contains(klass)) {
    document.body.classList.add(klass);
  } else if (!add && document.body.classList.contains(klass)) {
    document.body.classList.remove(klass);
  }
};

/**
 * Adds a class to the document body
 * @param {string} klass - The CSS class to add
 */
const addClassToBody = (klass) => toggleBodyClass(klass, true);

/**
 * Removes a class from the document body
 * @param {string} klass - The CSS class to remove
 */
const removeClassFromBody = (klass) => toggleBodyClass(klass, false);

/**
 * Creates a style node to hide an email by ID
 * @param {string} id - The email ID
 */
const createStyleNodeWithEmailId = (id) => {
  hiddenEmailIds.push(id);

  const style = document.createElement('style');
  style.id = CSS_CLASSES.STYLE_NODE_ID_PREFIX + id;
  style.type = 'text/css';
  style.appendChild(document.createTextNode(`.nH.ar4.z [id="${id}"] { display: none; }`));
  document.head.appendChild(style);
};

/**
 * Removes a style node that hides an email
 * @param {string} id - The email ID
 */
const removeStyleNodeWithEmailId = (id) => {
  const styleNode = document.getElementById(CSS_CLASSES.STYLE_NODE_ID_PREFIX + id);
  if (styleNode) {
    hiddenEmailIds.splice(hiddenEmailIds.indexOf(id), 1);
    styleNode.remove();
  }
};

// =============================================================================
// CALENDAR EVENT HANDLING
// =============================================================================

/**
 * Adds a calendar event attachment to an email
 * @param {Element} email - The email DOM element
 */
const addEventAttachment = (email) => {
  // Skip if already processed
  if (email.querySelector('.' + CSS_CLASSES.CALENDAR_ATTACHMENT)) return;

  // Extract event details
  let title = 'Calendar Event';
  let time = '';
  const titleNode = select.eventTitle(email);

  if (titleNode) {
    const titleFullText = titleNode.innerText;
    const matches = Array.from(titleFullText.matchAll(/[^:]*: ([^@]*)@(.*)/g))[0];
    if (matches) {
      title = matches[1].trim();
      time = matches[2].trim();
    }
  }

  // Build calendar attachment elements
  const span = document.createElement('span');
  span.appendChild(document.createTextNode('Attachment'));
  span.classList.add('bzB');

  const attachmentNameSpan = document.createElement('span');
  attachmentNameSpan.classList.add('event-title');
  attachmentNameSpan.appendChild(document.createTextNode(title));

  const attachmentTimeSpan = document.createElement('span');
  attachmentTimeSpan.classList.add('event-time');
  attachmentTimeSpan.appendChild(document.createTextNode(time));

  const attachmentContentWrapper = document.createElement('span');
  attachmentContentWrapper.classList.add('brg');
  attachmentContentWrapper.appendChild(attachmentNameSpan);
  attachmentContentWrapper.appendChild(attachmentTimeSpan);

  // Add invitation action if present
  const action = select.emailAction(email);
  if (action) attachmentContentWrapper.appendChild(action);

  const imageSpan = document.createElement('span');
  imageSpan.classList.add('calendar-image');

  const attachmentCard = document.createElement('div');
  attachmentCard.classList.add('brc');
  attachmentCard.setAttribute('role', 'listitem');
  attachmentCard.setAttribute('title', title);
  attachmentCard.appendChild(imageSpan);
  attachmentCard.appendChild(attachmentContentWrapper);

  const attachmentNode = document.createElement('div');
  attachmentNode.classList.add('brd', CSS_CLASSES.CALENDAR_ATTACHMENT);
  attachmentNode.appendChild(span);
  attachmentNode.appendChild(attachmentCard);

  // Add to email
  const emailSubjectWrapper = select.emailSubjectWrapper(email);
  if (emailSubjectWrapper && emailSubjectWrapper.length) {
    emailSubjectWrapper[0].appendChild(attachmentNode);
  }
};
