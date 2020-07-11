import Email from './email';
import Bundle from './bundle';
import {
  addClass,
  getTabs,
  getCurrentBundle,
  isInBundle,
  isInInbox,
  observeForElement,
  removeClass
} from './utils';
import dateLabels from './dateLabels';
import { getOptions, reloadOptions } from './options';
import { CLASSES, SELECTORS } from './constants';
import emailPreview from './emailPreview';

const { EMAIL_CONTAINER, EMAIL_ROW, PREVIEW_PANE } = SELECTORS;
const { BUNDLE_WRAPPER_CLASS } = CLASSES;

// document.querySelectorAll('.v1') -- gmail's loading indicator

export default {
  async observeEmails() {
    const mainContainer = await observeForElement(document, '.AO');
    const observer = new MutationObserver(mutations => {
      observer.disconnect();
      mutations.forEach(mutation => {
        mutation.removedNodes.forEach(removed => {
          const removedPreview = removed.querySelector && removed.querySelector(PREVIEW_PANE);
          if (removedPreview) {
            emailPreview.restorePreview(removedPreview);
          }
        });
      });
      if (isInInbox()) {
        let inbox = document.querySelector(`${EMAIL_CONTAINER}[role=main][data-inbox]`);
        if (!inbox) {
          inbox = document.querySelector(`${EMAIL_CONTAINER}[role=main]`);
          inbox.setAttribute('data-inbox', true);
          const previewPane = inbox.querySelector(`${PREVIEW_PANE}:not([data-bundle])`);
          if (previewPane) {
            previewPane.setAttribute('data-inbox', true);
          }
        }
      }
      reloadOptions();
      this.moveBundleElement();
      emailPreview.checkPreview();
      this.processEmails();
      observer.observe(mainContainer, { subtree: true, childList: true });
    });
    observer.observe(mainContainer, { subtree: true, childList: true });
  },
  processEmails() {
    const isInInboxFlag = isInInbox();
    const inboxEmailSelector = isInInboxFlag ? ':not([data-nested-email])' : '';
    const emailElements = document.querySelectorAll(`${EMAIL_CONTAINER}[role=main] ${EMAIL_ROW}:not(.${BUNDLE_WRAPPER_CLASS})${inboxEmailSelector}`);
    const tabs = getTabs();
    const options = getOptions();

    const currentTab = tabs.length && document.querySelector('.aAy[aria-selected="true"]');
    const labelStats = {};

    // Start from last email on page and head towards first
    for (let i = emailElements.length - 1; i >= 0; i--) {
      const emailElement = emailElements[i];
      const email = new Email(emailElement);

      const emailLabels = email.getLabels().map(label => label.title);

      // Check for labels used for Tabs, and hide them from the row.
      if (currentTab) {
        email.emailEl.querySelectorAll('.ar.as').forEach(labelEl => {
          if (labelEl.innerText === currentTab.innerText) {
            // Remove Tabbed labels from the row.
            labelEl.hidden = true;
          }
        });
      }

      // Collect senders, message count and unread stats for each label
      if (emailLabels.length && email.isBundled) {
        const firstParticipant = email.getParticipantNames()[0];
        emailLabels.forEach(label => {
          if (!labelStats[label]) {
            labelStats[label] = {
              title: label,
              count: 1,
              senders: [{
                name: firstParticipant,
                isUnread: email.isUnread()
              }]
            };
          } else {
            labelStats[label].count++;
            labelStats[label].senders.push({
              name: firstParticipant,
              isUnread: email.isUnread()
            });
          }
          labelStats[label].email = email;
          labelStats[label].emailEl = email.emailEl;
          if (email.isUnread()) {
            labelStats[label].containsUnread = true;
          }
        });
      }
    }

    // Update bundle stats
    if (isInInboxFlag && !isInBundle() && options.emailBundling === 'enabled') {
      Object.entries(labelStats).forEach(([label, stats]) => {
        const bundle = new Bundle(label, stats);
        bundle.updateStats();
      });

      const emailBundles = this.getBundledLabels();
      Object.entries(emailBundles).forEach(([label, el]) => {
        if (!labelStats[label]) {
          el.remove();
        }
      });
    }

    dateLabels.addDateLabels();
  },
  getBundledLabels() {
    const bundleRows = Array.from(document.querySelectorAll(`${EMAIL_CONTAINER}[role=main] .${BUNDLE_WRAPPER_CLASS}`));
    return bundleRows.reduce((bundledLabels, el) => {
      bundledLabels[el.getAttribute('bundleLabel')] = el;
      return bundledLabels;
    }, {});
  },
  moveBundleElement() {
    if (isInBundle()) {
      const inboxPane = document.querySelector(`${EMAIL_CONTAINER}[data-inbox="true"]`);
      const bundlePane = document.querySelector(`${EMAIL_CONTAINER}[role="main"]`);

      if (inboxPane && bundlePane && inboxPane !== bundlePane && !bundlePane.getAttribute('data-navigating')) {
        const bundleId = getCurrentBundle();
        if (!inboxPane.querySelector(`${EMAIL_CONTAINER}[data-bundle="${bundleId}"]`)) {
          inboxPane.style.display = '';
          bundlePane.setAttribute('data-bundle', bundleId);
          const previewPane = bundlePane.querySelector(PREVIEW_PANE);
          if (previewPane) {
            previewPane.setAttribute('data-bundle', bundleId);
          }
          const bundleRow = inboxPane.querySelector(`${EMAIL_ROW}.${BUNDLE_WRAPPER_CLASS}[data-bundle="${bundleId}"]`);
          if (bundleRow) {
            bundleRow.parentNode.insertBefore(bundlePane, bundleRow.nextSibling);
            addClass(bundlePane, 'nested-bundle');
          }
        }
      }
    }
  },
  restoreBundle() {
    const inboxPane = document.querySelector(`${EMAIL_CONTAINER}[data-inbox="true"]`);
    const nestedBundle = document.querySelector('.nested-bundle');
    if (inboxPane && nestedBundle) {
      inboxPane.parentNode.appendChild(nestedBundle);
      inboxPane.style.display = 'none';
      removeClass(nestedBundle, '.nested-bundle');
      nestedBundle.setAttribute('data-navigating', true);
    }
  }
};
