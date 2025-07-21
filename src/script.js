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

(function logStylesheets() {
    console.log('Available stylesheets:', 
        Array.from(document.styleSheets).map(sheet => sheet.href)
    );
    
    // Check if our specific stylesheet is loaded
    const ourStylesheet = Array.from(document.styleSheets)
        .find(sheet => sheet.href && sheet.href.includes('style.css'));
    
    if (ourStylesheet) {
        console.log('Inbox Reborn stylesheet found!');
    } else {
        console.error('Inbox Reborn stylesheet NOT FOUND. Check manifest and file path.');
    }
})();

// =============================================================================
// DARK MODE SYNCHRONIZATION
// =============================================================================
/**
 * Handles dark mode synchronization with Chrome storage
 * Applies stored settings on page load and listens for changes
 */
(function initDarkMode() {
  // Apply stored dark-mode setting on page load
  chrome.storage?.local.get('options', ({ options }) => {
    if (options && options.darkMode === 'enabled') {
      document.body.classList.add('dark-mode');
    }
  });

  // Listen for changes to options and toggle class dynamically
  chrome.storage?.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.options) {
      const enabled = changes.options.newValue.darkMode === 'enabled';
      document.body.classList.toggle('dark-mode', enabled);
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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday'
];

/**
 * Avatar color palette for user initials
 */
const NAME_COLORS = [
  '1bbc9b', '16a086', 'f1c40f', 'f39c11', '2dcc70', '27ae61',
  'd93939', 'd25400', '3598db', '297fb8', 'e84c3d', 'c1392b',
  '9a59b5', '8d44ad', 'bec3c7', '34495e', '2d3e50', '95a5a4',
  '7e8e8e', 'ec87bf', 'd870ad', 'f69785', '9ba37e', 'b49255',
  'b49255', 'a94136'
];

/**
 * CSS class names used throughout the application
 */
const CSS_CLASSES = {
  REMINDER_EMAIL: 'reminder',
  CALENDAR_EVENT: 'calendar-event',
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
  STYLE_NODE_ID_PREFIX: 'hide-email-',
  PRIORITY_INBOX_OPTION: 'priority-inbox-enabled',
  MATERIAL_ICON: 'material-symbols-sharp'
};

/**
 * Date label constants for grouping emails
 */
const DATE_LABELS = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  THIS_MONTH: 'This month',
  LAST_YEAR: 'Last year'
};

/**
 * Material icon mapping for sidebar items
 */
const MATERIAL_ICONS = {
  '.aHS-bnu': 'send',           // Sent
  '.aHS-bnq': 'drafts',         // Drafts
  '.aHS-aHO': 'stacked_email',  // All Mail 
  '.aHS-bnx': 'delete',         // Trash
  '.aHS-bnv': 'report',         // Spam
  '.aHS-aHP': 'chat',           // Chats
  '.aHS-nd': 'schedule_send',   // Scheduled
  '.aHS-bns': 'label_important', // Important
  '[data-tooltip="Categories"]': 'label',       // Categories
  '[data-tooltip="Social"]': 'group',           // Social
  '[data-tooltip="Updates"]': 'flag',           // Updates
  '[data-tooltip="Forums"]': 'forum',           // Forums
  '[data-tooltip="Promotions"]': 'local_offer'  // Promotions
};

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
  emailAddress:        () => document.querySelector("a[aria-label^='Google Account:']"),
  tabs:                () => document.querySelectorAll('.aKz'),
  bundleWrappers:      () => document.querySelectorAll('.oy8Mbf[role=main] .bundle-wrapper'),
  inbox:               () => document.querySelector('.nZ[data-tooltip=Inbox]'),
  importanceMarkers:   () => document.querySelector('td.WA.xY'),
  emails:              () => document.querySelectorAll('.oy8Mbf .zA'),
  currentTab:          () => document.querySelector('.aAy[aria-selected="true"]'),
  
  // Menu elements
  menu:                () => document.body.querySelector('.J-Ke.n4.ah9'),
  composeButtonNew:    () => document.querySelector('.Yh.akV'),
  composeButtonOld:    () => document.querySelector('.T-I.T-I-KE.L3'),
  composeButton:       () => select.composeButtonOld() || select.composeButtonNew(),
  menuParent:          () => document.querySelector('.wT .byl'),
  menuRefer:           () => document.querySelector('.wT .byl>.TK'),
  
  // Header elements
  titleNode:           () => document.querySelectorAll('a[aria-label="Gmail"]')[1],
  headerElement:       () => document.querySelector('.w-asV.bbg.aiw'),
  
  // Compose elements
  messageBody:         () => document.querySelector('div[aria-label="Message Body"]'),
  messageFrom:         () => document.querySelector('input[name="from"]'),
  messageSubjectBox:   () => document.querySelector('input[name=subjectbox]'),
  
  // Email-specific elements (require email element as parameter)
  emailParticipants:   (email) => email.querySelectorAll('.yW span[email]'),
  emailTitleNode:      (email) => email.querySelector('.y6'),
  eventTitle:          (email) => email.querySelector('.bqe, .bog'),
  emailCalendarEvent:  (email) => email.querySelector('.aKS .aJ6'),
  emailDate:           (email) => email.querySelector('.xW.xY span'),
  emailSubjectWrapper: (email) => email.querySelectorAll('.a4W'),
  emailAction:         (email) => email.querySelector('.aKS'),
  emailLabels:         (email) => email.querySelectorAll('.ar .at'),
  emailLabelEls:       (email) => email.querySelectorAll('.at'),
  emailAllLabels:      (email) => email.querySelectorAll('.ar.as'),
  emailSnoozed:        (email) => email.querySelector('.by1.cL'),
  emailStarred:        (email) => email.querySelector('.T-KT.T-KT-Jp'),
  emailAvatarWrapper:  (email) => email.querySelector('.oZ-x3'),
  emailMiscPart1:      (email) => email.querySelectorAll('.y2'),
  emailMiscPart2:      (email) => email.querySelectorAll('.yP,.zF'),
  emailMiscPart3:      (email) => email.querySelectorAll('.Zt'),
  
  // Label-specific elements (require label element as parameter)
  labelTitle:          (label) => label.querySelector('.at'),
  labelInnerText:      (label) => label.querySelector('.av'),
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Global state variables
 */
let lastEmailCount = 0;
let lastRefresh = new Date();
let loadedMenu = false;
let labelStats = {};
let hiddenEmailIds = [];
let options = {};
let menuNodes = {};
let materialIconsLoaded = false;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Add remove method to Element prototype if not exists
 */
if (!Element.prototype.remove) {
  Element.prototype.remove = function() {
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
  return emailAddressText || "";
};

/**
 * Converts HTML string to DOM elements
 * @param {string} html - HTML string to convert
 * @returns {Element} The first element from the created HTML
 */
const htmlToElements = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
};

/**
 * Triggers a mouse event on a DOM node
 * @param {Element} node - The DOM node to trigger the event on
 * @param {string} event - The event name (e.g., 'click', 'mouseup')
 */
const triggerMouseEvent = (node, event) => {
  if (!node) return;
  const mouseEvent = document.createEvent('MouseEvents');
  mouseEvent.initEvent(event, true, true);
  node.dispatchEvent(mouseEvent);
};

/**
 * Waits for an element to appear in the DOM and calls a callback when found
 * @param {string} selector - CSS selector for the element to wait for
 * @param {Function} callback - Function to call when element is found
 * @param {number} tries - Number of attempts before giving up (default: 100)
 */
const waitForElement = (selector, callback, tries = 100) => {
  const element = document.querySelector(selector);
  if (element) {
    callback(element);
  } else if (tries > 0) {
    setTimeout(() => waitForElement(selector, callback, tries - 1), 100);
  }
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
const fixLabel = label => encodeURIComponent(label.replace(/[\/\\& ]/g, '-'));

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
const isStarred = email => {
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
const isInInbox = () => select.inbox() !== null;

/**
 * Checks if the current view is a bundle
 * @returns {boolean} True if current view is a bundle
 */
const isInBundle = () => document.location.hash.match(/#search\/in%3Ainbox\+label%3A/g) !== null;

/**
 * Checks if importance markers are present in the UI
 * @returns {Element|null} The importance marker element or null
 */
const checkImportantMarkers = () => select.importanceMarkers();

/**
 * Checks if an email has the Unbundled parent label
 * @param {string[]} labels - Array of label names
 * @returns {boolean} True if the email has an Unbundled label
 */
const checkEmailUnbundledLabel = labels => 
  labels.some(label => label.indexOf(CSS_CLASSES.UNBUNDLED_PARENT_LABEL) >= 0);

/**
 * Gets the read status of an email
 * @param {Element} emailEl - The email DOM element
 * @returns {boolean} True if the email is read
 */
const getReadStatus = emailEl => emailEl.className.indexOf('zE') < 0;

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
const getDate = (rawDate) => rawDate ? new Date(rawDate) : undefined;

/**
 * Builds a human-readable date label based on the date
 * @param {Date} date - The date to build a label for
 * @returns {string} A human-readable date label
 */
const buildDateLabel = (date) => {
  if (!date) return undefined;
  
  const now = new Date();
  
  if (now.getFullYear() === date.getFullYear()) {
    if (now.getMonth() === date.getMonth()) {
      if (now.getDate() === date.getDate()) return DATE_LABELS.TODAY;
      if (now.getDate() - 1 === date.getDate()) return DATE_LABELS.YESTERDAY;
      return DATE_LABELS.THIS_MONTH;
    }
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
    if (email.previousSibling.innerText === label) return;
    email.previousSibling.remove();
  }

  // Create new date label
  const timeRow = document.createElement('div');
  timeRow.classList.add('time-row');
  
  const time = document.createElement('div');
  time.className = 'time';
  time.innerText = label;
  
  timeRow.appendChild(time);
  email.parentElement.insertBefore(timeRow, email);
};

/**
 * Cleans up redundant or empty date labels
 */
const cleanupDateLabels = () => {
  document.querySelectorAll('.time-row').forEach(row => {
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
  
  const replacementHTML = `<span>${label}</span><span class="bundle-count">(${count})</span>`;
  if (bundleLabel.innerHTML !== replacementHTML) {
    bundleLabel.innerHTML = replacementHTML;
  }
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
    if (self.findIndex(s => s.name === sender.name && s.isUnread === sender.isUnread) === index) {
      // If this sender appears with unread status elsewhere, skip the read version
      if (!sender.isUnread && self.findIndex(s => s.name === sender.name && s.isUnread) >= 0) {
        return false;
      }
      return true;
    }
    return false;
  });
  
  const replacementHTML = uniqueSenders
    .map(sender => `<span class="${sender.isUnread ? 'strong' : ''}">${sender.name}</span>`)
    .join(', ');
    
  if (bundleSenders.innerHTML !== replacementHTML) {
    bundleSenders.innerHTML = replacementHTML;
  }
};

/**
 * Gets the appropriate bundle image for a label
 * @param {string} label - The bundle label
 * @returns {string} URL to the bundle image
 */
const getBundleImageForLabel = (label) => {
  switch (true) {
    case label === 'Promotions':
      return chrome.runtime.getURL('images/ic_offers_24px_clr_r3_2x.png');
    case !!label.match(/\b(finance|finances|banking|bank|tax|taxes)\b/gi):
      return chrome.runtime.getURL('images/ic_finance_24px_clr_r3_2x.png');
    case ['Orders', 'Purchases'].includes(label):
      return chrome.runtime.getURL('images/ic_purchases_24px_clr_r3_2x.png');
    case !!label.match(/\b(trip|trips|travel)\b/gi):
      return chrome.runtime.getURL('images/ic_travel_clr_24dp_r1_2x.png');
    case label === 'Updates':
      return chrome.runtime.getURL('images/ic_updates_24px_clr_r3_2x.png');
    case label === 'Forums':
      return chrome.runtime.getURL('images/ic_forums_24px_clr_r3_2x.png');
    case label === 'Social':
      return chrome.runtime.getURL('images/ic_social_24px_clr_r3_2x.png');
    default:
      return chrome.runtime.getURL('images/ic_custom-cluster_24px_g60_r3_2x.png');
  }
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
      // Ignore default label color (light gray)
      if (labelColor !== 'rgb(221, 221, 221)') {
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
const getCategoryColor = label => ({
  Updates: 'rgb(255, 104, 57)',
  Promotions: 'rgb(0, 188, 212)',
  Forums: 'rgb(63, 81, 181)',
  Social: 'rgb(219, 68, 55)',
  Travel: 'rgb(156, 39, 176)',
  Trips: 'rgb(156, 39, 176)',
  Finance: 'rgb(103, 159, 56)',
  Orders: 'rgb(121, 85, 72)',
  Purchases: 'rgb(121, 85, 72)',
}[label] || '#616161');

/**
 * Builds a bundle wrapper element for a label
 * @param {Element} email - The email DOM element
 * @param {string} label - The bundle label
 * @param {boolean} hasImportantMarkers - Whether to show importance markers
 */
const buildBundleWrapper = (email, label, hasImportantMarkers) => {
  const importantMarkerClass = hasImportantMarkers ? '' : 'hide-important-markers';
  const bundleImage = getBundleImageForLabel(label);
  const bundleTitleColor = bundleImage.match(/custom-cluster/) && 
                          getBundleTitleColorForLabel(email, label);
  const styleColor = bundleTitleColor || getCategoryColor(label);
  const style = `-webkit-mask: url(${bundleImage}) 0 0/100% 100%; background-color: ${styleColor};`;

  const bundleWrapper = htmlToElements(`
    <div class="zA yO" bundleLabel="${label}">
      <span class="oZ-x3 xY aid bundle-image" style="${style}"></span>
      <span class="WA xY ${importantMarkerClass}"></span>
      <span class="yX xY label-link .yW" ${bundleTitleColor ? `style="color: ${bundleTitleColor}"` : ''}>${label}</span>
      <span class="xW xY">
        <span title="${getRawDate(email)}"/>
      </span>
      <div class="y2 bundle-senders"></div>
    </div>
  `);

  addClassToEmail(bundleWrapper, CSS_CLASSES.BUNDLE_WRAPPER);

  // Add click handler to navigate to the bundle
  bundleWrapper.onclick = () => location.href = `#search/in%3Ainbox+label%3A${fixLabel(label)}`;

  // Insert the bundle wrapper
  if (email && email.parentNode) {
    if (options.bundleTop) {
      const parent = email.parentElement;
      parent.insertBefore(bundleWrapper, parent.firstChild);
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
  // Get options from Chrome storage
  chrome.runtime.sendMessage({ method: 'getOptions' }, function(ops) {
    options = ops;
  });

  // Apply avatar options
  if (options.showAvatar === 'enabled') {
    addClassToBody(CSS_CLASSES.AVATAR_OPTION);
  } else if (options.showAvatar === 'disabled') {
    removeClassFromBody(CSS_CLASSES.AVATAR_OPTION);
    // Remove avatar elements
    document.querySelectorAll('.' + CSS_CLASSES.AVATAR_EMAIL)
      .forEach(avatarEl => avatarEl.classList.remove(CSS_CLASSES.AVATAR_EMAIL));
    document.querySelectorAll('.' + CSS_CLASSES.AVATAR)
      .forEach(avatarEl => avatarEl.remove());
  }

  // Apply priority inbox options
  if (options.priorityInbox === 'enabled') {
    addClassToBody(CSS_CLASSES.PRIORITY_INBOX_OPTION);
  } else if (options.hidePriorityInboxHeadings === 'disabled') {
    removeClassFromBody(CSS_CLASSES.PRIORITY_INBOX_OPTION);
  }

  // Apply email bundling options
  if (options.emailBundling === 'enabled') {
    addClassToBody(CSS_CLASSES.BUNDLING_OPTION);
  } else if (options.emailBundling === 'disabled') {
    removeClassFromBody(CSS_CLASSES.BUNDLING_OPTION);
    // Unbundle emails
    document.querySelectorAll('.' + CSS_CLASSES.BUNDLED_EMAIL)
      .forEach(emailEl => emailEl.classList.remove(CSS_CLASSES.BUNDLED_EMAIL));
    // Remove bundle wrapper rows
    document.querySelectorAll('.' + CSS_CLASSES.BUNDLE_WRAPPER)
      .forEach(bundleEl => bundleEl.remove());
  }
};

// =============================================================================
// EMAIL PROCESSING
// =============================================================================

/**
 * Gets labels from an email
 * @param {Element} email - The email DOM element
 * @returns {string[]} Array of label names
 */
const getLabels = (email) => {
  return Array.from(select.emailLabels(email))
    .map(el => el.attributes.title?.value || '');
};

/**
 * Gets all tabs from the UI
 * @returns {string[]} Array of tab names
 */
const getTabs = () => Array.from(select.tabs()).map(el => el.innerText);

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

  let currentTab = tabs.length && select.currentTab();
  let prevTimeStamp = null;
  labelStats = {};

  // Add or remove bundle page class based on current view
  isInBundleFlag ? 
    addClassToBody(CSS_CLASSES.BUNDLE_PAGE) : 
    removeClassFromBody(CSS_CLASSES.BUNDLE_PAGE);

  // Process emails from last to first (bottom to top in UI)
  for (let i = emails.length - 1; i >= 0; i--) {
    const email = emails[i];
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
      bundleAlreadyProcessed: () => checkEmailClass(email, CSS_CLASSES.BUNDLED_EMAIL) || 
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
    info.labels.forEach(l => allLabels.add(l));
    
    // Check for Unbundled parent label
    info.isUnbundled = checkEmailUnbundledLabel(info.labels);
    
    // Process unbundled emails
    if ((isInInboxFlag || isInBundleFlag) && info.isUnbundled && !info.unbundledAlreadyProcessed()) {
      addClassToEmail(email, CSS_CLASSES.UNBUNDLED_EMAIL);
      
      // Process labels for unbundled emails
      select.emailAllLabels(info.emailEl).forEach(labelEl => {
        if (select.labelTitle(labelEl).title.indexOf(CSS_CLASSES.UNBUNDLED_PARENT_LABEL) >= 0) {
          // Remove 'Unbundled/' from display in the UI
          select.labelInnerText(labelEl).innerText = 
            labelEl.innerText.replace(CSS_CLASSES.UNBUNDLED_PARENT_LABEL + '/', '');
        } else {
          // Hide labels that aren't nested under UNBUNDLED_PARENT_LABEL
          labelEl.hidden = true;
        }
      });
    }

    // Hide tab labels from emails
    if (currentTab) {
      select.emailAllLabels(info.emailEl).forEach(labelEl => {
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
      
      info.labels.forEach(label => {
        if (!(label in labelStats)) {
          labelStats[label] = {
            title: label,
            count: 1,
            senders: [{
              name: firstParticipant,
              isUnread: info.isUnread
            }],
            containsUnread: info.isUnread
          };
        } else {
          labelStats[label].count++;
          labelStats[label].senders.push({
            name: firstParticipant,
            isUnread: info.isUnread
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
    labelStats[label].containsUnread ? 
      addClassToBundle(label, CSS_CLASSES.UNREAD_BUNDLE) : 
      removeClassFromBundle(label, CSS_CLASSES.UNREAD_BUNDLE);
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
  const isInInboxFlag = isInInbox();
  const hasImportantMarkers = checkImportantMarkers();
  const tabs = getTabs();

  // Clean up date labels
  cleanupDateLabels();
  
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
        select.emailMiscPart3(emailEl).forEach(node => node.outerHTML = '');
        select.emailMiscPart1(emailEl).forEach(node => node.style.color = '#202124');
      }
      
      // Set the snippet text to "Reminder"
      select.emailMiscPart2(emailEl).forEach(node => { node.innerHTML = 'Reminder'; });

      // Add avatar for reminders
      const avatarWrapperEl = select.emailAvatarWrapper(emailEl);
      if (avatarWrapperEl && avatarWrapperEl.getElementsByClassName(CSS_CLASSES.AVATAR).length === 0) {
        const avatarElement = document.createElement('div');
        avatarElement.className = CSS_CLASSES.AVATAR;
        avatarWrapperEl.appendChild(avatarElement);
      }
      
      // Mark as processed
      addClassToEmail(emailEl, CSS_CLASSES.REMINDER_EMAIL);
    } 
    // Process avatars for non-reminders
    else if (
      options.showAvatar === 'enabled' && 
      !emailInfo.reminderAlreadyProcessed() && 
      !emailInfo.avatarAlreadyProcessed() && 
      !emailInfo.bundleAlreadyProcessed()
    ) {
      let participants = Array.from(select.emailParticipants(emailEl));
      if (!participants.length) continue; // Skip emails without participants (e.g., drafts)
      
      let firstParticipant = participants[0];

      // Prefer participants other than the current user
      const excludingMe = participants.filter(
        node => node.getAttribute('email') !== myEmail && node.getAttribute('name')
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
          
          // Debug logging
          console.log('Avatar created:', {
            letter: firstLetter,
            baseColor: baseColor,
            isDarkMode: document.body.classList.contains('dark-mode')
          });
        } else {
          avatarElement.style.background = '#000000';
          // Some unicode characters need special handling
          avatarElement.style.color = 'transparent';
          avatarElement.style.textShadow = '0 0 rgba(255, 255, 255, 0.65)';
        }

        avatarElement.innerText = firstLetter;
        targetElement.appendChild(avatarElement);
      }

      // Mark as processed
      addClassToEmail(emailEl, CSS_CLASSES.AVATAR_EMAIL);
    }

    // Process calendar events
    if (emailInfo.isCalendarEvent && !emailInfo.calendarAlreadyProcessed()) {
      addClassToEmail(emailEl, CSS_CLASSES.CALENDAR_EMAIL);
      addEventAttachment(emailEl);
    }

    // Handle date labels
    let label = emailInfo.dateLabel;
    
    // Special handling for snoozed emails
    if (emailInfo.isSnooze) {
      // If this is the first email, assume Today, otherwise use previous label
      label = (lastLabel == null) ? DATE_LABELS.TODAY : lastLabel;
    }

    // Add date label if it's a new label
    if (label !== lastLabel) {
      addDateLabel(emailEl, label);
      lastLabel = label;
    }

    // Handle email bundling
    if (options.emailBundling === 'enabled') {
      // Remove bundles that no longer have associated emails
      if (emailInfo.isBundleWrapper() && !allLabels.has(emailEl.getAttribute('bundleLabel'))) {
        emailEl.remove();
        continue;
      }

      // Determine which labels should be bundled
      let labelsToBundle = [];
      if (!options.bundleOne) {
        // Count emails per label to find labels with multiple emails
        let labelCounts = emails.reduce((counts, email) => {
          email.labels.forEach(label => counts[label] = (counts[label] || 0) + 1);
          return counts;
        }, {});
        
        // Only bundle labels with more than one email
        for (const label in labelCounts) {
          if (labelCounts[label] > 1) {
            labelsToBundle.push(label);
          }
        }
      }

      // Filter out tab labels
      let labels = emailInfo.labels.filter(x => !tabs.includes(x));
      
      // If bundleOne is disabled, only bundle labels with multiple emails
      if (!options.bundleOne) {
        labels = labelsToBundle.length ? 
          labels.filter(x => labelsToBundle.includes(x)) : [];
      }

      // Bundle eligible emails
      if (
        isInInboxFlag && 
        !emailInfo.isStarred && 
        labels.length && 
        !emailInfo.isUnbundled && 
        !emailInfo.bundleAlreadyProcessed()
      ) {
        labels.forEach(label => {
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
      else if (
        !emailInfo.isUnbundled && 
        !labels.length && 
        hiddenEmailIds.includes(emailEl.id)
      ) {
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
    
    // Map menu items to their selectors
    [
      { label: 'inbox',     selector: '.aHS-bnt' },
      { label: 'snoozed',   selector: '.aHS-bu1' },
      { label: 'allmail',   selector: '.aHS-aHO' },
      { label: 'drafts',    selector: '.aHS-bnq' },
      { label: 'sent',      selector: '.aHS-bnu' },
      { label: 'spam',      selector: '.aHS-bnv' },
      { label: 'trash',     selector: '.aHS-bnx' },
      { label: 'starred',   selector: '.aHS-bnw' },
      { label: 'important', selector: '.aHS-bns' },
      { label: 'chats',     selector: '.aHS-aHP' },
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

/**
 * Inserts a "Done" menu item in the sidebar
 */
const insertDoneMenuItem = () => {
  // Prevent duplicate Done menu item
  if (document.querySelector('.TO.inbox-reborn-done')) return;
  
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
    icon.style.backgroundImage = "url('chrome-extension://__MSG_@@extension_id__/images/ic_done_clr_24dp_r4_2x.png')";
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
    link.onclick = function(e) {
      e.preventDefault();
      window.location.hash = '#archive';
    };
    doneTO.appendChild(link);
  }

  // Make the whole row clickable
  doneTO.onclick = function(e) {
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
    
    if (window.location.hash === '#archive') {
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
 * Reorders menu items in the sidebar
 */
const reorderMenuItems = () => {
  const desiredOrder = [
    '.aHS-bnq', // Drafts
    '.aHS-bnu', // Sent
    '.aHS-aHO', // All Mail
    '.aHS-bnx', // Trash
    '.aHS-bnv', // Spam
  ];
  
  const parent = select.menuParent();
  const refer = select.menuRefer();

  function tryReorder() {
    // Find all the menu nodes in the desired order
    const nodes = desiredOrder.map(sel => 
      document.querySelector(sel)?.closest('.TO')
    );
    
    if (nodes.some(n => !n) || !parent || !refer) {
      setTimeout(tryReorder, 250);
      return;
    }
    
    // Remove from current position
    nodes.forEach(node => parent.contains(node) && parent.removeChild(node));
    
    // Insert in the new order before the reference node
    nodes.forEach(node => parent.insertBefore(node, refer));
  }
  
  tryReorder();
};

// =============================================================================
// UI CUSTOMIZATION
// =============================================================================

/**
 * Updates the Gmail top bar header to display the correct page title
 */
const handleHashChange = () => {
  let hash = window.location.hash;
  
  if (isInBundle()) {
    hash = '#inbox';
  } else {
    // Map Gmail category hashes to clean pageTitle values
    if (hash.startsWith('#category/social')) hash = '#social';
    if (hash.startsWith('#category/updates')) hash = '#updates';
    if (hash.startsWith('#category/forums')) hash = '#forums';
    if (hash.startsWith('#category/promotions')) hash = '#promotions';
    if (hash.startsWith('#settings/labels')) hash = '#labels';
    
    // Handle user-created/dynamic labels
    if (hash.startsWith('#label/')) {
      // Get the header element and Gmail link node
      const headerElement = select.headerElement();
      const titleNode = select.titleNode();
      
      // Extract and decode the full label path (e.g., "Software/Chess")
      const raw = hash.slice('#label/'.length);
      const labelName = decodeURIComponent(raw.replace(/\+/g, ' '));
      
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
  titleNode.href = hash;
};

/**
 * Fixes label colors to ensure they're applied with !important
 */
const fixLabelColors = () => {
  [...document.querySelectorAll('.qj.aEe')].forEach(el => {
    let elStyle = el.getAttribute('style');
    if (elStyle) {
      el.setAttribute('style', 
        elStyle.replace(/(background-color:.*(?<!important));/g, '$1 !important;')
      );
    }
  });
};

/**
 * Sets up an observer to watch for label color changes
 */
const watchLabelColorChanges = () => {
  const LABEL_CONTAINER_SELECTOR = ".aAw.FgKVne ~ .yJ";
  const labelBaseNode = document.querySelector(LABEL_CONTAINER_SELECTOR);
  
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
  floatingComposeButton.addEventListener('click', function() {
    const composeButton = select.composeButton();
    composeButton?.click();
  });
  
  document.body.appendChild(floatingComposeButton);
};

/**
 * Adds a reminder button to the UI
 */
const addReminderButton = () => {
  const addReminder = document.createElement('div');
  addReminder.className = 'add-reminder';
  
  addReminder.addEventListener('click', function() {
    const myEmail = getMyEmailAddress();
    const composeButton = select.composeButton();
    composeButton?.click();

    // Wait for compose window to open
    waitForElement('input[peoplekit-id="BbVjBd"]', to => {
      const title = select.messageSubjectBox();
      const body = select.messageBody();
      const from = select.messageFrom();

      if (from) from.value = myEmail;
      if (to) to.value = myEmail;
      if (title) title.value = 'Reminder';
      if (body) body.focus();
    });
  });
  
  document.body.appendChild(addReminder);
};

/**
 * Moves floating buttons to the left to accommodate side panel
 */
const moveFloatersLeft = () => {
  const reminderButton = document.querySelector('.add-reminder');
  const composeButton = document.querySelector('.floating-compose');
  
  if (reminderButton) reminderButton.classList.add('moved');
  if (composeButton) composeButton.classList.add('moved');
};

/**
 * Moves floating buttons back to the right
 */
const moveFloatersRight = () => {
  const reminderButton = document.querySelector('.add-reminder');
  const composeButton = document.querySelector('.floating-compose');
  
  if (reminderButton) reminderButton.classList.remove('moved');
  if (composeButton) composeButton.classList.remove('moved');
};

/**
 * Handles side panel interactions
 */
const sidePanelHandler = () => {
  const sidePanel = document.querySelector('div[aria-label="Side panel"]');
  if (!sidePanel) return;
  
  const sidePanelBtns = sidePanel.querySelectorAll('.bse-bvF-I.aT5-aOt-I:not(#qJTzr)'); // ignore the + btn
  const addOnsFrame = document.querySelector('.buW');

  // Add click handlers to side panel buttons
  for (let b = 0; b < sidePanelBtns.length; b++) {
    sidePanelBtns[b].addEventListener('click', function() {
      moveFloatersLeft();
      sidePanelMutationHandler();
    });
  }

  // Check if add-on panel is open at page load
  if (addOnsFrame) {
    if (!addOnsFrame.classList.contains('br3')) {
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
  waitForElement('.buW', () => {
    const addOnsPanel = document.querySelector('.buW');
    if (!addOnsPanel) return;
    
    const panelResized = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width === 0) {
          moveFloatersRight();
        } else {
          moveFloatersLeft();
        }
      }
    });
    
    panelResized.observe(addOnsPanel);
  });
};

/**
 * Injects Material Icons font for custom icons
 * This improved version preloads the font and ensures it's ready before use
 */
const injectMaterialIconsFont = () => {
  // Check if already loaded
  if (materialIconsLoaded) return;
  
  // Add the font-face definition directly instead of loading from Google Fonts
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Material Symbols Sharp';
      font-style: normal;
      font-weight: 400;
      src: url(https://fonts.gstatic.com/s/materialsymbolssharp/v263/gNNBW2J8Roq16WD5tFNRaeLQk6-SHQ_R00k4c2_whPnoY9ruReYU3rHmz74m0ZkGH-VBYe1x0TV6x4yFH8F-H5OdzEL3sVTgJtfbYxOLojCL.woff2) format('woff2');
      font-display: block;
    }
    
    .${CSS_CLASSES.MATERIAL_ICON} {
      font-family: 'Material Symbols Sharp' !important;
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24 !important;
      font-size: 24px !important;
      display: inline-block !important;
      line-height: 1 !important;
      -webkit-font-smoothing: antialiased !important;
      text-rendering: optimizeLegibility !important;
      color: rgba(0, 0, 0, 0.65) !important; /* lighter fill (black at 65%) */
    }
  `;
  document.head.appendChild(style);
  
  // Create a font loader to detect when the font is ready
  const fontLoader = new FontFace('Material Symbols Sharp', 
    'url(https://fonts.gstatic.com/s/materialsymbolssharp/v263/gNNBW2J8Roq16WD5tFNRaeLQk6-SHQ_R00k4c2_whPnoY9ruReYU3rHmz74m0ZkGH-VBYe1x0TV6x4yFH8F-H5OdzEL3sVTgJtfbYxOLojCL.woff2)');
  
  fontLoader.load().then(() => {
    // Add the font to the document
    document.fonts.add(fontLoader);
    materialIconsLoaded = true;
    // Apply icons once the font is loaded
    replaceAllIcons();
  }).catch(err => {
    console.error('Font loading failed:', err);
    // Try to replace icons anyway
    materialIconsLoaded = true;
    replaceAllIcons();
  });
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

/**
 * Replaces Gmail sidebar icons with Material Symbols, handling system vs. category items appropriately.
 * @param {string} selector - CSS selector for the container
 * @param {string} iconName - Material icon name
 */
const replaceGmailIcon = (selector, iconName) => {
  if (!materialIconsLoaded) return;

  waitForElement(selector, (container) => {
    if (!container) return;

    // Prevent duplicate icons
    const existingIcon = container.querySelector(`.${CSS_CLASSES.MATERIAL_ICON}`);
    if (existingIcon) return;

    // CATEGORY HANDLING (Social, Promotions, etc.)
    const iconContainer = container.querySelector('.qj');
    const gmailDefaultIcon = container.querySelector('.TH.J-J5-Ji');
    const isCategory = !!iconContainer && !!gmailDefaultIcon;

    if (isCategory) {
      gmailDefaultIcon.style.display = 'none';
      iconContainer.innerHTML = '';
      iconContainer.style.background = 'none';
      // Also clear background for .qj
      if (iconContainer.classList.contains('qj')) {
        iconContainer.style.background = 'none';
      }

      const icon = document.createElement('span');
      icon.className = CSS_CLASSES.MATERIAL_ICON;
      icon.textContent = iconName;
      icon.style.display = 'inline-block';
      icon.style.marginLeft = '2px';
      icon.style.marginRight = '0';
      iconContainer.appendChild(icon);
      return;
    }

    // SYSTEM LABEL HANDLING (Sent, Drafts, All Mail, etc.)
    const label = container.querySelector('.aio, .nU a, .nU span');
    if (!label) return;

    const icon = document.createElement('span');
    icon.className = CSS_CLASSES.MATERIAL_ICON;
    icon.textContent = iconName;
    icon.style.position = 'absolute';
    icon.style.left = '26px';
    icon.style.fontSize = '20px';
    icon.style.lineHeight = '1';
    icon.style.marginRight = '0';
    container.insertBefore(icon, label);
  });
};

/**
 * Replaces all Gmail sidebar icons with Material icons
 */
const replaceAllIcons = () => {
  if (!materialIconsLoaded) return; // Wait until font is loaded
  
  // Replace each icon with its Material Design equivalent
  Object.entries(MATERIAL_ICONS).forEach(([selector, iconName]) => {
    replaceGmailIcon(selector, iconName);
  });
};

// Persistent category icon replacement
function replaceCategoryIcons() {
  // Existing category and other icon replacements
  Object.entries(MATERIAL_ICONS).forEach(([selector, iconName]) => {
    // Use querySelectorAll to catch multiple potential matches
    const elements = document.querySelectorAll(selector + ' .qj');
    elements.forEach(el => {
      // Skip if already processed
      if (el.classList.contains('material-icons-replaced')) return;

      // Create Material Icon element
      const iconElement = document.createElement('span');
      iconElement.className = 'material-symbols-sharp';
      iconElement.textContent = iconName;
      
      // Clear existing content and add new icon
      el.innerHTML = '';
      el.appendChild(iconElement);
      el.classList.add('material-icons-replaced');
      el.style.visibility = 'visible';
    });
  });

  // Additional selectors for Firefox-specific cases
  const firefoxSpecificIcons = {
    '.aHS-bnu .qj': 'send',           // Sent
    '.aHS-bnq .qj': 'drafts',         // Drafts
    '.aHS-aHO .qj': 'stacked_email',  // All Mail
    '.aHS-bnx .qj': 'delete',         // Trash
    '.aHS-bnv .qj': 'report'          // Spam
  };

  Object.entries(firefoxSpecificIcons).forEach(([selector, iconName]) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      // Skip if already processed
      if (el.classList.contains('material-icons-replaced')) return;

      // Create Material Icon element
      const iconElement = document.createElement('span');
      iconElement.className = 'material-symbols-sharp';
      iconElement.textContent = iconName;
      
      // Clear existing content and add new icon
      el.innerHTML = '';
      el.appendChild(iconElement);
      el.classList.add('material-icons-replaced');
      el.style.visibility = 'visible';
    });
  });

  // Handle Less/More sections dynamically
  const lessMoreSections = document.querySelectorAll('.byl.aJZ.a0L');
  lessMoreSections.forEach(section => {
    const iconEl = section.querySelector('.qj');
    if (iconEl && !iconEl.classList.contains('material-icons-replaced')) {
      const label = section.getAttribute('data-tooltip');
      let iconName = 'label'; // default icon

      // Map specific labels to icons
      const labelToIconMap = {
        'Important': 'label_important',
        'Chats': 'chat',
        'Scheduled': 'schedule_send'
      };

      iconName = labelToIconMap[label] || iconName;

      // Create Material Icon element
      const iconElement = document.createElement('span');
      iconElement.className = 'material-symbols-sharp';
      iconElement.textContent = iconName;
      
      // Clear existing content and add new icon
      iconEl.innerHTML = '';
      iconEl.appendChild(iconElement);
      iconEl.classList.add('material-icons-replaced');
      iconEl.style.visibility = 'visible';
    }
  });
}

function startCategoryIconObserver() {
  // Create a MutationObserver to watch for changes in the sidebar
  const observer = new MutationObserver((mutations) => {
    let shouldReplace = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' || 
          mutation.type === 'attributes' || 
          mutation.type === 'characterData') {
        shouldReplace = true;
        break;
      }
    }

    // Debounce icon replacement
    if (shouldReplace) {
      // Use a small timeout to allow DOM to stabilize
      setTimeout(replaceCategoryIcons, 50);
    }
  });

  // Try to find the sidebar and observe it
  const sidebar = document.querySelector('.wT');
  if (sidebar) {
    observer.observe(sidebar, {
      childList: true,     // Observe direct children
      subtree: true,       // Observe all descendants
      attributes: true,    // Observe attribute changes
      characterData: true  // Observe text content changes
    });
  }

  // Initial replacement
  replaceCategoryIcons();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initial replacements
  replaceCategoryIcons();
  
  // Periodic replacements
  const iconInterval = setInterval(() => {
    try {
      replaceCategoryIcons();
      
      // Stop if Categories section is no longer in DOM
      const categoriesSection = document.querySelector('[data-tooltip="Categories"]');
      if (!categoriesSection) {
        clearInterval(iconInterval);
      }
    } catch (error) {
      console.error('Icon replacement error:', error);
      clearInterval(iconInterval);
    }
  }, 500);
});

// Replace icons when Categories is clicked
function safeAddEventListener() {
  const categoriesEl = document.querySelector('[data-tooltip="Categories"]');
  if (categoriesEl) {
    categoriesEl.addEventListener('click', () => {
      // Multiple replacement attempts
      setTimeout(replaceCategoryIcons, 10);
      setTimeout(replaceCategoryIcons, 50);
      setTimeout(replaceCategoryIcons, 100);
    });
  } else {
    // Retry if element not found
    setTimeout(safeAddEventListener, 500);
  }
}

// Initial attempt to add event listener
safeAddEventListener();

// Watch for dark mode changes using a safer method
function checkDarkModeChange() {
  try {
    const currentMode = document.body && document.body.classList.contains('dark-mode');
    if (currentMode !== window.lastKnownDarkMode) {
      window.lastKnownDarkMode = currentMode;
      replaceCategoryIcons();
    }
  } catch (error) {
    console.error('Dark mode change check error:', error);
  }
}

// Initialize last known mode with null check
window.lastKnownDarkMode = document.body && document.body.classList.contains('dark-mode');

// Set up periodic check for dark mode changes
setInterval(checkDarkModeChange, 500);

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Main initialization function
 */
const init = () => {
  setFavicon();
  setupMenuNodes();
  reorderMenuItems();
  injectMaterialIconsFont();
};

// Initialize if document.head is available, otherwise wait for DOMContentLoaded
if (document.head) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

// Listen for hash changes to update header
window.addEventListener('hashchange', handleHashChange);

// Set up main event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add reminder button
  addReminderButton();
  
  // Initialize header and compose button
  waitForElement('a[aria-label="Gmail"]', handleHashChange);
  waitForElement('a[aria-label="Gmail"]', addFloatingComposeButton);
  
  // Set up label color observer
  waitForElement(".aAw.FgKVne ~ .yJ", watchLabelColorChanges);
  
  // Set up periodic email updates
  setInterval(updateReminders, 250);
  
  // Set up side panel handler
  waitForElement('div[aria-label="Side panel"] .bse-bvF-I.aT5-aOt-I[aria-label^="Get "]', sidePanelHandler);
});

// Set up observer for sidebar changes to maintain icon replacements
let debounceTimer;
waitForElement('.wT .byl', (sidebar) => {
  const iconObserver = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      replaceAllIcons();
    }, 250); // 250ms debounce
  });
  iconObserver.observe(sidebar, { childList: true, subtree: true });
});