// Reading a row: reminder, calendar, snoozed and starred checks, and the date headings
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

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
  // Gmail may have taken the row out since the pass collected it
  if (!email.parentElement) return;

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
