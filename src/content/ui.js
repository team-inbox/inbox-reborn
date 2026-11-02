// UI customization: page titles, toolbar tweaks, the side panel
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

// =============================================================================
// UI CUSTOMIZATION
// =============================================================================

/**
 * Updates the Gmail top bar header to display the correct page title
 */
const handleHashChange = () => {
  let hash = getViewHash();

  addPinnedToggle();
  updatePinnedToggle();

  // Sweep buttons only make sense where Archive removes mail from the list
  toggleBodyClass(CSS_CLASSES.INBOX_LIST, isInboxHash(hash) || isInBundle());

  if (isInBundle()) {
    hash = '#inbox';
  } else if (isPinnedView()) {
    hash = '#pinned';
  } else {
    // Map Gmail category hashes to clean pageTitle values
    if (hash.startsWith('#category/social')) hash = '#social';
    if (hash.startsWith('#category/updates')) hash = '#updates';
    if (hash.startsWith('#category/forums')) hash = '#forums';
    if (hash.startsWith('#category/promotions')) hash = '#promotions';
    if (hash.startsWith('#category/purchases')) hash = '#purchases';
    if (isCategoryPage('Travel', hash)) hash = '#travel';
    if (isCategoryPage('Finance', hash)) hash = '#finance';
    if (hash.startsWith('#settings/labels')) hash = '#labels';

    // Handle user-created/dynamic labels
    if (hash.startsWith('#label/')) {
      // Get the header element and Gmail link node
      const headerElement = select.headerElement();
      const titleNode = select.titleNode();

      // The full label path (e.g., "Software/Chess"), without the open
      // email's id or page number that can follow it
      const labelName = parseLabelHash(hash, getMenuLabelNames());

      // Extract only the last part of the label path (the "leaf" label)
      const leafLabel = labelName.split('/').pop().trim();

      if (headerElement && titleNode && titleNode.setAttribute) {
        headerElement.setAttribute('pageTitle', 'label');
        // Show just the last sub-label in the header
        titleNode.setAttribute('data-label-title', leafLabel);
        // Provide the full label path as a tooltip
        titleNode.setAttribute('title', labelName);
        titleNode.href = '#label';
      }
      return; // Skip the rest of the logic for label pages
    }

    // Remove label-title attribute if not on a label page
    const titleNode = select.titleNode();
    if (titleNode && titleNode.removeAttribute) {
      titleNode.removeAttribute('data-label-title');
      titleNode.removeAttribute('title');
    }

    hash = hash.split('/')[0].split('?')[0];
  }

  const headerElement = select.headerElement();
  const titleNode = select.titleNode();

  if (!titleNode || !headerElement) return;

  headerElement.setAttribute('pageTitle', hash.replace('#', ''));
  // #pinned, #travel and #finance are ours, not Gmail routes - the title
  // links to the page they stand for
  const titleLinks = {
    '#pinned': '#inbox',
    '#travel': getCategoryHash('Travel'),
    '#finance': FINANCE_HASH,
  };
  titleNode.href = titleLinks[hash] || hash;
};

/**
 * Decodes one part of a Gmail hash (Gmail writes spaces as "+")
 * @param {string} part - The encoded text
 * @returns {string} The decoded text, or the input if it isn't valid encoding
 */
const decodeHashPart = (part) => {
  try {
    return decodeURIComponent(part.replace(/\+/g, ' '));
  } catch {
    return part;
  }
};

/**
 * Full names of the labels in the left menu, e.g. "Software/Chess"
 * @returns {Set<string>} The label names
 */
const getMenuLabelNames = () =>
  new Set(
    [...document.querySelectorAll('.wT a[href*="#label/"]')].map((link) =>
      decodeHashPart(link.getAttribute('href').split('#label/')[1] || ''),
    ),
  );

/**
 * Gets the label a #label/ hash is showing. Gmail writes nested labels with
 * a plain slash (#label/Software/Chess), and also puts the open email's id
 * or a page number after the label (#label/Cruise/FMfcgz..., #label/Cruise/p2),
 * so the longest run of parts that names a known label wins. Without a match
 * (a label the menu hasn't drawn), trailing page numbers and id-like parts
 * are dropped instead.
 * @param {string} hash - A hash starting with #label/
 * @param {Set<string>} knownLabels - Full label names (getMenuLabelNames)
 * @returns {string} The label's full name, e.g. "Software/Chess"
 */
const parseLabelHash = (hash, knownLabels) => {
  const parts = hash.slice('#label/'.length).split('?')[0].split('/').filter(Boolean);
  for (let count = parts.length; count > 0; count--) {
    const name = decodeHashPart(parts.slice(0, count).join('/'));
    if (knownLabels.has(name)) return name;
  }

  const isPageOrId = (part) => /^p\d+$/.test(part) || /^[A-Za-z0-9_-]{16,}$/.test(part);
  while (parts.length > 1 && isPageOrId(parts[parts.length - 1])) parts.pop();
  return decodeHashPart(parts.join('/'));
};

/**
 * Adds Inbox's "Pinned" switch to the header - on shows only pinned
 * (starred) inbox mail and reminders, off goes back to the inbox
 */
const addPinnedToggle = () => {
  if (document.querySelector('.pinned-toggle')) return;
  const headerActions = select.headerActions();
  if (!headerActions) return;

  const toggle = document.createElement('div');
  toggle.className = 'pinned-toggle';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('tabindex', '0');
  toggle.title = 'Show pinned emails only';

  const thumb = document.createElement('span');
  thumb.className = 'pinned-toggle-thumb';
  toggle.appendChild(thumb);

  const flip = () => (window.location.hash = isPinnedView() ? '#inbox' : getPinnedHash());
  toggle.addEventListener('click', flip);
  toggle.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    // Keep Gmail's own keyboard shortcuts from also seeing the key
    e.preventDefault();
    e.stopPropagation();
    flip();
  });

  headerActions.prepend(toggle);
  updatePinnedToggle();
};

/**
 * Syncs the Pinned switch and body class with the current view, so the
 * switch is right however the view was reached (sidebar, back button, ...)
 */
const updatePinnedToggle = () => {
  const pinned = isPinnedView();
  toggleBodyClass(CSS_CLASSES.PINNED_VIEW, pinned);
  document.querySelector('.pinned-toggle')?.setAttribute('aria-checked', String(pinned));
};

/**
 * Fixes label colors to ensure they're applied with !important
 */
const fixLabelColors = () => {
  [...document.querySelectorAll('.qj.aEe')].forEach((el) => {
    const elStyle = el.getAttribute('style');
    if (!elStyle) return;
    const fixed = elStyle.replace(/(background-color:.*(?<!important));/g, '$1 !important;');
    // Only write a change - rewriting the same value still invalidates the style
    if (fixed !== elStyle) el.setAttribute('style', fixed);
  });
};

/**
 * Sets up an observer to watch for label color changes
 */
const watchLabelColorChanges = () => {
  // .FgKVne is Wiz build-hashed; fall back to the label list anchored on the
  // stable .aeN nav container if it rotates
  const labelBaseNode = queryFirst('.aAw.FgKVne ~ .yJ', '.aeN .yJ');

  if (!labelBaseNode) return;

  const observer = new MutationObserver(() => {
    observer.disconnect();
    fixLabelColors();
    observer.observe(labelBaseNode, { attributes: true, childList: true, subtree: true });
  });

  fixLabelColors();
  observer.observe(labelBaseNode, { attributes: true, childList: true, subtree: true });
};

/**
 * Adds a floating compose button to the UI
 */
const addFloatingComposeButton = () => {
  if (document.querySelector('.floating-compose')) return;

  const floatingComposeButton = document.createElement('div');
  floatingComposeButton.className = 'floating-compose';
  floatingComposeButton.dataset.label = 'Compose';
  floatingComposeButton.setAttribute('role', 'button');
  floatingComposeButton.setAttribute('aria-label', 'Compose');
  floatingComposeButton.addEventListener('click', function () {
    const composeButton = select.composeButton();
    composeButton?.click();
  });

  document.body.appendChild(floatingComposeButton);
};

/**
 * Opens a new compose window and pre-fills it
 * @param {Object} fields - Values to fill in
 * @param {string} [fields.from] - From address
 * @param {string} [fields.to] - Recipient address
 * @param {string} [fields.subject] - Subject line; without one the subject
 *   gets focus, with one the body does
 */
const openCompose = ({ from, to, subject } = {}) => {
  select.composeButton()?.click();

  // Wait for compose window to open. The peoplekit-id is build-hashed and
  // rotates with Gmail releases - the aria/name hooks are the stable ones.
  waitForElement(
    'input[peoplekit-id="BbVjBd"], input[aria-label="To recipients"], textarea[name="to"]',
    (toField) => {
      const title = select.messageSubjectBox();
      const body = select.messageBody();
      const fromField = select.messageFrom();

      if (from && fromField) fromField.value = from;
      if (to) toField.value = to;
      if (subject && title) title.value = subject;
      (subject ? body : title)?.focus();
    },
  );
};

/**
 * Adds a reminder button to the UI
 */
const addReminderButton = () => {
  if (document.querySelector('.add-reminder')) return;
  const addReminder = document.createElement('div');
  addReminder.className = 'add-reminder';
  addReminder.dataset.label = 'Reminder';
  addReminder.setAttribute('role', 'button');
  addReminder.setAttribute('aria-label', 'Reminder');

  addReminder.addEventListener('click', function () {
    const myEmail = getMyEmailAddress();
    openCompose({ from: myEmail, to: myEmail, subject: 'Reminder' });
  });

  document.body.appendChild(addReminder);
};
