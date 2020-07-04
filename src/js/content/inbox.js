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
import { CLASSES } from './constants';
import emailPreview from './emailPreview';

export default {
  async observeEmails() {
    const mainContainer = await observeForElement(document, '.AO');
    const observer = new MutationObserver(() => {
      if (isInInbox()) {
        let inbox = document.querySelector('.BltHke[role=main][data-inbox]');
        if (!inbox) {
          inbox = document.querySelector('.BltHke[role=main]');
          inbox.setAttribute('data-inbox', true);
        }
      }
      reloadOptions();
      observer.disconnect();
      emailPreview.checkPreview();
      this.processEmails();
      this.moveBundleElement();
      observer.observe(mainContainer, { subtree: true, childList: true });
    });
    observer.observe(mainContainer, { subtree: true, childList: true });
  },
  processEmails() {
    const emailElements = document.querySelectorAll(`.BltHke[role=main] .zA:not(.${CLASSES.BUNDLE_WRAPPER_CLASS}):not([data-nested-email])`);
    const isInInboxFlag = isInInbox();
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
    return Array.from(document.querySelectorAll(`.BltHke[role=main] .${CLASSES.BUNDLE_WRAPPER_CLASS}`)).reduce((bundledLabels, el) => {
      bundledLabels[el.getAttribute('bundleLabel')] = el;
      return bundledLabels;
    }, {});
  },
  moveBundleElement() {
    if (isInBundle()) {
      const inboxPane = document.querySelector('.BltHke.nH.oy8Mbf[data-inbox="true"]');
      const bundlePane = document.querySelector('.BltHke.nH.oy8Mbf[role="main"]');

      if (inboxPane && bundlePane && inboxPane !== bundlePane && !bundlePane.getAttribute('data-navigating')) {
        const bundleId = getCurrentBundle();
        if (!inboxPane.querySelector(`.BltHke[data-bundle="${bundleId}"]`)) {
          inboxPane.style.display = '';
          bundlePane.setAttribute('data-bundle', bundleId);
          const bundleRow = inboxPane.querySelector(`.zA.${CLASSES.BUNDLE_WRAPPER_CLASS}[data-bundle="${bundleId}"]`);
          if (bundleRow) {
            bundleRow.parentNode.insertBefore(bundlePane, bundleRow.nextSibling);
            addClass(bundlePane, 'nested-bundle');
          }
        }
      }
    }
  },
  replaceBundle() {
    const inboxPane = document.querySelector('.BltHke.nH.oy8Mbf[data-inbox="true"]');
    const nestedBundle = document.querySelector('.nested-bundle');
    if (inboxPane && nestedBundle) {
      inboxPane.parentNode.appendChild(nestedBundle);
      inboxPane.style.display = 'none';
      removeClass(nestedBundle, '.nested-bundle');
      nestedBundle.setAttribute('data-navigating', true);
    }
  }
};
