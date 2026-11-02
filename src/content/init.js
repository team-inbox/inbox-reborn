// Start-up: the DOMContentLoaded setup, the periodic passes, and the selector health check
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

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
  document.addEventListener('DOMContentLoaded', () => {
    if (instanceActive()) init();
  });
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
  // The document was rewritten and a newer copy of the script owns it
  if (!instanceActive()) return;
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
  loadLabelSections();
  watchLabelList();
  watchLabelSectionDrags();
  every(layoutLabelSections, 500);

  // Set up label color observer (.FgKVne is Wiz build-hashed; .aeN .yJ is the
  // same label region anchored on the stable nav container)
  waitForElement('.aAw.FgKVne ~ .yJ, .aeN .yJ', watchLabelColorChanges);

  // The options, once; the pass below applies them as soon as they arrive
  loadOptions();

  // Set up periodic email updates
  every(updateReminders, 250);
  every(syncRecentContactsFromSent, 1000);

  // Learn sender photos from open conversations for the inbox avatars, and
  // give open conversations the inbox avatars in place of letter circles
  watchContactPhotos();
  every(syncConversationAvatars, 1000);

  // Keep sidebar icons painted on Gmail's new SVG markup (sidebar rerenders
  // when labels expand/collapse, so this must re-run; no-op when normalized)
  every(normalizeSidebarIcons, 500);
  every(tagSidebarLabelIcons, 500);
  every(tagSidebarNav, 500);

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
