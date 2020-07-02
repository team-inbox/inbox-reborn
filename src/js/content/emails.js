import Email from './email';
import Bundle from './bundle';
import { getTabs, isInInbox, observeForElement } from './utils';
import dateLabels from './dateLabels';
import { getOptions, reloadOptions } from './options';

export default {
  async observeEmails() {
    const mainContainer = await observeForElement(document, '.AO');
    const observer = new MutationObserver(() => {
      reloadOptions();
      observer.disconnect();
      this.processEmails();
      observer.observe(mainContainer, { subtree: true, childList: true });
    });
    observer.observe(mainContainer, { subtree: true, childList: true });
  },
  processEmails() {
    const emailElements = document.querySelectorAll('.BltHke[role=main] .zA:not(.bundle-wrapper)');
    const isInInboxFlag = isInInbox();
    const tabs = getTabs();
    const options = getOptions();

    const currentTab = tabs.length && document.querySelector('.aAy[aria-selected="true"]');
    const labelStats = {};

    // Start from last email on page and head towards first
    for (let i = emailElements.length - 1; i >= 0; i--) {
      const emailElement = emailElements[i];
      const email = new Email(emailElement);

      const emailLabels = email.getLabelTitles();

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
      if (emailLabels.length && !email.isUnbundled()) {
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
          labelStats[label].emailEl = email.emailEl;
          labelStats[label].date = email.getRawDate();
          labelStats[label].dateDisplay = email.getDateDisplay();
          if (email.isUnread()) {
            labelStats[label].containsUnread = true;
          }
        });
      }
    }

    // Update bundle stats
    if (isInInboxFlag && options.emailBundling === 'enabled') {
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
    return Array.from(document.querySelectorAll('.BltHke[role=main] .bundle-wrapper')).reduce((bundledLabels, el) => {
      bundledLabels[el.getAttribute('bundleLabel')] = el;
      return bundledLabels;
    }, {});
  }
};
