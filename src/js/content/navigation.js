import {
  addClass,
  getMyEmailAddress,
  isInBundle,
  isTypable,
  observeForElement,
  removeClass
} from './utils';
import { getOptions } from './options';
import { CLASSES } from './constants';

export default {
  init() {
    this.addReminderButton();
    this.updateHeader();
    window.addEventListener('hashchange', this.handleHashChange);
  },
  async updateHeader() {
    if (document.querySelector('link[rel*="icon"]')) {
      document.querySelector('link[rel*="icon"]').href = chrome.runtime.getURL('images/favicon.png');
    }

    await observeForElement(document, 'a[title="Gmail"]:not([aria-label])');
    this.handleHashChange();
  },
  handleHashChange() {
    let { hash } = window.location;
    if (isInBundle()) {
      hash = '#inbox';
      addClass(document.body, CLASSES.BUNDLE_PAGE_CLASS);
    } else {
      removeClass(document.body, CLASSES.BUNDLE_PAGE_CLASS);
      // eslint-disable-next-line prefer-destructuring
      hash = hash.split('/')[0].split('?')[0];
    }
    const headerElement = document.querySelector('header').parentElement.parentElement;
    if (headerElement) {
      headerElement.setAttribute('pageTitle', hash.replace('#', ''));
    }

    const titleNode = document.querySelector('a[title="Gmail"]:not([aria-label])');
    if (titleNode) {
      titleNode.href = hash;
    }
  },
  async addReminderButton() {
    const composeContainer = await observeForElement(document, '.z0');
    const addReminder = document.createElement('div');
    addReminder.className = 'add-reminder';
    addReminder.addEventListener('click', this.openReminder);
    window.addEventListener('keydown', event => {
      const inInput = event.target && isTypable(event.target);

      if (event.code === 'KeyT' && !inInput) {
        this.openReminder();
      }
    });
    composeContainer.appendChild(addReminder);
  },
  async openReminder() {
    const myEmail = getMyEmailAddress();

    // TODO: Replace all of the below with gmail.compose.start_compose() via the Gmail.js lib
    const composeButton = document.querySelector('.T-I.T-I-KE.L3');
    composeButton.click();

    // TODO: Delete waitForElement() function, replace with gmail.observe.on('compose') via the Gmail.js lib
    const to = await observeForElement(document, 'textarea[name=to]');
    const title = document.querySelector('input[name=subjectbox]');
    const body = document.querySelector('div[aria-label="Message Body"]');
    const from = document.querySelector('input[name="from"]');

    from.value = myEmail;
    to.value = myEmail;
    const options = getOptions();
    if (options.reminderTreatment === 'all') {
      to.addEventListener('focus', () => title.focus());
    } else {
      title.value = 'Reminder';
      to.addEventListener('focus', () => body.focus());
    }
  }
};
