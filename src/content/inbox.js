// The inbox pass: labels, category bundles from the page script, and updateReminders, the loop that lays out every row
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

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
  if (!category || !isCategoryBundled(category)) return chips;
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

/* The page script's messages come over window.postMessage, which any script
   in Gmail's page can also send, so what is taken from them is bounded:
   a search page is 100 threads, and the speed dial keeps 3 people */
const MAX_CATEGORY_THREADS = 500;
const MAX_SENT_RECIPIENTS = 50;

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
const isCategoryBundle = (label) => label in CATEGORY_BUNDLES && isCategoryBundled(label);

/**
 * Tells the page script which category searches to run - none unless
 * bundling and at least one category switch are on. Travel's search also
 * takes in the travel labels (travelSearch), so a Cruise email in the inbox
 * bundles under Travel like the Travel row lists it. Only sends on change:
 * when the options are applied and whenever the left menu changes.
 */
const requestCategoryThreads = () => {
  const categories =
    options.emailBundling === 'enabled'
      ? Object.entries(CATEGORY_BUNDLES)
          .filter(([name]) => isCategoryBundled(name))
          .map(([, key]) => key)
      : [];
  const queries = categories.includes('travel') ? { travel: travelSearch(getTravelLabels()) } : {};
  const key = `${categories.join(',')} ${JSON.stringify(queries)}`;
  if (key === wantedCategoriesKey) return;
  wantedCategoriesKey = key;
  if (!categories.length) categoryThreads = new Map();
  window.postMessage(
    { source: CATEGORIES_MESSAGE_SOURCE, type: 'want', categories, queries },
    location.origin,
  );
};

/**
 * Sends the request again if what it asks for changed (a travel label came
 * or went) - once the options have been applied, so the first request is
 * the options' own
 */
const updateCategoryThreadsRequest = () => {
  if (wantedCategoriesKey !== null) requestCategoryThreads();
};

/**
 * Takes the page script's search results. Rows whose category changed are
 * let go from their old bundle, and the next pass bundles them again.
 * @param {Object} threads - { travel: [ids], purchases: [ids], finance: [ids] }
 */
const applyCategoryThreads = (threads) => {
  const next = new Map();
  Object.entries(CATEGORY_BUNDLES).forEach(([name, key]) => {
    if (!isCategoryBundled(name)) return;
    const ids = Array.isArray(threads?.[key]) ? threads[key].slice(0, MAX_CATEGORY_THREADS) : [];
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
  if (!instanceActive()) return;
  if (e.data.type === 'threads') applyCategoryThreads(e.data.threads);
  // The speed dial's people from Gmail's Sent search, newest first - the
  // same order the Sent list re-sync uses
  if (e.data.type === 'sent' && Array.isArray(e.data.recipients)) {
    const recipients = e.data.recipients
      .slice(0, MAX_SENT_RECIPIENTS)
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

  // With "bundle one" off, only labels on more than one email bundle
  const labelsToBundle = [];
  if (options.emailBundling === 'enabled' && !options.bundleOne) {
    const labelCounts = {};
    emails.forEach((email) =>
      email.labels.forEach((label) => (labelCounts[label] = (labelCounts[label] || 0) + 1)),
    );
    for (const label in labelCounts) {
      if (labelCounts[label] > 1) labelsToBundle.push(label);
    }
  }

  // Process each email
  for (const emailInfo of emails) {
    const emailEl = emailInfo.emailEl;

    // Gmail may have taken the row out since getEmails collected it
    if (!emailEl.isConnected) continue;

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

      // Filter out tab labels and labels left in the left menu's Unbundled
      // section
      let labels = emailInfo.labels.filter((x) => !tabs.includes(x) && isLabelBundled(x));

      // If bundleOne is disabled, only bundle labels with multiple emails
      if (!options.bundleOne) {
        labels = labelsToBundle.length ? labels.filter((x) => labelsToBundle.includes(x)) : [];
      }

      labels = pickBundleLabel(labels);

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
