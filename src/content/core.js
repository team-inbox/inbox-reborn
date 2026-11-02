// Constants, Gmail selectors, shared state, and the helpers every other file uses
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

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
  CALENDAR_EMAIL: 'calendar-email',
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
 * Whether the extension this script came from is still installed and
 * running. After an update or reload, Chrome keeps the old content script
 * alive in open tabs but every chrome.* call throws "Extension context
 * invalidated" - the timers check this and stop instead of erroring
 * four times a second until the tab is reloaded
 * @returns {boolean} False once the context is gone
 */
const extensionAlive = () => !!chrome.runtime?.id;

/**
 * The periodic timers, so they can all stop together once the extension
 * context is gone
 */
const timers = [];

/**
 * setInterval that stops every timer when the extension context is gone
 * @param {Function} fn - What to run
 * @param {number} ms - How often
 */
const every = (fn, ms) => {
  timers.push(
    setInterval(() => {
      if (!extensionAlive()) {
        timers.forEach(clearInterval);
        timers.length = 0;
        return;
      }
      fn();
    }, ms),
  );
};

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
const fixLabel = (label) => encodeURIComponent(searchLabel(label));

/**
 * A label name as Gmail's search box takes it after "label:": nested
 * labels, spaces and ampersands with dashes ("Software/Chess" -> "Software-Chess")
 * @param {string} label - The label name
 * @returns {string} The search form, not URL-encoded
 */
const searchLabel = (label) => label.replace(/[/\\& ]/g, '-');
