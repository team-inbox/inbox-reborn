// The left menu: Reminders, category rows, and sidebar icon markup
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

// =============================================================================
// LEFT MENU CUSTOMIZATION
// =============================================================================

/**
 * Sets up menu node references
 */
const setupMenuNodes = () => {
  const sidebarSelector = '.wT .byl'; // Parent of the menu rows

  const watchSidebar = () => {
    const sidebar = document.querySelector(sidebarSelector);
    if (!sidebar) return;

    insertDoneMenuItem();
    insertCategoryMenuItems();
    insertRemindersMenuItem();

    // Map menu items to their selectors
    [
      { label: 'inbox', selector: '.aHS-bnt' },
      { label: 'snoozed', selector: '.aHS-bu1' },
      { label: 'allmail', selector: '.aHS-aHO' },
      { label: 'drafts', selector: '.aHS-bnq' },
      { label: 'sent', selector: '.aHS-bnu' },
      { label: 'spam', selector: '.aHS-bnv' },
      { label: 'trash', selector: '.aHS-bnx' },
      { label: 'starred', selector: '.aHS-bnw' },
      { label: 'important', selector: '.aHS-bns' },
      { label: 'chats', selector: '.aHS-aHP' },
    ].forEach(({ label, selector }) => {
      const node = queryParentSelector(document.querySelector(selector), '.aim');
      if (node) menuNodes[label] = node;
    });
  };

  // Watch for changes to the sidebar
  const observer = new MutationObserver(watchSidebar);
  waitForElement(sidebarSelector, (sidebar) => {
    observer.observe(sidebar, { childList: true, subtree: true });
    watchSidebar();
  });
};

/* Gmail (mid-2026) removed the empty .qj div the stylesheet paints sidebar
   icons into; nav rows now carry inline SVG icons inside build-hashed
   wrappers. Only rows the stylesheet actually replaces are listed here, so
   any unknown row keeps Gmail's native icon instead of going blank. */
const SIDEBAR_ICON_ROWS = [
  // system rows by aHS marker (these classes survived the change)
  '.TN.aHS-bnt', // Inbox
  '.TN.aHS-bnw', // Starred
  '.TN.aHS-bns', // Important
  '.TN.aHS-aHP', // Chats
  '.TN.aHS-bu1', // Snoozed
  '.TN.aHS-nd', // Scheduled
  '.TN.aHS-bnr', // user labels
  '.TN.aHS-bnu', // Sent
  '.TN.aHS-bnq', // Drafts
  '.TN.aHS-aHO', // All Mail
  '.TN.aHS-bnx', // Trash
  '.TN.aHS-bnv', // Spam
  // category rows by tooltip (their aHS marker is build-hashed)
  '.TO[data-tooltip="Social"] .TN',
  '.TO[data-tooltip="Updates"] .TN',
  '.TO[data-tooltip="Forums"] .TN',
  '.TO[data-tooltip="Promotions"] .TN',
  '.TO[data-tooltip="Categories"] .TN',
  '.TO[data-tooltip="Purchases"] .TN',
  '.TO[data-tooltip="Purchased"] .TN',
  // Travel and Finance rows the extension adds (insertCategoryMenuItems)
  '.TO[data-tooltip="Travel"] .TN',
  '.TO[data-tooltip="Finance"] .TN',
  // AI Inbox (2026 Gemini row): a bare .TN carrying the tooltip itself
  '.TN[data-tooltip="AI Inbox"]',
].join(', ');

/**
 * Restores the .qj icon contract on Gmail's new sidebar markup: tags the
 * first SVG icon wrapper in each covered row with .qj (so the existing
 * .qj icon rules keep painting) and hides duplicate icon variants. No-op
 * on the old markup, where rows already contain a .qj div.
 */
const normalizeSidebarIcons = () => {
  document.querySelectorAll(SIDEBAR_ICON_ROWS).forEach((row) => {
    if (row.querySelector('.qj')) return;
    const iconWraps = [...row.children].filter(
      (el) => el.firstElementChild && el.firstElementChild.tagName.toLowerCase() === 'svg',
    );
    if (!iconWraps.length) return;
    iconWraps[0].classList.add('qj');
    iconWraps.slice(1).forEach((el) => el.classList.add('inbox-reborn-hidden'));
  });
};

/**
 * Inbox's category bundles in their original order. Gmail still sorts mail
 * into Travel and Finance but has no menu row for them, so the extension adds
 * those two (Finance has no Gmail page either - it opens as a search).
 */
const CATEGORY_MENU_ORDER = [
  'Travel',
  'Purchases',
  'Finance',
  'Social',
  'Updates',
  'Forums',
  'Promotions',
];
const EXTRA_CATEGORIES = ['Travel', 'Finance'];
const FINANCE_HASH = '#search/category%3Afinance';
const TRAVEL_PAGE_HASH = '#category/travel';

/**
 * Full names of the travel labels in the left menu - whatever labels this
 * person has with a travel word in the name (TRAVEL_LABEL_WORDS)
 * @returns {string[]} Label names, e.g. ["Cruise", "Trips/Japan"]
 */
const getTravelLabels = () =>
  [...document.querySelectorAll('.zw .TO a[href*="#label/"]')]
    .map((link) => {
      try {
        return decodeURIComponent(
          link.getAttribute('href').split('#label/')[1].replace(/\+/g, ' '),
        );
      } catch {
        return '';
      }
    })
    .filter((name) => name && TRAVEL_LABEL_WORDS.test(name));

/**
 * Where an extra category row leads. Travel is Gmail's hidden Travel page,
 * or - when the person has travel labels - a search for that page's mail
 * plus those labels, so a "Cruise" label's mail shows up under Travel.
 * @param {string} name - 'Travel' or 'Finance'
 * @returns {string} The hash to open
 */
const getCategoryHash = (name) => {
  if (name === 'Finance') return FINANCE_HASH;
  const labels = getTravelLabels();
  if (!labels.length) return TRAVEL_PAGE_HASH;
  const terms = labels.map((label) => `label:${label.replace(/[/\\& ]/g, '-')}`);
  return `#search/${encodeURIComponent(`{category:travel ${terms.join(' ')}}`).replace(/%20/g, '+')}`;
};

/**
 * Whether a hash is the page an extra category row leads to. Compares the
 * decoded hash, since Gmail may re-encode a search after opening it.
 * @param {string} name - 'Travel' or 'Finance'
 * @param {string} hash - The hash to test (default: the current one)
 * @returns {boolean} True on that category's page
 */
const isCategoryPage = (name, hash = getViewHash()) => {
  let decoded = hash;
  try {
    decoded = decodeURIComponent(hash.replace(/\+/g, ' '));
  } catch {
    // Malformed escape - compare the raw hash
  }
  if (name === 'Finance') return /^#search\/category:finance(\/|$)/i.test(decoded);
  return (
    decoded.startsWith(TRAVEL_PAGE_HASH) ||
    /^#search\/\{category:travel [^}]*\}(\/|$)/i.test(decoded)
  );
};

/**
 * Builds a menu row for one of the extra categories from a copy of one of
 * Gmail's own category rows. Gmail's ids and click wiring are stripped so the
 * copy acts only as a link, and its count and label-options button go too.
 * @param {Element} template - A Gmail category row (.aim)
 * @param {string} name - The category name
 * @param {string} [href] - Where the row leads (default: getCategoryHash)
 * @returns {Element} The new row
 */
const buildCategoryMenuItem = (template, name, href) => {
  const target = () => href || getCategoryHash(name);
  const item = template.cloneNode(true);
  item.classList.add('inbox-reborn-category');
  item
    .querySelectorAll('*')
    .forEach((el) =>
      ['id', 'jslog', 'jsaction', 'jscontroller', 'jsmodel', 'data-label-name'].forEach((attr) =>
        el.removeAttribute(attr),
      ),
    );
  item.querySelectorAll('.bsU, .nL').forEach((el) => el.remove());

  const row = item.querySelector('.TO');
  row.setAttribute('data-tooltip', name);
  row.dataset.inboxNav = name.toLowerCase();
  // Gmail's per-category marker (UV, aS6...) and selected state
  row.className = 'TO';

  const link = item.querySelector('a');
  if (link) {
    link.href = target();
    link.textContent = name;
    link.setAttribute('aria-label', name);
  }

  // Worked out on click, so labels added since the row was built count
  item.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.hash = target();
  });
  return item;
};

/**
 * Highlights the category rows the extension draws for the page being shown,
 * the way Gmail highlights its own rows (Gmail highlights nothing on the
 * Travel and Finance pages, and its own category rows are hidden while the
 * label sections are on)
 */
const updateCategoryHighlight = () => {
  const hash = getViewHash();
  document.querySelectorAll('.inbox-reborn-category .TO').forEach((row) => {
    const name = row.getAttribute('data-tooltip');
    const active = EXTRA_CATEGORIES.includes(name)
      ? isCategoryPage(name)
      : new RegExp(`^#category/${name.toLowerCase()}(/|$)`).test(hash);
    row.classList.toggle('nZ', active);
    row.classList.toggle('aiq', active);
  });
};

/**
 * Adds Travel and Finance to the left menu's categories so they read like
 * Inbox's: Travel, Purchases, Finance, Social, Updates, Forums, Promotions.
 *
 * The rows are appended after Gmail's own and put in place with CSS order
 * (style.css, "TRAVEL & FINANCE SIDEBAR ROWS"). Inserting them between
 * Gmail's rows shifted the positions Gmail updates the list by, and it drew
 * Forums and Promotions a second time. Runs on every sidebar change, so it
 * only touches the DOM when a row is missing.
 */
const insertCategoryMenuItems = () => {
  // With the label sections on, the categories are drawn in the label list
  // instead (layoutLabelSections); rows added here earlier go
  if (areLabelSectionsOn()) {
    document
      .querySelectorAll(`.inbox-reborn-category:not(.${LABEL_SECTION_CLASSES.LIST} > *)`)
      .forEach((row) => row.remove());
    return;
  }
  const rowFor = (name) => document.querySelector(`.TO[data-tooltip="${name}"]`)?.closest('.aim');
  const template = CATEGORY_MENU_ORDER.filter((name) => !EXTRA_CATEGORIES.includes(name))
    .map(rowFor)
    .find(Boolean);
  if (!template) return;
  const container = template.parentElement;

  // Normalize first so copies carry a .qj for the icon rules
  normalizeSidebarIcons();

  EXTRA_CATEGORIES.forEach((name) => {
    const item = rowFor(name);
    if (item?.parentElement === container) return;
    item?.remove();
    container.append(buildCategoryMenuItem(template, name));
  });

  updateCategoryHighlight();
};

window.addEventListener('hashchange', updateCategoryHighlight);
