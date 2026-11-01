/**
 * Gmail Enhancement Script
 *
 * This script enhances the Gmail interface with additional features:
 * - Dark mode synchronization
 * - Email bundling and organization
 * - Avatar display for emails
 * - Calendar event handling
 * - Date-based email grouping
 * - Custom sidebar with improved navigation
 * - Reminder functionality
 * - UI enhancements and Material Design icons
 *
 * Version: 2.0.0
 * Last Updated: 2025
 */

// =============================================================================
// DARK MODE SYNCHRONIZATION
// =============================================================================
/**
 * Handles dark mode synchronization with Chrome storage
 * Applies stored settings on page load and listens for changes
 */
(function initDarkMode() {
  let darkEnabled = false;

  // Google's own popups - the apps launcher ("Your favorites") and other
  // OneGoogle widgets - are ogs.google.com iframes our stylesheet can't reach,
  // and they follow Gmail's own (light) theme. Their URL takes dm=1 for
  // Google's native dark rendering, so set it to match our dark mode.
  //
  // dm=1 alone isn't enough on the widget's first load: Gmail hands the
  // widget its (light) theme during that load's setup, overriding the URL.
  // Reloading the frame right after that first load keeps dm=1, and it sticks
  // from then on. Until the reload lands, the frame carries a pending
  // attribute that style.css hides, so the light first load never shows.
  const WIDGET_PENDING_ATTR = 'data-inbox-reborn-dark-pending';
  // Never leave a widget hidden if a load event goes missing
  const WIDGET_REVEAL_FALLBACK_MS = 5000;
  const reloadedWidgets = new WeakSet();

  const reloadWidgetAfterFirstLoad = (frame) => {
    if (reloadedWidgets.has(frame)) return;
    reloadedWidgets.add(frame);
    frame.setAttribute(WIDGET_PENDING_ATTR, '');
    const fallback = setTimeout(
      () => frame.removeAttribute(WIDGET_PENDING_ATTR),
      WIDGET_REVEAL_FALLBACK_MS,
    );
    const reveal = () => {
      clearTimeout(fallback);
      frame.removeAttribute(WIDGET_PENDING_ATTR);
    };
    frame.addEventListener(
      'load',
      () => {
        if (!darkEnabled || !frame.isConnected) {
          reveal();
          return;
        }
        frame.addEventListener('load', reveal, { once: true });
        const { src } = frame;
        frame.src = src; // re-assigning src reloads the frame
      },
      { once: true },
    );
  };

  const isGoogleWidget = (frame) => {
    try {
      const url = new URL(frame.src);
      return url.hostname === 'ogs.google.com' && url.pathname.includes('/widget/');
    } catch {
      return false;
    }
  };

  const syncGoogleWidget = (frame) => {
    if (!isGoogleWidget(frame)) return;
    if (darkEnabled) reloadWidgetAfterFirstLoad(frame);
    const url = new URL(frame.src);
    if ((url.searchParams.get('dm') === '1') === darkEnabled) return;
    if (darkEnabled) {
      url.searchParams.set('dm', '1');
    } else {
      url.searchParams.delete('dm');
    }
    frame.src = url.toString();
  };

  const syncAllGoogleWidgets = () => {
    for (const frame of document.getElementsByTagName('iframe')) syncGoogleWidget(frame);
  };

  const watchGoogleWidgets = () => {
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          if (mutation.target.tagName === 'IFRAME') syncGoogleWidget(mutation.target);
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName === 'IFRAME') {
            syncGoogleWidget(node);
          } else {
            for (const frame of node.getElementsByTagName('iframe')) syncGoogleWidget(frame);
          }
        }
      }
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  };

  // The content script runs at document_start, so <body> may not exist yet
  // when the storage callback fires - defer applying the class until it does
  const applyDarkMode = (enabled) => {
    darkEnabled = enabled;
    const apply = () => {
      document.body.classList.toggle('dark-mode', enabled);
      syncAllGoogleWidgets();
    };
    if (document.body) {
      apply();
    } else {
      document.addEventListener('DOMContentLoaded', apply, { once: true });
    }
  };

  if (document.body) {
    watchGoogleWidgets();
  } else {
    document.addEventListener('DOMContentLoaded', watchGoogleWidgets, { once: true });
  }

  // Apply stored dark-mode setting on page load
  chrome.storage?.local.get('options', ({ options }) => {
    applyDarkMode(!!options && options.darkMode === 'enabled');
  });

  // Listen for changes to options and toggle class dynamically
  chrome.storage?.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.options) {
      applyDarkMode(changes.options.newValue.darkMode === 'enabled');
    }
  });
})();

// =============================================================================
// CONSTANTS AND CONFIGURATION
// =============================================================================

/**
 * Date and time constants
 */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Avatar color palette for user initials
 */
const NAME_COLORS = [
  '1bbc9b',
  '16a086',
  'c9a227' /* was f1c40f - highlighter yellow, glaring on dark rows */,
  'cf861d' /* was f39c11 - same, one step less orange than H */,
  '2f9e5b' /* was 2dcc70 - neon green, glaring on dark rows */,
  '27ae61',
  'd93939',
  'd25400',
  '3598db',
  '297fb8',
  'e84c3d',
  'c1392b',
  '9a59b5',
  '8d44ad',
  'bec3c7',
  '34495e',
  '2d3e50',
  '95a5a4',
  '7e8e8e',
  'ec87bf',
  'd870ad',
  'f69785',
  '9ba37e',
  'b49255',
  'b49255',
  'a94136',
];

/**
 * Domains that are known to be slow or problematic - skip them
 */
const SKIP_DOMAINS = new Set(['gmail.com', 'google.com', 'googleusercontent.com']);

/**
 * Avatar cache to avoid repeated API calls
 */
const avatarCache = new Map();

/**
 * CSS class names used throughout the application
 */
const CSS_CLASSES = {
  REMINDER_EMAIL: 'reminder',
  CALENDAR_ATTACHMENT: 'calendar-attachment',
  BUNDLE_PAGE: 'bundle-page',
  BUNDLE_WRAPPER: 'bundle-wrapper',
  UNREAD_BUNDLE: 'contains-unread',
  BUNDLED_EMAIL: 'bundled-email',
  BUNDLING_OPTION: 'email-bundling-enabled',
  UNBUNDLED_PARENT_LABEL: 'Unbundled',
  UNBUNDLED_EMAIL: 'unbundled-email',
  AVATAR_EMAIL: 'email-with-avatar',
  AVATAR: 'avatar',
  AVATAR_OPTION: 'show-avatar-enabled',
  WEB_AVATAR: 'web-avatar',
  STYLE_NODE_ID_PREFIX: 'hide-email-',
  PRIORITY_INBOX_OPTION: 'priority-inbox-enabled',
  HIDE_DATE_TIME_OPTION: 'hide-date-time',
  HIDE_AI_INBOX_OPTION: 'hide-ai-inbox',
  HIDE_ALL_MAIL_OPTION: 'hide-all-mail',
  HIDE_TRAVEL_OPTION: 'hide-travel',
  HIDE_FINANCE_OPTION: 'hide-finance',
  PINNED_VIEW: 'pinned-view',
  INBOX_LIST: 'inbox-list',
};

/**
 * Icon for the date-group sweep button - Inbox's check mark trailed by three
 * stepped dashes
 */
const SWEEP_ICON_PATHS = ['M2.4 12.9l3.7 3.1 9.2-8.6', 'M17.6 10h3.6M14.4 13.1h3.6M11 16.2h3.6'];

/**
 * Builds the sweep icon with DOM calls rather than innerHTML, which
 * addons.mozilla.org review flags
 * @returns {SVGElement} The icon
 */
const createSweepIcon = () => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');
  Object.entries({
    viewBox: '0 0 24 24',
    width: '24',
    height: '24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }).forEach(([name, value]) => svg.setAttribute(name, value));

  SWEEP_ICON_PATHS.forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  return svg;
};

/**
 * Inbox's "Pinned" filter: starred inbox mail plus reminders, keyed by the
 * Reminders option so it matches what the thread list treats as a reminder
 * (from me to me, and by default a subject containing "reminder")
 */
const PINNED_SEARCHES = {
  none: 'in:inbox is:starred',
  all: 'in:inbox (is:starred OR (from:me to:me))',
  'containing-word': 'in:inbox (is:starred OR (from:me to:me subject:reminder))',
};

/**
 * Date label constants for grouping emails
 */
const DATE_LABELS = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  THIS_WEEK: 'This week',
  THIS_MONTH: 'This month',
  LAST_YEAR: 'Last year',
};

/**
 * Material icon mapping for sidebar items
 */

// =============================================================================
// ELEMENT SELECTORS
// =============================================================================

/**
 * Centralized DOM element selectors
 *
 * All the selectors for Gmail elements in one place
 * so that when they inevitably break, they can be corrected.
 * This also makes it easier for implementing more reliable
 * retrieval methods in the future.
 */
const select = {
  // General UI elements
  emailAddress: () => document.querySelector("a[aria-label^='Google Account:']"),
  tabs: () => document.querySelectorAll('.aKz'),
  bundleWrappers: () => document.querySelectorAll('.oy8Mbf[role=main] .bundle-wrapper'),
  inbox: () => document.querySelector('.nZ[data-tooltip=Inbox]'),
  importanceMarkers: () => document.querySelector('td.WA.xY'),
  emails: () => document.querySelectorAll('.oy8Mbf .zA'),
  currentTab: () => document.querySelector('.aAy[aria-selected="true"]'),
  // Gmail keeps toolbars for other views in the DOM too; callers pick the visible one
  archiveButtons: () => document.querySelectorAll('.G-atb [act="7"]'),
  labelsButtons: () => document.querySelectorAll('.G-atb [aria-label="Labels"]'),
  // The Labels menu; Gmail keeps it in the DOM with display: none when closed
  labelsMenu: () =>
    [...document.querySelectorAll('.J-M[role=menu]')].find(
      (menu) => menu.getClientRects().length && menu.querySelector('[role=menuitemcheckbox]'),
    ),

  // Left menu: Gmail's list of the person's labels, and the "Labels" title
  // (with the create-label + button) above it
  labelList: () => document.querySelector('.wT .zw > .TK'),
  labelListTitle: () => document.querySelector('.aAw .aAv'),

  // Menu elements
  menu: () => document.body.querySelector('.J-Ke.n4.ah9'),
  composeButtonNew: () => document.querySelector('.Yh.akV'),
  composeButtonOld: () => document.querySelector('.T-I.T-I-KE.L3'),
  composeButton: () => select.composeButtonOld() || select.composeButtonNew(),
  menuParent: () => document.querySelector('.wT .byl'),
  menuRefer: () => document.querySelector('.wT .byl>.TK'),

  // Header elements
  // The header logo link, not the skip-link twin. Gmail now nests that
  // hidden twin inside the banner too, ahead of the real link, so take the
  // visible one; the positional [1] index only as a legacy fallback.
  titleNode: () => {
    const links = [...document.querySelectorAll('header[role="banner"] a[aria-label="Gmail"]')];
    return (
      links.find((link) => getComputedStyle(link).visibility !== 'hidden') ||
      links[links.length - 1] ||
      document.querySelectorAll('a[aria-label="Gmail"]')[1]
    );
  },
  headerElement: () => document.querySelector('.w-asV.bbg.aiw'),
  // Help / Settings / Gemini group on the right of the header
  headerActions: () =>
    document.querySelector('header[role="banner"] .bGJ') ||
    document.querySelector('header[role="banner"] .zo')?.parentElement,

  // Compose elements
  messageBody: () => document.querySelector('div[aria-label="Message Body"]'),
  messageFrom: () => document.querySelector('input[name="from"]'),
  messageSubjectBox: () => document.querySelector('input[name=subjectbox]'),

  // Email-specific elements (require email element as parameter)
  emailParticipants: (email) => email.querySelectorAll('.yW span[email]'),
  emailTitleNode: (email) => email.querySelector('.y6'),
  eventTitle: (email) => email.querySelector('.bqe, .bog'),
  emailCalendarEvent: (email) => email.querySelector('.aKS .aJ6'),
  emailDate: (email) => email.querySelector('.xW.xY span'),
  emailSubjectWrapper: (email) => email.querySelectorAll('.a4W'),
  emailAction: (email) => email.querySelector('.aKS'),
  emailLabels: (email) => email.querySelectorAll('.ar .at'),
  emailLabelEls: (email) => email.querySelectorAll('.at'),
  emailAllLabels: (email) => email.querySelectorAll('.ar.as'),
  emailSnoozed: (email) => email.querySelector('.by1.cL'),
  // Unstarred stars carry .aXw; starred ones dropped .T-KT-Jp in Gmail's 2026 markup
  emailStarred: (email) => email.querySelector('.T-KT:not(.aXw)'),
  emailCheckbox: (email) => email.querySelector('[role=checkbox]'),
  emailAvatarWrapper: (email) => email.querySelector('.oZ-x3'),
  emailMiscPart1: (email) => email.querySelectorAll('.y2'),
  emailMiscPart2: (email) => email.querySelectorAll('.yP,.zF'),
  emailMiscPart3: (email) => email.querySelectorAll('.Zt'),

  // Label-specific elements (require label element as parameter)
  labelTitle: (label) => label.querySelector('.at'),
  labelInnerText: (label) => label.querySelector('.av'),
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Global state variables
 */
let labelStats = {};
const hiddenEmailIds = [];
let options = {};

/* Resolves once the first options arrive - work that depends on a setting
   (e.g. whether Gravatar is on) waits on this instead of reading the empty
   defaults during startup */
let markOptionsLoaded;
const optionsLoaded = new Promise((resolve) => (markOptionsLoaded = resolve));
const menuNodes = {};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Add remove method to Element prototype if not exists
 */
if (!Element.prototype.remove) {
  Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
  };
}

/**
 * Gets the current user's email address from the UI
 * @returns {string} The user's email address or empty string if not found
 */
const getMyEmailAddress = () => {
  const emailAddr = select.emailAddress();
  const emailAddress = emailAddr && emailAddr.getAttribute('aria-label');
  const emailAddressText = emailAddress && emailAddress.match(/.*?\((.*?)\)/)?.[1];
  return emailAddressText || '';
};

/**
 * Creates an element with the given classes, attributes and children. Built
 * with DOM calls rather than innerHTML, so label and sender names are always
 * text (and addons.mozilla.org review doesn't flag it)
 * @param {string} tag - The tag name
 * @param {string} [className] - Space-separated classes
 * @param {Object<string, string>} [attrs] - Attributes to set
 * @param {Array<Node|string>} [children] - Child nodes or text
 * @returns {Element} The new element
 */
const createEl = (tag, className = '', attrs = {}, children = []) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
  el.append(...children);
  return el;
};

/**
 * Extracts domain from email address
 * @param {string} email - Email address
 * @returns {string} Domain name or empty string
 */
const extractDomain = (email) => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1].toLowerCase();
};

/**
 * Gets root domain by removing subdomains and www
 * @param {string} domain - Full domain (e.g., email.apple.com)
 * @returns {string} Root domain (e.g., apple.com)
 */
const getMainDomain = (domain) => {
  if (!domain) return '';

  // Remove www. prefix if present
  domain = domain.replace(/^www\./, '');

  // Split by dots and get last 2 parts for most domains
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;

  // Handle special cases like .co.uk, .com.au, etc.
  const specialTLDs = ['.co.uk', '.com.au', '.co.jp', '.co.za', '.com.br'];
  for (const tld of specialTLDs) {
    if (domain.endsWith(tld)) {
      const beforeTLD = domain.slice(0, -tld.length);
      const tldParts = beforeTLD.split('.');
      return tldParts.slice(-1)[0] + tld;
    }
  }

  // Default: last 2 parts
  return parts.slice(-2).join('.');
};

/**
 * Tests if an image URL is valid
 * @param {string} url - URL to test
 * @param {number} minWidth - Reject images narrower than this (placeholder
 *   icons load fine but are tiny)
 * @param {number} timeoutMs - Give up after this long
 * @returns {Promise<string|null|undefined>} URL if valid, null if it failed,
 *   undefined if it timed out (unknown - not worth remembering as missing)
 */
const testImageUrl = (url, minWidth = 0, timeoutMs = 2000) => {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(undefined);
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img.naturalWidth >= minWidth ? url : null);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };

    img.src = url;
  });
};

/**
 * Waits for an element to appear in the DOM and calls a callback when found
 * @param {string} selector - CSS selector for the element to wait for
 * @param {Function} callback - Function to call when element is found
 * @param {number} tries - Number of attempts, 100ms apart, before giving up
 *   (default: 300 - Gmail can take well over 10s to draw on a slow load)
 */
const waitForElement = (selector, callback, tries = 300) => {
  const element = document.querySelector(selector);
  if (element) {
    callback(element);
  } else if (tries > 0) {
    setTimeout(() => waitForElement(selector, callback, tries - 1), 100);
  } else {
    console.warn(
      `[Inbox Reborn] Gave up waiting for "${selector}" - Gmail may have changed this element. The feature depending on it is disabled.`,
    );
  }
};

/**
 * Clicks a Gmail control the way a user would - Gmail's buttons and
 * checkboxes act on mousedown/mouseup, not just click
 * @param {Element} el - The element to click
 */
const simulateClick = (el) => {
  ['mousedown', 'mouseup', 'click'].forEach((type) =>
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })),
  );
};

/**
 * Returns the first element matched by a list of selectors, tried in order.
 * Use for Gmail hooks with fallback chains: preferred/stable selector first,
 * older build-specific selectors after.
 * @param {...string} selectors - CSS selectors in priority order
 * @returns {Element|null} First match, or null if none match
 */
const queryFirst = (...selectors) => {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
};

/**
 * Finds a parent element matching a selector
 * @param {Element} elm - Starting element
 * @param {string} sel - CSS selector to match against parents
 * @returns {Element|null} The matching parent or null if not found
 */
const queryParentSelector = (elm, sel) => {
  if (!elm) return null;
  let parent = elm.parentElement;
  while (parent && !parent.matches(sel)) {
    parent = parent.parentElement;
    if (!parent) return null;
  }
  return parent;
};

/**
 * Encodes a label name for use in URLs
 * @param {string} label - The label name to encode
 * @returns {string} URL-encoded label name
 */
const fixLabel = (label) => encodeURIComponent(label.replace(/[/\\& ]/g, '-'));

// =============================================================================
// EMAIL CLASSIFICATION FUNCTIONS
// =============================================================================

/**
 * Determines if an email is a reminder based on user options
 * @param {Element} email - The email DOM element
 * @param {string} myEmailAddress - The user's email address
 * @returns {boolean} True if the email is a reminder
 */
const isReminder = (email, myEmailAddress) => {
  // If user doesn't want reminders treated special, return false
  if (options.reminderTreatment === 'none') return false;

  // Already identified - Gmail resets a reused row's classes when you come
  // back to a view, but keeps its contents, including the subject we removed
  if (email.dataset.reminder) return true;

  const nameNodes = select.emailParticipants(email);
  let allNamesMe = nameNodes.length > 0;

  // Check if all participants are the current user
  for (const nameNode of nameNodes) {
    if (nameNode.getAttribute('email') !== myEmailAddress) {
      allNamesMe = false;
      break;
    }
  }

  if (options.reminderTreatment === 'all') {
    return allNamesMe;
  } else if (options.reminderTreatment === 'containing-word') {
    const titleNode = select.emailTitleNode(email);
    return allNamesMe && titleNode && titleNode.innerText.match(/reminder/i);
  }

  return false;
};

/**
 * Determines if an email is a calendar event
 * @param {Element} email - The email DOM element
 * @returns {boolean} True if the email is a calendar event
 */
const isCalendarEvent = (email) => {
  const node = select.emailCalendarEvent(email);
  return node && node.innerText === 'RSVP';
};

/**
 * Determines if an email is snoozed
 * @param {Element} email - The email DOM element
 * @param {Date} curDate - Current email's date
 * @param {Date|null} prevDate - Previous email's date
 * @returns {boolean} True if the email is snoozed
 */
const isSnoozed = (email, curDate, prevDate) => {
  const node = select.emailSnoozed(email);
  if (node && node.innerText !== '') return true;
  return prevDate !== null && curDate < prevDate;
};

/**
 * Determines if an email is starred
 * @param {Element} email - The email DOM element
 * @returns {boolean} True if the email is starred
 */
const isStarred = (email) => {
  const node = select.emailStarred(email);
  return node && node.ariaLabel !== 'Not starred';
};

/**
 * Checks if an email has a specific CSS class
 * @param {Element} emailEl - The email DOM element
 * @param {string} klass - The CSS class to check for
 * @returns {boolean} True if the email has the class
 */
const checkEmailClass = (emailEl, klass) => emailEl.classList.contains(klass);

/**
 * Checks if the current view is the inbox
 * @returns {boolean} True if current view is inbox
 */
const isInInbox = () => isInboxHash();

/**
 * The current view's hash, without the query Gmail appends while a compose
 * window is open (#inbox?compose=new, #inbox?compose=<draft id>). Without
 * this, opening a compose window read as leaving the inbox, and the bundles
 * were taken down. A ? typed into a search is encoded (%3F), so the first
 * literal ? always starts Gmail's query.
 * @returns {string} e.g. #inbox
 */
const getViewHash = () => window.location.hash.split('?')[0];

/**
 * Checks whether a hash is an inbox list (Inbox, its category tabs, and
 * their pages). The URL changes before Gmail redraws, unlike the sidebar's
 * selected row, which lags behind and once let bundles form in Sent.
 * @param {string} hash - URL hash (default: the current one)
 * @returns {boolean} True for an inbox list
 */
const isInboxHash = (hash = getViewHash()) => /^#(inbox|category\/\w+)(\/p\d+)?$/.test(hash);

/**
 * Checks if the current view is a bundle
 * @returns {boolean} True if current view is a bundle
 */
const isInBundle = () =>
  /#search\/in%3Ainbox\+(label%3A|category%3A|%7Bcategory%3A)/.test(getViewHash());

/**
 * Checks if the current view is the Pinned filter
 * @returns {boolean} True if showing pinned inbox mail
 */
const isPinnedView = () => Object.values(PINNED_SEARCHES).map(toSearchHash).includes(getViewHash());

/**
 * Builds a Gmail search URL hash, in the form Gmail itself keeps in the URL
 * @param {string} query - The search query
 * @returns {string} The hash, e.g. #search/in%3Ainbox+is%3Astarred
 */
const toSearchHash = (query) => '#search/' + encodeURIComponent(query).replace(/%20/g, '+');

/**
 * Gets the Pinned view's hash for the current Reminders option
 * @returns {string} The Pinned search hash
 */
const getPinnedHash = () =>
  toSearchHash(PINNED_SEARCHES[options.reminderTreatment] || PINNED_SEARCHES['containing-word']);

/**
 * Checks if importance markers are present in the UI
 * @returns {Element|null} The importance marker element or null
 */
const checkImportantMarkers = () => select.importanceMarkers();

/**
 * Whether a label is nested under an "Unbundled" label - the original way to
 * keep a label out of bundling, still honored
 * @param {string} label - The label name
 * @returns {boolean} True for Unbundled/... labels
 */
const hasUnbundledParentLabel = (label) => label.indexOf(CSS_CLASSES.UNBUNDLED_PARENT_LABEL) >= 0;

/**
 * Checks if an email has a label nested under an "Unbundled" label, which
 * keeps the whole email out of bundles (its chips are tidied too). Labels
 * left in the left menu's Unbundled section are simply skipped when the
 * email is bundled - see isLabelBundled.
 * @param {string[]} labels - Array of label names
 * @returns {boolean} True if the email has an Unbundled label
 */
const checkEmailUnbundledLabel = (labels) => labels.some(hasUnbundledParentLabel);

/**
 * Gets the read status of an email
 * @param {Element} emailEl - The email DOM element
 * @returns {boolean} True if the email is read
 */
const getReadStatus = (emailEl) => !emailEl.classList.contains('zE');

// =============================================================================
// DATE HANDLING FUNCTIONS
// =============================================================================

/**
 * Gets the raw date string from an email
 * @param {Element} email - The email DOM element
 * @returns {string|undefined} The raw date string
 */
const getRawDate = (email) => {
  const dateElement = select.emailDate(email);
  return dateElement ? dateElement.getAttribute('title') : undefined;
};

/**
 * Converts a raw date string to a Date object
 * @param {string} rawDate - The raw date string
 * @returns {Date|undefined} The Date object
 */
const getDate = (rawDate) => (rawDate ? new Date(rawDate) : undefined);

/**
 * Builds a human-readable date label based on the date
 * @param {Date} date - The date to build a label for
 * @returns {string} A human-readable date label
 */
const buildDateLabel = (date) => {
  if (!date) return undefined;

  const now = new Date();

  // Count whole calendar days between local midnights, so Yesterday and This
  // week work across month and year boundaries (and DST shifts)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((today - day) / 86400000);

  if (daysAgo === 0) return DATE_LABELS.TODAY;
  if (daysAgo === 1) return DATE_LABELS.YESTERDAY;
  // Weeks start on Sunday: getDay() is the number of days since then
  if (daysAgo > 1 && daysAgo <= now.getDay()) return DATE_LABELS.THIS_WEEK;

  if (now.getFullYear() === date.getFullYear()) {
    if (now.getMonth() === date.getMonth()) return DATE_LABELS.THIS_MONTH;
    return MONTHS[date.getMonth()];
  }

  if (now.getFullYear() - 1 === date.getFullYear()) return DATE_LABELS.LAST_YEAR;

  return date.getFullYear().toString();
};

/**
 * Adds a date label before an email
 * @param {Element} email - The email DOM element
 * @param {string} label - The date label text
 */
const addDateLabel = (email, label) => {
  // Remove existing date label if it's different
  if (email.previousSibling && email.previousSibling.className === 'time-row') {
    if (email.previousSibling.querySelector('.time')?.innerText === label) return;
    email.previousSibling.remove();
  }

  // Create new date label
  const timeRow = document.createElement('div');
  timeRow.classList.add('time-row');

  const time = document.createElement('div');
  time.className = 'time';
  time.innerText = label;

  // Inbox's sweep button - archives everything in the group that isn't pinned
  const sweep = document.createElement('div');
  sweep.className = 'sweep-button';
  sweep.setAttribute('role', 'button');
  sweep.title = 'Mark all as done (pinned emails stay)';
  sweep.appendChild(createSweepIcon());
  sweep.addEventListener('click', (e) => {
    e.stopPropagation();
    sweepDateGroup(timeRow);
  });

  timeRow.append(time, sweep);
  email.parentElement.insertBefore(timeRow, email);
};

/**
 * Makes exactly these emails the selection in a list by ticking Gmail's own
 * checkboxes, so toolbar actions apply to them (and only them)
 * @param {Element} list - The list the emails live in
 * @param {Element[]} emails - Rows to select; rows without a checkbox are skipped
 */
const selectOnlyEmails = (list, emails) => {
  const wanted = new Set(emails);
  list.querySelectorAll('.zA.x7').forEach((email) => {
    const checkbox = select.emailCheckbox(email);
    if (checkbox && !wanted.has(email)) simulateClick(checkbox);
  });
  emails.forEach((email) => {
    const checkbox = select.emailCheckbox(email);
    if (checkbox && !email.classList.contains('x7')) simulateClick(checkbox);
  });
};

/**
 * Archives every email in a date group except pinned (starred) ones, like
 * Inbox's sweep. Selects the rows and presses Gmail's own Archive button, so
 * Gmail's "Undo" toast still works. A bundle in the group sweeps the bundled
 * emails behind it.
 * @param {Element} timeRow - The date label row that starts the group
 */
const sweepDateGroup = (timeRow) => {
  const list = timeRow.parentElement;
  const toSweep = new Set();

  for (let row = timeRow.nextElementSibling; row; row = row.nextElementSibling) {
    if (row.classList.contains('time-row')) break;
    if (!row.classList.contains('zA')) continue;

    if (row.classList.contains(CSS_CLASSES.BUNDLE_WRAPPER)) {
      getBundleEmails(row).forEach((email) => toSweep.add(email));
    } else if (!row.classList.contains(CSS_CLASSES.BUNDLED_EMAIL)) {
      // Bundled rows are hidden; they go with their bundle, wherever it sits
      toSweep.add(row);
    }
  }

  archiveUnpinned(list, [...toSweep]);
};

/**
 * The hidden email rows behind a bundle, in the bundle's own list
 * @param {Element} wrapper - The bundle row
 * @returns {Element[]} The bundled emails with that bundle's label
 */
const getBundleEmails = (wrapper) => {
  const bundleLabel = wrapper.getAttribute('bundleLabel');
  return [...wrapper.parentElement.querySelectorAll(`.zA.${CSS_CLASSES.BUNDLED_EMAIL}`)].filter(
    (email) => getLabels(email).includes(bundleLabel),
  );
};

/**
 * Archives emails except pinned (starred) ones. Selects the rows and presses
 * Gmail's own Archive button, so Gmail's "Undo" toast still works.
 * @param {Element} list - The list the emails live in
 * @param {Element[]} candidates - Rows to archive
 */
const archiveUnpinned = (list, candidates) => {
  const emails = candidates.filter((email) => !isStarred(email) && select.emailCheckbox(email));
  if (!emails.length) return;

  // Start from an empty selection so only these get archived
  selectOnlyEmails(list, emails);

  // Gmail only shows Archive once something is selected
  const archiveButton = Array.from(select.archiveButtons()).find(
    (el) => el.getClientRects().length,
  );
  if (archiveButton) {
    simulateClick(archiveButton);
  } else {
    emails.forEach((email) => simulateClick(select.emailCheckbox(email)));
  }
};

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
  const bundle = document.querySelector(`div[bundleLabel="${label}"]`);
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
  const bundle = document.querySelector(`div[bundleLabel="${label}"]`);
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
  const bundleLabel = document.querySelector(`div[bundleLabel="${label}"] .label-link`);
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
  const bundleSenders = document.querySelector(`div[bundleLabel="${label}"] .bundle-senders`);
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
  custom: 'images/ic_custom-cluster_24px_g60_r3_2x.png',
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
    bundleImage.match(/custom-cluster/) && getBundleTitleColorForLabel(email, label);
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

// =============================================================================
// OPTIONS MANAGEMENT
// =============================================================================

/**
 * Reloads user options and applies them to the UI
 */
const reloadOptions = () => {
  // Get options from Chrome storage and apply them once the fresh values
  // arrive, so toggles take effect without waiting an extra polling cycle
  chrome.runtime.sendMessage({ method: 'getOptions' }, function (ops) {
    options = ops;
    markOptionsLoaded();
    requestCategoryThreads();

    // Apply avatar options
    if (options.showAvatar === 'enabled') {
      addClassToBody(CSS_CLASSES.AVATAR_OPTION);
    } else if (options.showAvatar === 'disabled') {
      removeClassFromBody(CSS_CLASSES.AVATAR_OPTION);
      // Remove avatar elements
      document
        .querySelectorAll('.' + CSS_CLASSES.AVATAR_EMAIL)
        .forEach((avatarEl) => avatarEl.classList.remove(CSS_CLASSES.AVATAR_EMAIL));
      document.querySelectorAll('.' + CSS_CLASSES.AVATAR).forEach((avatarEl) => avatarEl.remove());
    }

    // Apply priority inbox options
    if (options.priorityInbox === 'enabled') {
      addClassToBody(CSS_CLASSES.PRIORITY_INBOX_OPTION);
    } else {
      removeClassFromBody(CSS_CLASSES.PRIORITY_INBOX_OPTION);
    }

    // Hide: the date/time on list rows (Inbox showed none), Gmail's AI Inbox
    // and All Mail menu rows, and the extension's Travel and Finance rows
    toggleBodyClass(CSS_CLASSES.HIDE_DATE_TIME_OPTION, options.hideDateTime === 'enabled');
    toggleBodyClass(CSS_CLASSES.HIDE_AI_INBOX_OPTION, options.hideAiInbox === 'enabled');
    toggleBodyClass(CSS_CLASSES.HIDE_ALL_MAIL_OPTION, options.hideAllMail === 'enabled');
    toggleBodyClass(CSS_CLASSES.HIDE_TRAVEL_OPTION, options.hideTravel === 'enabled');
    toggleBodyClass(CSS_CLASSES.HIDE_FINANCE_OPTION, options.hideFinance === 'enabled');

    // Apply email bundling options
    if (options.emailBundling === 'enabled') {
      addClassToBody(CSS_CLASSES.BUNDLING_OPTION);
    } else if (options.emailBundling === 'disabled') {
      removeClassFromBody(CSS_CLASSES.BUNDLING_OPTION);
      // Unbundle emails
      document
        .querySelectorAll('.' + CSS_CLASSES.BUNDLED_EMAIL)
        .forEach((emailEl) => emailEl.classList.remove(CSS_CLASSES.BUNDLED_EMAIL));
      // Remove bundle wrapper rows
      document
        .querySelectorAll('.' + CSS_CLASSES.BUNDLE_WRAPPER)
        .forEach((bundleEl) => bundleEl.remove());
    }
  });
};

// Reload the page when options change in the popup, so every setting takes
// effect from a clean state. Dark mode is excluded - it applies instantly
// via the initDarkMode storage listener without needing a refresh.
chrome.storage?.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.options) return;

  const oldOpts = changes.options.oldValue || {};
  const newOpts = changes.options.newValue || {};
  const changedKeys = Object.keys({ ...oldOpts, ...newOpts }).filter(
    (key) => oldOpts[key] !== newOpts[key],
  );

  if (changedKeys.length && !changedKeys.every((key) => key === 'darkMode')) {
    location.reload();
  }
});

// =============================================================================
// EMAIL PROCESSING
// =============================================================================

/**
 * Gets labels from an email
 * @param {Element} email - The email DOM element
 * @returns {string[]} Array of label names
 */
const getLabels = (email) => {
  const chips = Array.from(select.emailLabels(email)).map((el) => el.attributes.title?.value || '');
  const category = getCategoryBundle(email);
  if (!category) return chips;
  // One bundle per email, like Inbox: Purchases/Travel/Finance beat the
  // broad tab category chip Gmail also files the email under (usually Updates)
  return [
    ...chips.filter((label) => label !== category && !GMAIL_CATEGORY_CHIPS.includes(label)),
    category,
  ];
};

// =============================================================================
// CATEGORY BUNDLES (PURCHASES, TRAVEL, FINANCE)
// =============================================================================

/* Gmail sorts mail into Purchases, Travel and Finance on its servers but
   draws no chip for them on inbox rows, so getLabels can't see them. The
   page script src/gmail-categories.js runs Gmail's own "in:inbox
   category:<name>" searches and posts back the matching thread ids, and
   getLabels adds the category to those rows. Inbox's order decides between
   them when Gmail files an email under more than one. */
const CATEGORY_BUNDLES = { Travel: 'travel', Purchases: 'purchases', Finance: 'finance' };
const CATEGORY_BUNDLE_OPTIONS = {
  Travel: 'bundleTravel',
  Purchases: 'bundlePurchases',
  Finance: 'bundleFinance',
};
// Gmail's tab categories, as their chips read on a row
const GMAIL_CATEGORY_CHIPS = ['Social', 'Updates', 'Forums', 'Promotions'];
const CATEGORIES_MESSAGE_SOURCE = 'inbox-reborn-categories';

let categoryThreads = new Map(); // hex thread id -> bundle name
let wantedCategoriesKey = null;

/**
 * Gmail's thread id for a row, as hex (what the category search returns)
 * @param {Element} email - The email row
 * @returns {string|undefined} e.g. "1a1959a3d36e4ab1"
 */
const getThreadId = (email) =>
  email.querySelector('[data-legacy-thread-id]')?.getAttribute('data-legacy-thread-id');

/**
 * The Purchases/Travel/Finance bundle an inbox row belongs in, if that
 * bundle is turned on
 * @param {Element} email - The email row
 * @returns {string|undefined} 'Travel', 'Purchases' or 'Finance'
 */
const getCategoryBundle = (email) => {
  if (!categoryThreads.size) return undefined;
  const id = getThreadId(email);
  return id && categoryThreads.get(id);
};

/**
 * Whether a bundle name is one of the category bundles
 * @param {string} label - The bundle label
 * @returns {boolean} True for a turned-on Purchases, Travel or Finance
 */
const isCategoryBundle = (label) =>
  label in CATEGORY_BUNDLES && !!options[CATEGORY_BUNDLE_OPTIONS[label]];

/**
 * Tells the page script which category searches to run - none unless
 * bundling and at least one category switch are on. Only sends on change,
 * since options reload on every pass.
 */
const requestCategoryThreads = () => {
  const categories =
    options.emailBundling === 'enabled'
      ? Object.entries(CATEGORY_BUNDLES)
          .filter(([name]) => options[CATEGORY_BUNDLE_OPTIONS[name]])
          .map(([, key]) => key)
      : [];
  const key = categories.join(',');
  if (key === wantedCategoriesKey) return;
  wantedCategoriesKey = key;
  if (!categories.length) categoryThreads = new Map();
  window.postMessage(
    { source: CATEGORIES_MESSAGE_SOURCE, type: 'want', categories },
    location.origin,
  );
};

/**
 * Takes the page script's search results. Rows whose category changed are
 * let go from their old bundle, and the next pass bundles them again.
 * @param {Object} threads - { travel: [ids], purchases: [ids], finance: [ids] }
 */
const applyCategoryThreads = (threads) => {
  const next = new Map();
  Object.entries(CATEGORY_BUNDLES).forEach(([name, key]) => {
    if (!options[CATEGORY_BUNDLE_OPTIONS[name]]) return;
    const ids = Array.isArray(threads?.[key]) ? threads[key] : [];
    ids.forEach((id) => {
      if (typeof id === 'string' && /^[0-9a-f]{1,32}$/.test(id) && !next.has(id)) {
        next.set(id, name);
      }
    });
  });

  const changed = new Set(
    [...categoryThreads.keys(), ...next.keys()].filter(
      (id) => categoryThreads.get(id) !== next.get(id),
    ),
  );
  categoryThreads = next;
  if (!changed.size) return;

  document.querySelectorAll(`.zA.${CSS_CLASSES.BUNDLED_EMAIL}`).forEach((email) => {
    if (!changed.has(getThreadId(email))) return;
    email.classList.remove(CSS_CLASSES.BUNDLED_EMAIL);
    removeStyleNodeWithEmailId(email.id);
  });
};

window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.source !== CATEGORIES_MESSAGE_SOURCE) return;
  if (e.data.type === 'threads') applyCategoryThreads(e.data.threads);
  // The speed dial's people from Gmail's Sent search, newest first - the
  // same order the Sent list re-sync uses
  if (e.data.type === 'sent' && Array.isArray(e.data.recipients)) {
    const recipients = e.data.recipients
      .filter((r) => typeof r?.email === 'string' && r.email.includes('@'))
      .map((r) => ({ email: r.email, name: typeof r.name === 'string' ? r.name : '' }));
    if (recipients.length) rememberRecentContacts(recipients, true);
  }
});

// Firefox's Manifest V2 build can't declare a main-world content script
// (chrome.json does), so it adds the page script as a <script> instead
if (chrome.runtime?.getManifest?.().manifest_version === 2) {
  const pageScript = document.createElement('script');
  pageScript.src = chrome.runtime.getURL('src/gmail-categories.js');
  pageScript.onload = () => pageScript.remove();
  (document.head || document.documentElement).append(pageScript);
}

/**
 * Gets all tabs from the UI
 * @returns {string[]} Array of tab names
 */
const getTabs = () => Array.from(select.tabs()).map((el) => el.innerText);

/**
 * Processes all emails in the current view
 * @returns {[Array, Set]} Array of processed email info objects and set of all labels
 */
const getEmails = () => {
  const emails = select.emails();
  const myEmailAddress = getMyEmailAddress();
  const isInInboxFlag = isInInbox();
  const isInBundleFlag = isInBundle();
  const processedEmails = [];
  const allLabels = new Set();
  const tabs = getTabs();

  const currentTab = tabs.length && select.currentTab();
  let prevTimeStamp = null;
  let prevList = null;
  labelStats = {};

  // Add or remove bundle page class based on current view
  isInBundleFlag
    ? addClassToBody(CSS_CLASSES.BUNDLE_PAGE)
    : removeClassFromBody(CSS_CLASSES.BUNDLE_PAGE);

  // Process emails from last to first (bottom to top in UI)
  for (let i = emails.length - 1; i >= 0; i--) {
    const email = emails[i];

    // Gmail keeps other views' lists (a label you opened, the pre-refresh
    // inbox) hidden in the DOM, and select.emails() returns them all. Compare
    // dates only within one list - otherwise the visible inbox is measured
    // against a newer email in a hidden list and every row reads as snoozed
    if (email.parentElement !== prevList) {
      prevList = email.parentElement;
      prevTimeStamp = null;
    }

    const info = {
      emailEl: email,

      // Email classification
      isReminder: isReminder(email, myEmailAddress),
      reminderAlreadyProcessed: () => checkEmailClass(email, CSS_CLASSES.REMINDER_EMAIL),

      // Date information
      dateString: getRawDate(email),
      date: null, // Will be set below
      dateLabel: null, // Will be set below

      // Email status
      isSnooze: false, // Will be set below
      isStarred: isStarred(email),
      isCalendarEvent: isCalendarEvent(email),

      // Labels
      labels: getLabels(email),

      // Unbundled status
      unbundledAlreadyProcessed: () => checkEmailClass(email, CSS_CLASSES.UNBUNDLED_EMAIL),
      isUnbundled: false, // Will be set below

      // Read status
      isUnread: !getReadStatus(email),

      // Subject
      subjectEl: select.emailTitleNode(email),
      subject: '', // Will be set below

      // Processing status flags
      isBundleEmail: () => checkEmailClass(email, CSS_CLASSES.BUNDLED_EMAIL),
      isBundleWrapper: () => checkEmailClass(email, CSS_CLASSES.BUNDLE_WRAPPER),
      avatarAlreadyProcessed: () => checkEmailClass(email, CSS_CLASSES.AVATAR_EMAIL),
      bundleAlreadyProcessed: () =>
        checkEmailClass(email, CSS_CLASSES.BUNDLED_EMAIL) ||
        checkEmailClass(email, CSS_CLASSES.BUNDLE_WRAPPER),
      calendarAlreadyProcessed: () => checkEmailClass(email, CSS_CLASSES.CALENDAR_EMAIL),
    };

    // Set date information
    info.date = getDate(info.dateString);
    info.dateLabel = buildDateLabel(info.date);

    // Check if email is snoozed
    info.isSnooze = isSnoozed(email, info.date, prevTimeStamp);

    // Only update prevTimeStamp if not snoozed
    if (!info.isSnooze && info.date) {
      prevTimeStamp = info.date;
    }

    // Add labels to the set of all labels
    info.labels.forEach((l) => allLabels.add(l));

    // Check for Unbundled parent label
    info.isUnbundled = checkEmailUnbundledLabel(info.labels);

    // Process unbundled emails
    if (
      (isInInboxFlag || isInBundleFlag) &&
      info.isUnbundled &&
      !info.unbundledAlreadyProcessed()
    ) {
      addClassToEmail(email, CSS_CLASSES.UNBUNDLED_EMAIL);

      // Tidy the chips of emails under an "Unbundled" label (labels dragged
      // to the Unbundled section keep their chips as they are)
      if (info.labels.some(hasUnbundledParentLabel)) {
        select.emailAllLabels(info.emailEl).forEach((labelEl) => {
          if (hasUnbundledParentLabel(select.labelTitle(labelEl).title)) {
            // Remove 'Unbundled/' from display in the UI
            select.labelInnerText(labelEl).innerText = labelEl.innerText.replace(
              CSS_CLASSES.UNBUNDLED_PARENT_LABEL + '/',
              '',
            );
          } else {
            // Hide labels that aren't nested under UNBUNDLED_PARENT_LABEL
            labelEl.hidden = true;
          }
        });
      }
    }

    // Hide tab labels from emails
    if (currentTab) {
      select.emailAllLabels(info.emailEl).forEach((labelEl) => {
        if (labelEl.innerText === currentTab.innerText) {
          labelEl.hidden = true;
        }
      });
    }

    // Set subject
    info.subject = info.subjectEl ? info.subjectEl.innerText.trim() : '';

    // Collect statistics for labels
    if (info.labels.length) {
      const participants = Array.from(select.emailParticipants(email));
      const firstParticipant = participants[0]?.getAttribute('name') || '';

      info.labels.forEach((label) => {
        if (!(label in labelStats)) {
          labelStats[label] = {
            title: label,
            count: 1,
            senders: [
              {
                name: firstParticipant,
                isUnread: info.isUnread,
              },
            ],
            containsUnread: info.isUnread,
          };
        } else {
          labelStats[label].count++;
          labelStats[label].senders.push({
            name: firstParticipant,
            isUnread: info.isUnread,
          });
          if (info.isUnread) {
            labelStats[label].containsUnread = true;
          }
        }
      });
    }

    processedEmails[i] = info;
  }

  // Update bundle statistics
  for (const label in labelStats) {
    // Set message count for each bundle row
    addCountToBundle(label, labelStats[label].count);

    // Set list of senders for each bundle row
    addSendersToBundle(label, labelStats[label].senders);

    // Set bold title class for any bundle containing an unread email
    labelStats[label].containsUnread
      ? addClassToBundle(label, CSS_CLASSES.UNREAD_BUNDLE)
      : removeClassFromBundle(label, CSS_CLASSES.UNREAD_BUNDLE);
  }

  return [processedEmails, allLabels];
};

/**
 * Main function to update and process emails
 */
const updateReminders = () => {
  // Reload user options
  reloadOptions();

  // Get processed emails and all labels
  const [emails, allLabels] = getEmails();

  // Get user email and UI state
  const myEmail = getMyEmailAddress();
  let lastLabel = null;
  let lastList = null;
  const isInInboxFlag = isInInbox();
  const hasImportantMarkers = checkImportantMarkers();
  const tabs = getTabs();

  // Clean up date labels
  cleanupDateLabels();

  // Bundles belong to the inbox only
  if (!isInInboxFlag) removeStrayBundles();

  // Get current bundle state
  const emailBundles = getBundledLabels();

  // Process each email
  for (const emailInfo of emails) {
    const emailEl = emailInfo.emailEl;

    // Process reminders
    if (emailInfo.isReminder && !emailInfo.reminderAlreadyProcessed()) {
      // For emails with just "Reminder" as subject, clean up the display
      if (emailInfo.subject.toLowerCase() === 'reminder') {
        emailInfo.subjectEl.outerHTML = '';
        select.emailMiscPart3(emailEl).forEach((node) => (node.outerHTML = ''));
        select.emailMiscPart1(emailEl).forEach((node) => (node.style.color = '#202124'));
      }

      // Set the snippet text to "Reminder"
      select.emailMiscPart2(emailEl).forEach((node) => {
        node.innerHTML = 'Reminder';
      });

      // Add avatar for reminders
      const avatarWrapperEl = select.emailAvatarWrapper(emailEl);
      if (
        avatarWrapperEl &&
        avatarWrapperEl.getElementsByClassName(CSS_CLASSES.AVATAR).length === 0
      ) {
        const avatarElement = document.createElement('div');
        avatarElement.className = CSS_CLASSES.AVATAR;
        avatarWrapperEl.appendChild(avatarElement);
      }

      // Mark as processed
      addClassToEmail(emailEl, CSS_CLASSES.REMINDER_EMAIL);
      emailEl.dataset.reminder = 'true';
    }
    // Process avatars for non-reminders
    else if (
      options.showAvatar === 'enabled' &&
      !emailInfo.reminderAlreadyProcessed() &&
      !emailInfo.avatarAlreadyProcessed() &&
      !emailInfo.bundleAlreadyProcessed()
    ) {
      const participants = Array.from(select.emailParticipants(emailEl));
      if (!participants.length) continue; // Skip emails without participants (e.g., drafts)

      let firstParticipant = participants[0];

      // Prefer participants other than the current user
      const excludingMe = participants.filter(
        (node) => node.getAttribute('email') !== myEmail && node.getAttribute('name'),
      );

      if (excludingMe.length > 0) {
        firstParticipant = excludingMe[0];
      }

      const name = firstParticipant.getAttribute('name');
      const firstLetter = (name && name.toUpperCase()[0]) || '-';
      const targetElement = select.emailAvatarWrapper(emailEl);

      // Add avatar element if not already present
      if (targetElement && targetElement.getElementsByClassName(CSS_CLASSES.AVATAR).length === 0) {
        const avatarElement = document.createElement('div');
        avatarElement.className = CSS_CLASSES.AVATAR;
        const firstLetterCode = firstLetter.charCodeAt(0);

        // Set background color based on first letter
        if (firstLetterCode >= 65 && firstLetterCode <= 90) {
          const baseColor = '#' + NAME_COLORS[firstLetterCode - 65];

          // Force background color, even in dark mode
          avatarElement.style.setProperty('background-color', baseColor, 'important');

          // Ensure text is white
          avatarElement.style.color = '#ffffff';
        } else {
          avatarElement.style.background = '#000000';
          // Some unicode characters need special handling
          avatarElement.style.color = 'transparent';
          avatarElement.style.textShadow = '0 0 rgba(255, 255, 255, 0.65)';
        }

        avatarElement.innerText = firstLetter;
        targetElement.appendChild(avatarElement);

        // Swap the letter for a picture once one is found (see resolveAvatar)
        const email = firstParticipant.getAttribute('email')?.toLowerCase();
        if (email) {
          targetElement.dataset.avatarEmail = email;
          resolveAvatar(email)
            .then((avatar) => {
              // A photo learned while this lookup ran has already been put in
              if (!avatar || (avatar.source !== 'photo' && contactPhotos.has(email))) return;
              replaceAvatarWithWeb(targetElement, avatar, name);
            })
            .catch(() => {
              // Silently handle errors
            });
        }
      }

      // Mark as processed
      addClassToEmail(emailEl, CSS_CLASSES.AVATAR_EMAIL);
    }

    // Process calendar events
    if (emailInfo.isCalendarEvent && !emailInfo.calendarAlreadyProcessed()) {
      addClassToEmail(emailEl, CSS_CLASSES.CALENDAR_EMAIL);
      addEventAttachment(emailEl);
    }

    // Handle date labels - each list gets its own run of labels
    if (emailEl.parentElement !== lastList) {
      lastList = emailEl.parentElement;
      lastLabel = null;
    }

    // "Show bundles in Today" puts every bundle in Today, whatever its
    // newest email's date
    let label =
      options.bundleToday && emailInfo.isBundleWrapper() ? DATE_LABELS.TODAY : emailInfo.dateLabel;

    // Special handling for snoozed emails
    if (emailInfo.isSnooze) {
      // If this is the first email, assume Today, otherwise use previous label
      label = lastLabel == null ? DATE_LABELS.TODAY : lastLabel;
    }

    // Add date label if it's a new label
    if (label !== lastLabel) {
      addDateLabel(emailEl, label);
      lastLabel = label;
    } else if (emailEl.previousSibling?.className === 'time-row') {
      // A label left over from an earlier pass (rows shifted after a Gmail
      // refresh) that no longer starts a new date group
      emailEl.previousSibling.remove();
    }

    // Handle email bundling
    if (options.emailBundling === 'enabled') {
      // Remove bundles that no longer have associated emails
      if (emailInfo.isBundleWrapper() && !allLabels.has(emailEl.getAttribute('bundleLabel'))) {
        emailEl.remove();
        continue;
      }

      // Determine which labels should be bundled
      const labelsToBundle = [];
      if (!options.bundleOne) {
        // Count emails per label to find labels with multiple emails
        const labelCounts = emails.reduce((counts, email) => {
          email.labels.forEach((label) => (counts[label] = (counts[label] || 0) + 1));
          return counts;
        }, {});

        // Only bundle labels with more than one email
        for (const label in labelCounts) {
          if (labelCounts[label] > 1) {
            labelsToBundle.push(label);
          }
        }
      }

      // Filter out tab labels and labels left in the left menu's Unbundled
      // section (the categories always bundle)
      let labels = emailInfo.labels.filter((x) => !tabs.includes(x) && isLabelBundled(x));

      // If bundleOne is disabled, only bundle labels with multiple emails
      if (!options.bundleOne) {
        labels = labelsToBundle.length ? labels.filter((x) => labelsToBundle.includes(x)) : [];
      }

      // Bundle eligible emails
      if (
        isInInboxFlag &&
        canBeInboxRow(emailEl, emailInfo.labels) &&
        !emailInfo.isStarred &&
        labels.length &&
        !emailInfo.isUnbundled &&
        !emailInfo.bundleAlreadyProcessed()
      ) {
        labels.forEach((label) => {
          addClassToEmail(emailEl, CSS_CLASSES.BUNDLED_EMAIL);

          // Hide bundled emails with CSS
          if (!hiddenEmailIds.includes(emailEl.id)) {
            createStyleNodeWithEmailId(emailEl.id);
          }

          // Create bundle wrapper if needed
          if (!(label in emailBundles)) {
            buildBundleWrapper(emailEl, label, hasImportantMarkers);
            emailBundles[label] = true;
          }
        });
      }
      // Show previously hidden emails that are no longer bundled
      else if (!emailInfo.isUnbundled && !labels.length && hiddenEmailIds.includes(emailEl.id)) {
        removeStyleNodeWithEmailId(emailEl.id);
      }
    }
  }
};

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
const BUNDLED_LABELS_KEY = 'bundledLabels';
const LABEL_SECTIONS = { BUNDLED: 'bundled', UNBUNDLED: 'unbundled' };
const LABEL_SECTION_ATTR = 'data-inbox-section';
const DROP_TARGET_ATTR = 'data-drop-target';
const LABEL_SECTION_CLASSES = {
  ON: 'inbox-reborn-label-sections-on', // on <body> while the sections are drawn
  LIST: 'inbox-reborn-label-sections', // Gmail's label list, once split
  TITLE: 'inbox-reborn-section-title', // the Unbundled title row
  HINT: 'inbox-reborn-section-hint', // how-to row, shown while no label is bundled
  DRAGGING: 'inbox-reborn-label-dragging', // on <body> during a drag
  GHOST: 'inbox-reborn-label-ghost', // the label name under the pointer
  DRAG_SOURCE: 'inbox-reborn-label-drag-source', // the row being dragged
};
const BUNDLED_SECTION_TITLE = 'Bundled in the inbox';
const UNBUNDLED_SECTION_TITLE = 'Unbundled';
const BUNDLED_SECTION_HINT = 'Drag a label up here to bundle its emails in the inbox';

let bundledLabelsStore = null; // { [account]: label names } as stored; null until read
let bundledLabels = { account: null, set: new Set() }; // the signed-in account's share

/**
 * Reads the bundled labels from storage and follows later changes (a drop
 * in another Gmail tab)
 */
const loadBundledLabels = () => {
  chrome.storage?.local.get(BUNDLED_LABELS_KEY, (result) => {
    bundledLabelsStore = result[BUNDLED_LABELS_KEY] || {};
    bundledLabels = { account: null, set: new Set() };
    rebuildBundles();
    layoutLabelSections();
  });
  chrome.storage?.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[BUNDLED_LABELS_KEY]) return;
    const next = changes[BUNDLED_LABELS_KEY].newValue || {};
    if (JSON.stringify(next) === JSON.stringify(bundledLabelsStore)) return; // this tab's own write
    bundledLabelsStore = next;
    bundledLabels = { account: null, set: new Set() };
    rebuildBundles();
    layoutLabelSections();
  });
};

/**
 * The bundled labels of the signed-in account. The account is looked up
 * until Gmail has drawn it; after that the set is reused.
 * @returns {Set<string>} Top-level label names
 */
const getBundledLabelSet = () => {
  if (!bundledLabels.account || bundledLabels.account === 'default') {
    const account = getMyEmailAddress() || 'default';
    if (bundledLabels.account !== account) {
      bundledLabels = { account, set: new Set(bundledLabelsStore?.[account] || []) };
    }
  }
  return bundledLabels.set;
};

/**
 * Whether the left menu is split into the two sections: bundling is on and
 * the stored bundled labels have been read
 * @returns {boolean} True when the sections are drawn
 */
const areLabelSectionsOn = () => options.emailBundling === 'enabled' && !!bundledLabelsStore;

/**
 * A label and the labels it is nested under, outermost first
 * @param {string} label - e.g. "Work/Projects/Alpha"
 * @returns {string[]} e.g. ["Work", "Work/Projects", "Work/Projects/Alpha"]
 */
const labelAndParents = (label) =>
  label.split('/').map((_, i, parts) => parts.slice(0, i + 1).join('/'));

/**
 * Whether a label's mail bundles in the inbox: the categories always do, and
 * a label does once it (or a label it is nested under) was dragged to
 * "Bundled in the inbox". Nothing bundles until storage has answered.
 * @param {string} label - The label name
 * @returns {boolean} True for a bundled label
 */
const isLabelBundled = (label) => {
  if (label in CATEGORY_BUNDLES || GMAIL_CATEGORY_CHIPS.includes(label)) return true;
  if (!bundledLabelsStore || hasUnbundledParentLabel(label)) return false;
  return labelAndParents(label).some((name) => getBundledLabelSet().has(name));
};

/**
 * Whether a left-menu label row can be dragged between the sections. Nested
 * labels follow their parent; labels under an "Unbundled" label are unbundled
 * by name; a label named like a category shares that category's bundle.
 * @param {string} label - The label name
 * @returns {boolean} True when the row can be dragged
 */
const isLabelDraggable = (label) =>
  !!label &&
  !label.includes('/') &&
  !hasUnbundledParentLabel(label) &&
  !(label in CATEGORY_BUNDLES) &&
  !GMAIL_CATEGORY_CHIPS.includes(label);

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
 * Moves a label into or out of "Bundled in the inbox", saves it, and redraws
 * the left menu and the inbox
 * @param {string} label - A top-level label name
 * @param {boolean} bundled - True to start bundling the label
 */
const setLabelBundled = (label, bundled) => {
  const set = getBundledLabelSet();
  if (set.has(label) === bundled) return;
  if (bundled) set.add(label);
  else set.delete(label);
  bundledLabelsStore = { ...bundledLabelsStore, [bundledLabels.account]: [...set].sort() };
  chrome.storage.local.set({ [BUNDLED_LABELS_KEY]: bundledLabelsStore });
  rebuildBundles();
  layoutLabelSections();
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
 * are on) plus Travel and Finance. Only adds what is missing.
 * @param {Element} list - The label list
 */
const placeCategoryRows = (list) => {
  const gmailRows = Object.fromEntries(
    CATEGORY_MENU_ORDER.map((name) => [name, getGmailCategoryRow(name)]),
  );
  const template = CATEGORY_MENU_ORDER.map((name) => gmailRows[name]).find(Boolean);
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
 * Builds the Unbundled title row
 * @returns {Element} The title row
 */
const buildUnbundledTitle = () =>
  createEl('div', LABEL_SECTION_CLASSES.TITLE, { role: 'heading', 'aria-level': '2' }, [
    UNBUNDLED_SECTION_TITLE,
  ]);

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

  list.classList.add(LABEL_SECTION_CLASSES.LIST);
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

  let bundledCount = 0;
  getLabelRows(list).forEach((row) => {
    const section = isLabelBundled(getLabelRowName(row))
      ? LABEL_SECTIONS.BUNDLED
      : LABEL_SECTIONS.UNBUNDLED;
    if (section === LABEL_SECTIONS.BUNDLED) bundledCount++;
    if (row.getAttribute(LABEL_SECTION_ATTR) !== section) {
      row.setAttribute(LABEL_SECTION_ATTR, section);
    }
  });
  list.classList.toggle('has-bundled-labels', bundledCount > 0);
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
      if (row) {
        return row.classList.contains('inbox-reborn-category')
          ? LABEL_SECTIONS.BUNDLED
          : row.getAttribute(LABEL_SECTION_ATTR);
      }
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
      if (!row || row.classList.contains('inbox-reborn-category')) return;
      // The label's ⋮ menu and the nested-labels arrow keep Gmail's behavior
      if (e.target.closest('.nL, .TH')) return;
      const label = getLabelRowName(row);
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

  // Fix icon
  const icon = doneTO.querySelector('.qj');
  if (icon) {
    icon.style.backgroundImage =
      "url('chrome-extension://__MSG_@@extension_id__/images/ic_done_clr_24dp_r4_2x.png')";
  }

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

  // Highlight Done menu when active
  function updateDoneHighlight() {
    const doneMenu = document.querySelector('.TO.inbox-reborn-done');
    if (!doneMenu) return;

    if (getViewHash() === '#archive') {
      doneMenu.classList.add('nZ');
      snoozedTO.classList.remove('nZ');
    } else {
      doneMenu.classList.remove('nZ');
    }
  }

  window.addEventListener('hashchange', updateDoneHighlight);
  updateDoneHighlight();
};

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
  const tryInsert = () => {
    insertRemindersMenuItem();
    if (!document.querySelector(`.wT .${REMINDERS_CLASS}`)) setTimeout(tryInsert, 250);
  };
  tryInsert();
  window.addEventListener('hashchange', insertRemindersMenuItem);
};

// =============================================================================
// ROW HOVER ACTIONS
// =============================================================================

const ROW_MORE_CLASS = 'inbox-reborn-more';

/**
 * Opens Gmail's right-click menu for an email row, at the given point
 * @param {Element} row - The email row (tr.zA)
 * @param {number} x - Client x to open the menu at
 * @param {number} y - Client y to open the menu at
 */
const openRowContextMenu = (row, x, y) => {
  row.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2,
      buttons: 2,
      clientX: x,
      clientY: y,
    }),
  );
};

/**
 * Adds a More (⋮) button to a row's hover actions, after Done, that opens
 * the same menu as right-clicking the email. Gmail builds the hover actions
 * when a row is first hovered, so this runs on hover.
 * @param {Element} row - The email row (tr.zA)
 */
const addRowMoreButton = (row) => {
  const actions = row.querySelector('ul.bqY');
  if (!actions || actions.querySelector(`.${ROW_MORE_CLASS}`)) return;

  const more = createEl('li', `bqX ${ROW_MORE_CLASS}`, {
    role: 'button',
    'aria-label': 'More',
    'data-tooltip': 'More',
  });

  // Keep the row from opening the email (Gmail acts on mousedown and click)
  ['mousedown', 'mouseup', 'dblclick'].forEach((type) =>
    more.addEventListener(type, (e) => e.stopPropagation()),
  );
  more.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = more.getBoundingClientRect();
    openRowContextMenu(row, rect.left + rect.width / 2, rect.bottom);
  });

  actions.append(more);
};

/**
 * Puts the pin one step in front of the row's first hover action, so the
 * row reads Pin, Snooze, Trash, Done, More. Measured rather than fixed
 * because some views (Trash, Spam) show other actions. The pin cell is
 * placed from the row's right edge (style.css "PIN ICON STYLING").
 * @param {Element} row - The hovered email row (tr.zA)
 */
const positionRowPin = (row) => {
  const actions = [...row.querySelectorAll('ul.bqY > li')].filter(
    (li) => li.getClientRects().length,
  );
  if (!actions.length) return;
  const firstLeft = Math.min(...actions.map((li) => li.getBoundingClientRect().left));
  // One 40px step left of the first action's center (it's 20px wide); the
  // pin's icon sits 22px in from the right of its cell
  const right = `${Math.round(row.getBoundingClientRect().right - firstLeft + 8)}px`;
  if (row.style.getPropertyValue('--inbox-reborn-pin-right') !== right) {
    row.style.setProperty('--inbox-reborn-pin-right', right);
  }
};

/**
 * Clears hover actions Gmail left showing. Opening Snooze from a row marks
 * the row (buL) and the button (bz5) so the actions stay up while the picker
 * is open, but dismissing the picker by clicking elsewhere never clears
 * them - the row kept its actions, with Snooze pressed, until a reload.
 * Only runs while no Gmail menu is open, so an open picker keeps its row.
 */
const clearStaleRowActions = () => {
  const stale = document.querySelectorAll('tr.zA.buL, tr.zA li.bqX.bz5');
  if (!stale.length) return;
  const menuOpen = [...document.querySelectorAll('[role=menu]')].some(
    (menu) => menu.getClientRects().length,
  );
  if (menuOpen) return;
  stale.forEach((el) => el.classList.remove('buL', 'bz5'));
};

/**
 * Adds the More button to each email row as it's hovered, and moves its pin
 * in front of the hover actions
 */
const watchRowHoverActions = () => {
  document.addEventListener('mouseover', (e) => {
    clearStaleRowActions();
    const row = e.target.closest?.('tr.zA');
    if (!row || row.classList.contains(CSS_CLASSES.BUNDLE_WRAPPER)) return;
    addRowMoreButton(row);
    // Gmail may only build the hover actions in response to this hover
    requestAnimationFrame(() => {
      addRowMoreButton(row);
      positionRowPin(row);
    });
  });
};

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
    if (elStyle) {
      el.setAttribute(
        'style',
        elStyle.replace(/(background-color:.*(?<!important));/g, '$1 !important;'),
      );
    }
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

// =============================================================================
// RECENT CONTACTS (SPEED DIAL)
// =============================================================================

/* Inbox's speed dial: hovering the compose button shows the last people you
   wrote to above the reminder button. Gmail exposes no recent-recipients
   list, so the extension keeps its own in local storage - recorded at Send,
   re-synced from Gmail's Sent search on each page load (src/gmail-categories.js
   runs it), and from the Sent list whenever that list is on screen. */
const RECENT_CONTACTS_KEY = 'recentContacts';
const MAX_RECENT_CONTACTS = 3;

/**
 * Merges recipients into the stored recent contacts, newest first
 * @param {Object[]} recipients - {email, name, photo} objects, newest first
 * @param {boolean} replace - Treat recipients as the complete new order
 *   (from the Sent list) instead of adding them in front of the stored ones
 */
const rememberRecentContacts = (recipients, replace = false) => {
  rememberContactPhotos(recipients.map(({ email, photo }) => [email, photo]));

  const myEmail = getMyEmailAddress()?.toLowerCase();
  const fresh = recipients.filter(({ email }) => email && email.toLowerCase() !== myEmail);
  if (!fresh.length) return;

  chrome.storage.local.get(RECENT_CONTACTS_KEY, (result) => {
    const stored = result[RECENT_CONTACTS_KEY] || [];
    const merged = [];

    for (const contact of replace ? fresh : [...fresh, ...stored]) {
      const email = contact.email.toLowerCase();
      if (merged.some((c) => c.email === email)) continue;
      // Keep a photo or name learned earlier (Sent rows carry neither photo)
      const known = stored.find((c) => c.email === email);
      merged.push({
        email,
        name: contact.name || known?.name || email,
        photo: contact.photo || known?.photo || '',
      });
      if (merged.length === MAX_RECENT_CONTACTS) break;
    }

    if (JSON.stringify(merged) !== JSON.stringify(stored)) {
      chrome.storage.local.set({ [RECENT_CONTACTS_KEY]: merged });
    }
  });
};

/**
 * Reads the recipients of a compose window (new message or inline reply)
 * @param {Element} compose - The compose root
 * @returns {Object[]} {email, name, photo} for each recipient chip
 */
/* A recipient chip in the To/Cc/Bcc fields: the address is in
   data-hovercard-id, the display name in data-name */
const RECIPIENT_CHIP = '[role=option][data-hovercard-id*="@"]';

const getComposeRecipients = (compose) =>
  Array.from(compose.querySelectorAll(RECIPIENT_CHIP)).map((chip) => {
    const photo = chip.querySelector('img')?.src || '';
    return {
      email: chip.getAttribute('data-hovercard-id'),
      name: chip.getAttribute('data-name') || chip.innerText.split('\n')[0].trim(),
      photo: photo.startsWith('https://') ? photo : '',
    };
  });

/**
 * Finds the compose window an element belongs to
 * @param {Element} el - An element inside a compose window
 * @returns {Element|null} The nearest ancestor holding a recipient chip -
 *   not just any listbox: the toolbar's font picker is one too, and stopping
 *   there found no recipients
 */
const findComposeRoot = (el) => {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (node.querySelector(RECIPIENT_CHIP)) return node;
  }
  return null;
};

/**
 * Records recipients whenever a message is sent - by the Send button or
 * Cmd/Ctrl+Enter. Capture phase, so the compose is read before Gmail closes it.
 */
const watchSentMessages = () => {
  const record = (el) => {
    const compose = findComposeRoot(el);
    if (compose) rememberRecentContacts(getComposeRecipients(compose));
  };

  document.addEventListener(
    'mousedown',
    (e) => {
      const sendButton = e.target.closest?.('.T-I.aoO');
      if (sendButton) record(sendButton);
    },
    true,
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      if (e.target.isContentEditable || e.target.matches?.('input, textarea')) record(e.target);
    },
    true,
  );
};

let sentListSynced = false;

/**
 * Re-syncs recent contacts from the Sent list's top rows (most recent
 * first), so a fresh install starts with the right people. Runs once per
 * visit to Sent, as soon as its rows are on screen.
 */
const syncRecentContactsFromSent = () => {
  if (getViewHash() !== '#sent') {
    sentListSynced = false;
    return;
  }
  if (sentListSynced) return;

  // Sent rows lead their participant column with a bare "To: " text node
  // (inbox rows start with a span) - this keeps the inbox rows still on
  // screen right after the hash changes from being read as recipients
  const rows = Array.from(select.emails()).filter(
    (row) =>
      row.getClientRects().length &&
      row.querySelector('.yW')?.firstChild?.nodeType === Node.TEXT_NODE,
  );
  if (!rows.length) return;
  sentListSynced = true;
  const recipients = rows.flatMap((row) =>
    Array.from(select.emailParticipants(row)).map((span) => ({
      email: span.getAttribute('email'),
      name: span.getAttribute('name'),
    })),
  );

  rememberRecentContacts(recipients, true);
};

/**
 * Builds one avatar button of the speed dial
 * @param {Object} contact - {email, name, photo}
 * @returns {Element} The avatar button
 */
const buildRecentContact = (contact) => {
  const button = document.createElement('div');
  button.className = 'recent-contact';
  button.setAttribute('role', 'button');
  // Shown instantly by CSS beside the avatar (a title tooltip waits ~1s)
  const label =
    contact.name === contact.email ? contact.email : `${contact.name}\n${contact.email}`;
  button.dataset.label = label;
  button.setAttribute('aria-label', label.replace('\n', ', '));

  const showPicture = ({ url, source }) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.dataset.source = source;
    button.replaceChildren(img);
    button.style.backgroundColor = '';
  };

  if (contact.photo) {
    showPicture({ url: contact.photo, source: 'photo' });
  } else {
    // Same letter + color scheme as the thread list avatars, until the same
    // picture lookup the list uses finds something better
    const letter = (contact.name || contact.email)[0].toUpperCase();
    const code = letter.charCodeAt(0);
    button.textContent = letter;
    button.style.backgroundColor =
      code >= 65 && code <= 90 ? '#' + NAME_COLORS[code - 65] : '#616161';
    // Picture lookups follow the Avatars option, like the thread list
    optionsLoaded
      .then(() => options.showAvatar === 'enabled' && resolveAvatar(contact.email))
      .then((avatar) => avatar && showPicture(avatar))
      .catch(() => {
        // Keep the letter
      });
  }

  button.addEventListener('click', () => openCompose({ to: contact.email }));
  return button;
};

/**
 * Adds the recent-contacts speed dial, shown while the pointer is over the
 * compose button, the reminder button, or the contacts themselves
 */
const addRecentContacts = () => {
  if (document.querySelector('.recent-contacts')) return;

  const container = document.createElement('div');
  container.className = 'recent-contacts';
  document.body.appendChild(container);

  const render = (contacts = []) => container.replaceChildren(...contacts.map(buildRecentContact));

  chrome.storage.local.get(RECENT_CONTACTS_KEY, (result) => render(result[RECENT_CONTACTS_KEY]));
  // Ask the page script for the newest Sent recipients (answered below the
  // category bundles' message listener)
  window.postMessage({ source: CATEGORIES_MESSAGE_SOURCE, type: 'wantSent' }, location.origin);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[RECENT_CONTACTS_KEY]) {
      render(changes[RECENT_CONTACTS_KEY].newValue);
    }
  });

  // A short grace period lets the pointer cross the gaps between buttons
  let closeTimer;
  const open = () => {
    clearTimeout(closeTimer);
    addClassToBody('speed-dial-open');
  };
  const close = () => {
    closeTimer = setTimeout(() => removeClassFromBody('speed-dial-open'), 300);
  };

  [container, document.querySelector('.floating-compose'), document.querySelector('.add-reminder')]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener('mouseenter', open);
      el.addEventListener('mouseleave', close);
    });
};

/**
 * Moves floating buttons to the left to accommodate side panel
 */
const moveFloatersLeft = () => {
  const reminderButton = document.querySelector('.add-reminder');
  const composeButton = document.querySelector('.floating-compose');
  const recentContacts = document.querySelector('.recent-contacts');

  if (reminderButton) reminderButton.classList.add('moved');
  if (composeButton) composeButton.classList.add('moved');
  if (recentContacts) recentContacts.classList.add('moved');
};

/**
 * Moves floating buttons back to the right
 */
const moveFloatersRight = () => {
  const reminderButton = document.querySelector('.add-reminder');
  const composeButton = document.querySelector('.floating-compose');
  const recentContacts = document.querySelector('.recent-contacts');

  if (reminderButton) reminderButton.classList.remove('moved');
  if (composeButton) composeButton.classList.remove('moved');
  if (recentContacts) recentContacts.classList.remove('moved');
};

/* Gmail is actively restructuring the right side panel (mid-2026); every hook
   here is a fallback chain: stable landmark/role anchors first, the pre-2026
   build-hashed classes second. Open/closed state is derived from measured
   width instead of the .br3 class, which only exists on the old markup. */
const SIDE_PANEL_SELECTORS = [
  'div[role="complementary"][aria-label="Side panel"]',
  'div[aria-label="Side panel"]',
];
const ADDONS_FRAME_SELECTORS = ['.buW', 'div.aUx'];

// The collapsed rail is ~56px; an open panel is ~300px+. The add-ons content
// frame (.buW) is 0 when closed, so one threshold covers both anchors.
const isSidePanelOpen = (el) => el.getBoundingClientRect().width > 100;

/**
 * Handles side panel interactions
 */
const sidePanelHandler = () => {
  const sidePanel = queryFirst(...SIDE_PANEL_SELECTORS);
  if (!sidePanel) return;

  // Calendar/Keep/Tasks buttons; exclude the "+" get-add-ons button. Old
  // markup exposes them via build-hashed classes, new markup via roles.
  let sidePanelBtns = sidePanel.querySelectorAll('.bse-bvF-I.aT5-aOt-I:not(#qJTzr)');
  if (!sidePanelBtns.length) {
    sidePanelBtns = sidePanel.querySelectorAll(
      '[role="tab"]:not([aria-label^="Get "]), [role="button"]:not([aria-label^="Get "])',
    );
  }
  const addOnsFrame = queryFirst(...ADDONS_FRAME_SELECTORS);

  // Add click handlers to side panel buttons
  for (let b = 0; b < sidePanelBtns.length; b++) {
    sidePanelBtns[b].addEventListener('click', function () {
      moveFloatersLeft();
      sidePanelMutationHandler();
    });
  }

  // Check if add-on panel is open at page load
  if (addOnsFrame) {
    if (isSidePanelOpen(addOnsFrame)) {
      moveFloatersLeft();
    } else {
      moveFloatersRight();
    }
    sidePanelMutationHandler();
  }
};

/**
 * Sets up an observer for side panel size changes
 */
const sidePanelMutationHandler = () => {
  waitForElement(ADDONS_FRAME_SELECTORS.join(', '), () => {
    const addOnsPanel = queryFirst(...ADDONS_FRAME_SELECTORS);
    if (!addOnsPanel) return;

    const panelResized = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 100) {
          moveFloatersLeft();
        } else {
          moveFloatersRight();
        }
      }
    });

    panelResized.observe(addOnsPanel);
  });
};

/**
 * Fetch brand logo - tries BIMI first, then favicon as fallback
 * @param {string} domain - Domain name
 * @returns {Promise<string|null>} Logo URL or null if failed
 */
const fetchBrandLogo = async (domain) => {
  // Check cache first
  if (avatarCache.has(domain)) {
    return avatarCache.get(domain);
  }

  // Skip known problematic domains
  if (SKIP_DOMAINS.has(domain) || SKIP_DOMAINS.has(getMainDomain(domain))) {
    return null;
  }

  // Use the exact domain from the email (don't strip subdomains)
  const emailDomain = domain;

  // Try BIMI/VMC logo from DNS TXT records - highest quality
  try {
    // Query DNS for BIMI TXT record using default selector
    const bimiSelector = 'default._bimi';
    const bimiRecord = `${bimiSelector}.${emailDomain}`;

    // Use multiple DNS-over-HTTPS services for better compatibility
    const dnsServices = [
      `https://dns.google/resolve?name=${bimiRecord}&type=TXT`,
      `https://cloudflare-dns.com/dns-query?name=${bimiRecord}&type=TXT`,
      `https://doh.pub/dns-query?name=${bimiRecord}&type=TXT`,
    ];

    // Try each DNS service until one works
    for (const dnsUrl of dnsServices) {
      try {
        const response = await fetch(dnsUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/dns-json',
            'User-Agent': navigator.userAgent,
          },
        });

        if (response.ok) {
          const dnsData = await response.json();
          if (dnsData.Answer && dnsData.Answer.length > 0) {
            // Parse the BIMI TXT record
            const txtRecord = dnsData.Answer[0].data.replace(/"/g, '');

            // Parse for logo URL (l= parameter)
            const logoMatch = txtRecord.match(/l=([^\s;]+)/);
            if (logoMatch) {
              const logoUrl = logoMatch[1];

              // Test if the logo loads
              const result = await testImageUrl(logoUrl);
              if (result) {
                avatarCache.set(domain, result);
                return result;
              }
            }
          }
          break; // Found working service, exit loop
        }
      } catch {
        // Try next service
        continue;
      }
    }
  } catch {
    // Silently handle errors
  }

  // No BIMI logo available - fall back to letter avatar
  return null;
};

/**
 * Creates a web avatar element (photo, brand logo, or site icon)
 * @param {Object} avatar - {url, source} from resolveAvatar
 * @param {string} name - Name for alt text
 * @returns {Element} Avatar element
 */
const createWebAvatar = ({ url, source }, name) => {
  const avatarElement = document.createElement('img');
  avatarElement.className = `${CSS_CLASSES.AVATAR} ${CSS_CLASSES.WEB_AVATAR}`;
  avatarElement.dataset.source = source;
  avatarElement.src = url;
  avatarElement.alt = name;
  avatarElement.title = name;
  avatarElement.style.objectFit = 'cover';
  return avatarElement;
};

/**
 * Replaces a letter (or earlier web) avatar with a web avatar
 * @param {Element} targetElement - The avatar wrapper element
 * @param {Object} avatar - {url, source} from resolveAvatar
 * @param {string} name - Name for alt text
 */
const replaceAvatarWithWeb = (targetElement, avatar, name) => {
  // Remove existing avatar
  const existingAvatar = targetElement.querySelector(`.${CSS_CLASSES.AVATAR}`);
  if (existingAvatar) {
    existingAvatar.remove();
  }

  // Create and add web avatar
  const webAvatar = createWebAvatar(avatar, name);
  targetElement.appendChild(webAvatar);
};

// =============================================================================
// AVATAR PICTURES
// =============================================================================

/* Each sender gets the first picture found, in this order:
   1. a profile photo Gmail has already shown (open conversations, compose
      chips) - stored locally, nothing extra leaves the browser
   2. the brand's BIMI logo
   3. Gravatar, when the user opts in (sends a hash of the address)
   4. the company site's icon, for non-webmail domains
   and keep the colored letter otherwise. */

/**
 * Webmail providers - addresses here belong to people, so no company logo
 * or site icon applies
 */
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'fastmail.com',
  'hey.com',
  'comcast.net',
  'att.net',
  'verizon.net',
]);

const CONTACT_PHOTOS_KEY = 'contactPhotos';
const MAX_CONTACT_PHOTOS = 2000;

/** email -> profile photo URL, mirrored from local storage */
const contactPhotos = new Map();

/** email -> Promise of {url, source} or null, so each sender is looked up once */
const avatarLookups = new Map();

/* Lookup results are remembered across page loads, so a reload paints
   pictures straight away instead of repeating every network check */
const AVATAR_CACHE_KEY = 'avatarCache';
const MAX_CACHED_AVATARS = 2000;
const AVATAR_FOUND_TTL = 14 * 24 * 60 * 60 * 1000;
const AVATAR_MISSING_TTL = 3 * 24 * 60 * 60 * 1000;

/** email -> {url, source, at} (url null when nothing was found) */
const cachedAvatars = new Map();
const pendingAvatarCacheWrites = new Map();
let avatarCacheFlushTimer;

/* Few senders at a time - a full inbox firing every lookup at once queues
   in the browser long enough for checks to time out */
const MAX_PARALLEL_AVATAR_LOOKUPS = 6;
const IMAGE_CHECK_TIMEOUT_MS = 6000;
let activeAvatarLookups = 0;
const queuedAvatarLookups = [];

/**
 * Checks for a real Google profile photo - Gmail's generated letter
 * circles live under /cm/ and are skipped
 * @param {string} url - Image URL
 * @returns {boolean} True for a profile photo
 */
const isProfilePhotoUrl = (url) => /^https:\/\/lh\d\.googleusercontent\.com\/a-?\//.test(url || '');

/**
 * Stores profile photos for later avatars, newest last (oldest are dropped
 * past MAX_CONTACT_PHOTOS)
 * @param {Array<[string, string]>} entries - [email, photo URL] pairs
 */
const rememberContactPhotos = (entries) => {
  const fresh = entries
    .map(([email, url]) => [email?.toLowerCase(), url])
    .filter(([email, url]) => email && isProfilePhotoUrl(url) && contactPhotos.get(email) !== url);
  if (!fresh.length) return;

  fresh.forEach(([email, url]) => contactPhotos.set(email, url));
  chrome.storage.local.get(CONTACT_PHOTOS_KEY, (result) => {
    const stored = result[CONTACT_PHOTOS_KEY] || {};
    fresh.forEach(([email, url]) => {
      delete stored[email]; // re-insert so it counts as newest
      stored[email] = url;
    });
    const emails = Object.keys(stored);
    emails.slice(0, Math.max(0, emails.length - MAX_CONTACT_PHOTOS)).forEach((email) => {
      delete stored[email];
    });
    chrome.storage.local.set({ [CONTACT_PHOTOS_KEY]: stored });
  });
};

/**
 * Syncs sender pictures in open conversations - Gmail tags each one with
 * the sender's address in data-hovercard-id. Real profile photos are saved
 * for the list avatars; Gmail's generated letter circles (/cm/) are swapped
 * for the picture the list shows, when there is one.
 */
const syncConversationAvatars = () => {
  const senderImages = Array.from(document.querySelectorAll('img.ajn[data-hovercard-id]'));
  rememberContactPhotos(
    senderImages.map((img) => [img.getAttribute('data-hovercard-id'), img.src]),
  );

  if (options.showAvatar !== 'enabled') return;
  senderImages
    .filter((img) => img.src.includes('googleusercontent.com/cm/') && !img.dataset.avatarSource)
    .forEach((img) => {
      img.dataset.avatarSource = 'pending';
      resolveAvatar(img.getAttribute('data-hovercard-id').toLowerCase()).then((avatar) => {
        if (!avatar) return;
        img.src = avatar.url;
        img.dataset.avatarSource = avatar.source;
      });
    });
};

/**
 * Loads stored photos, and upgrades on-screen avatars whenever a photo is
 * learned (in this tab or another)
 */
const watchContactPhotos = () => {
  avatarStoresLoaded = new Promise((resolve) =>
    chrome.storage.local.get([CONTACT_PHOTOS_KEY, AVATAR_CACHE_KEY], (result) => {
      Object.entries(result[CONTACT_PHOTOS_KEY] || {}).forEach(([email, url]) =>
        contactPhotos.set(email, url),
      );
      Object.entries(result[AVATAR_CACHE_KEY] || {}).forEach(([email, entry]) =>
        cachedAvatars.set(email, entry),
      );
      resolve();
    }),
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[CONTACT_PHOTOS_KEY]) return;
    const oldPhotos = changes[CONTACT_PHOTOS_KEY].oldValue || {};
    Object.entries(changes[CONTACT_PHOTOS_KEY].newValue || {}).forEach(([email, url]) => {
      contactPhotos.set(email, url);
      if (oldPhotos[email] === url) return;

      avatarLookups.delete(email);
      document.querySelectorAll(`[data-avatar-email="${CSS.escape(email)}"]`).forEach((wrapper) => {
        const name =
          wrapper.closest('.zA')?.querySelector('.yW [name]')?.getAttribute('name') || '';
        replaceAvatarWithWeb(wrapper, { url, source: 'photo' }, name);
      });
    });
  });
};

/**
 * SHA-256 hex digest, as Gravatar expects
 * @param {string} text - Text to hash
 * @returns {Promise<string>} Hex digest
 */
const sha256Hex = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Looks up a Gravatar - d=404 makes addresses without one fail to load
 * @param {string} email - Lowercased address
 * @returns {Promise<string|null>} Image URL or null
 */
const fetchGravatar = async (email) =>
  testImageUrl(
    `https://gravatar.com/avatar/${await sha256Hex(email.trim())}?s=80&d=404`,
    0,
    IMAGE_CHECK_TIMEOUT_MS,
  );

/**
 * Looks up a site's icon. Unknown sites get a 16px placeholder, which the
 * 32px minimum rejects along with icons too small to fill an avatar.
 * @param {string} domain - Site domain
 * @returns {Promise<string|null>} Icon URL or null
 */
const fetchSiteIcon = (domain) =>
  testImageUrl(
    `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`,
    32,
    IMAGE_CHECK_TIMEOUT_MS,
  );

/** Resolves once saved photos and cached lookups are loaded from storage */
let avatarStoresLoaded = Promise.resolve();

/**
 * Runs a lookup once a slot is free (at most MAX_PARALLEL_AVATAR_LOOKUPS)
 * @param {Function} task - Returns a promise
 * @returns {Promise} The task's result
 */
const runAvatarLookup = (task) =>
  new Promise((resolve, reject) => {
    const run = () => {
      activeAvatarLookups++;
      task()
        .then(resolve, reject)
        .finally(() => {
          activeAvatarLookups--;
          queuedAvatarLookups.shift()?.();
        });
    };
    if (activeAvatarLookups < MAX_PARALLEL_AVATAR_LOOKUPS) run();
    else queuedAvatarLookups.push(run);
  });

/**
 * Remembers a lookup result; writes are batched into one storage update
 * @param {string} email - Lowercased address
 * @param {Object|null} avatar - {url, source} or null for nothing found
 * @param {boolean} withGravatar - Whether Gravatar was part of the check
 */
const cacheAvatar = (email, avatar, withGravatar) => {
  const entry = {
    url: avatar?.url || null,
    source: avatar?.source || null,
    withGravatar,
    at: Date.now(),
  };
  cachedAvatars.set(email, entry);
  pendingAvatarCacheWrites.set(email, entry);

  clearTimeout(avatarCacheFlushTimer);
  avatarCacheFlushTimer = setTimeout(() => {
    const writes = new Map(pendingAvatarCacheWrites);
    pendingAvatarCacheWrites.clear();
    chrome.storage.local.get(AVATAR_CACHE_KEY, (result) => {
      const stored = result[AVATAR_CACHE_KEY] || {};
      writes.forEach((value, key) => {
        delete stored[key]; // re-insert so it counts as newest
        stored[key] = value;
      });
      const keys = Object.keys(stored);
      keys.slice(0, Math.max(0, keys.length - MAX_CACHED_AVATARS)).forEach((key) => {
        delete stored[key];
      });
      chrome.storage.local.set({ [AVATAR_CACHE_KEY]: stored });
    });
  }, 1000);
};

/**
 * Returns a remembered lookup result that is still fresh
 * @param {string} email - Lowercased address
 * @returns {Object|null|undefined} {url, source}, null for "nothing found",
 *   or undefined when it has to be looked up
 */
const getCachedAvatar = (email) => {
  const entry = cachedAvatars.get(email);
  if (!entry) return undefined;
  // A remembered Gravatar only counts while the option is on
  if (entry.source === 'gravatar' && options.gravatar !== 'enabled') return undefined;
  // "Nothing found" was decided without Gravatar - recheck once it is on
  if (!entry.url && options.gravatar === 'enabled' && !entry.withGravatar) return undefined;
  const ttl = entry.url ? AVATAR_FOUND_TTL : AVATAR_MISSING_TTL;
  if (Date.now() - entry.at > ttl) return undefined;
  return entry.url ? { url: entry.url, source: entry.source } : null;
};

/**
 * Checks every network source for a sender at once and picks the best hit
 * in priority order (see the order above)
 * @param {string} email - Lowercased address
 * @returns {Promise<Object|null>} {url, source} or null for the letter avatar
 */
const lookupAvatarOnline = async (email) => {
  const domain = extractDomain(email);
  const isCompany =
    domain && !PERSONAL_EMAIL_DOMAINS.has(domain) && !SKIP_DOMAINS.has(getMainDomain(domain));
  const withGravatar = options.gravatar === 'enabled';

  const [logo, gravatar, icon] = await Promise.all([
    isCompany ? fetchBrandLogo(domain) : null,
    withGravatar ? fetchGravatar(email) : null,
    isCompany ? fetchSiteIcon(getMainDomain(domain)) : null,
  ]);

  const avatar =
    (logo && { url: logo, source: 'logo' }) ||
    (gravatar && { url: gravatar, source: 'gravatar' }) ||
    (icon && { url: icon, source: 'icon' }) ||
    null;

  // A timed-out check proves nothing, so only remember definite answers
  const timedOut = gravatar === undefined || icon === undefined;
  if (avatar || !timedOut) cacheAvatar(email, avatar, withGravatar);
  return avatar;
};

/**
 * Finds the picture for a sender: a saved photo, then a remembered result,
 * then the network (queued). Waits for storage and options first - the
 * speed dial asks before either has loaded. One lookup per sender per page
 * load.
 * @param {string} email - Lowercased address
 * @returns {Promise<Object|null>} {url, source} or null
 */
const resolveAvatar = (email) => {
  if (!avatarLookups.has(email)) {
    avatarLookups.set(
      email,
      Promise.all([avatarStoresLoaded, optionsLoaded]).then(() => {
        if (contactPhotos.has(email)) return { url: contactPhotos.get(email), source: 'photo' };
        const cached = getCachedAvatar(email);
        if (cached !== undefined) return cached;
        return runAvatarLookup(() => lookupAvatarOnline(email));
      }),
    );
  }
  return avatarLookups.get(email);
};

/**
 * Sets a custom favicon
 */
const setFavicon = () => {
  const faviconLink = document.querySelector('link[rel*="shortcut icon"]');
  if (faviconLink) {
    faviconLink.href = chrome.runtime.getURL('images/favicon.png');
  }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Main initialization function
 */
const init = () => {
  setFavicon();
  setupMenuNodes();
  watchRemindersMenuItem();
  watchRowHoverActions();
  watchBundleMenu();
};

// Initialize if document.head is available, otherwise wait for DOMContentLoaded
if (document.head) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

// =============================================================================
// SELECTOR HEALTH CHECK
// =============================================================================

/* Every entry is a Gmail hook a feature depends on. When Gmail ships a DOM
   change, the failing hooks are named in the console instead of features
   silently disappearing. `onlyIf` gates checks that only apply in a given
   state (e.g. a non-empty inbox). Checks needing an open conversation or
   compose window live in docs/selector-health-check.js instead. */
const HEALTH_CHECKS = [
  { feature: 'thread list scoping (bundling, reminders, avatars)', selector: '.oy8Mbf[role=main]' },
  { feature: 'thread rows inside scoped main pane', selector: '.oy8Mbf .zA', onlyIf: 'tr.zA' },
  {
    feature: 'bundling inbox gate (also 0 on non-English UI)',
    selector: '.nZ[data-tooltip=Inbox]',
  },
  { feature: 'sidebar menu container (Done item, menu reorder)', selector: '.wT .byl' },
  { feature: 'Snoozed nav row (Done item is cloned from it)', selector: '.aHS-bu1' },
  { feature: 'sidebar icon wrappers (replaced icons)', selector: '.TO .qj' },
  { feature: 'header title carrier (header colors/titles)', selector: '.w-asV.bbg.aiw' },
  {
    feature: 'header Gmail link (retitling)',
    selector: 'header[role="banner"] a[aria-label="Gmail"], a[aria-label="Gmail"]',
  },
  {
    feature: 'account button (user email discovery, reminders)',
    selector: 'a[aria-label^="Google Account:"]',
  },
  {
    feature: 'compose button (floating compose, add reminder)',
    selector: '.Yh.akV, .T-I.T-I-KE.L3, [gh="cm"]',
  },
  { feature: 'label list region (label color fixes)', selector: '.aAw.FgKVne ~ .yJ, .aeN .yJ' },
  {
    feature: 'side panel (floating button repositioning)',
    selector: 'div[role="complementary"][aria-label="Side panel"], div[aria-label="Side panel"]',
  },
];

/**
 * Verifies the Gmail hooks the extension depends on and reports failures to
 * the console. Runs automatically after load; call manually from the DevTools
 * console (with the extension's context selected) via inboxRebornHealthCheck()
 */
const runSelectorHealthCheck = () => {
  // Gmail not loaded (login page, standalone compose, etc.) - nothing to check
  if (!document.querySelector('div[role="main"]')) return;

  const failures = HEALTH_CHECKS.filter(
    (check) =>
      (!check.onlyIf || document.querySelector(check.onlyIf)) &&
      !document.querySelector(check.selector),
  );

  for (const check of failures) {
    console.warn(
      `[Inbox Reborn] Selector health: "${check.selector}" matches nothing - ${check.feature} is likely broken. Gmail probably changed its DOM.`,
    );
  }

  const gmailLinkCount = document.querySelectorAll('a[aria-label="Gmail"]').length;
  if (gmailLinkCount !== 2) {
    console.warn(
      `[Inbox Reborn] Selector health: expected 2 a[aria-label="Gmail"] links, found ${gmailLinkCount} - header retitling may target the wrong element.`,
    );
  }

  if (failures.length === 0 && gmailLinkCount === 2) {
    console.info(`[Inbox Reborn] Selector health: all ${HEALTH_CHECKS.length} checks passed.`);
  } else {
    console.info(
      `[Inbox Reborn] Selector health: ${failures.length}/${HEALTH_CHECKS.length} checks failed. Full checklist incl. compose/reading-pane hooks: docs/selector-health-check.js in the repo.`,
    );
  }

  return failures;
};
window.inboxRebornHealthCheck = runSelectorHealthCheck;

// =============================================================================
// EVENT LISTENERS
// =============================================================================

// Listen for hash changes to update header
window.addEventListener('hashchange', handleHashChange);

// Set up main event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  // Add reminder button
  addReminderButton();

  // Initialize header and compose button
  waitForElement('a[aria-label="Gmail"]', handleHashChange);
  waitForElement('header[role="banner"] .bGJ, header[role="banner"] .zo', addPinnedToggle);
  waitForElement('a[aria-label="Gmail"]', () => {
    addFloatingComposeButton();
    addRecentContacts();
  });
  watchSentMessages();
  watchCategoryDrops();

  // Inbox's "Bundled in the inbox" / "Unbundled" label sections, and
  // dragging labels between them
  loadBundledLabels();
  watchLabelList();
  watchLabelSectionDrags();
  setInterval(layoutLabelSections, 500);

  // Set up label color observer (.FgKVne is Wiz build-hashed; .aeN .yJ is the
  // same label region anchored on the stable nav container)
  waitForElement('.aAw.FgKVne ~ .yJ, .aeN .yJ', watchLabelColorChanges);

  // Set up periodic email updates
  setInterval(updateReminders, 250);
  setInterval(syncRecentContactsFromSent, 1000);

  // Learn sender photos from open conversations for the inbox avatars, and
  // give open conversations the inbox avatars in place of letter circles
  watchContactPhotos();
  setInterval(syncConversationAvatars, 1000);

  // Keep sidebar icons painted on Gmail's new SVG markup (sidebar rerenders
  // when labels expand/collapse, so this must re-run; no-op when normalized)
  setInterval(normalizeSidebarIcons, 500);
  setInterval(tagSidebarLabelIcons, 500);

  // Set up side panel handler - wait for any recognizable side-panel button
  // (old build-hashed markup or the new role-based markup)
  waitForElement(
    [
      'div[aria-label="Side panel"] .bse-bvF-I.aT5-aOt-I[aria-label^="Get "]',
      'div[role="complementary"][aria-label="Side panel"] [role="tab"]',
      'div[role="complementary"][aria-label="Side panel"] [role="button"]',
    ].join(', '),
    sidePanelHandler,
  );

  // Report selector health once Gmail has settled, so a Gmail DOM change
  // shows up as a console warning instead of a silently missing feature
  setTimeout(runSelectorHealthCheck, 15000);
});
