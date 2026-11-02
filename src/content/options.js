// The options: loading them from storage, applying them, and following changes
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

// =============================================================================
// OPTIONS MANAGEMENT
// =============================================================================

// The service worker may still be starting when the page loads
const OPTIONS_LOAD_RETRY_MS = 500;
const OPTIONS_LOAD_TRIES = 20;

/**
 * Asks the service worker for the stored options, once per page load (a
 * change to the options reloads the page - see the storage listener below -
 * and dark mode applies on its own in initDarkMode). Retries while the
 * worker doesn't answer, and gives up quietly if the extension was
 * reloaded under this tab.
 * @param {number} triesLeft - Attempts left
 */
const loadOptions = (triesLeft = OPTIONS_LOAD_TRIES) => {
  if (!extensionAlive()) return;
  const retry = () => {
    if (triesLeft > 0) {
      setTimeout(() => loadOptions(triesLeft - 1), OPTIONS_LOAD_RETRY_MS);
    } else {
      console.warn('[Inbox Reborn] The options could not be loaded - using the defaults.');
    }
  };
  try {
    chrome.runtime.sendMessage({ method: 'getOptions' }, (ops) => {
      if (chrome.runtime.lastError || !ops) {
        retry();
        return;
      }
      applyOptions(ops);
    });
  } catch {
    retry();
  }
};

/**
 * Applies the stored options to the page
 * @param {Object} ops - The options, as background.js answers them
 */
const applyOptions = (ops) => {
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
};

// Reload the page when options change in the popup, so every setting takes
// effect from a clean state. Dark mode is excluded - it applies instantly
// via the initDarkMode storage listener without needing a refresh.
chrome.storage?.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.options || !instanceActive()) return;

  const oldOpts = changes.options.oldValue || {};
  const newOpts = changes.options.newValue || {};
  const changedKeys = Object.keys({ ...oldOpts, ...newOpts }).filter(
    (key) => oldOpts[key] !== newOpts[key],
  );

  if (changedKeys.length && !changedKeys.every((key) => key === 'darkMode')) {
    location.reload();
  }
});
