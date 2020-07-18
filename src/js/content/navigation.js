import {
  addClass,
  getMyEmailAddress,
  isInBundle,
  isInInbox,
  isTypable,
  observeForElement,
  openInbox,
  removeClass
} from './utils';
import leftNav from './leftNav';
import inbox from './inbox';
import { getOptions, reloadOptions } from './options';
import { CLASSES } from './constants';

export default {
  init() {
    reloadOptions();
    this.updateFloatingButtons();
    this.updateHeader();
    if (!isInInbox()) { // always make sure we start on the main inbox page so we can find the right email container
      openInbox();
    }
    window.addEventListener('hashchange', this.handleHashChange);
  },
  async updateHeader() {
    if (document.querySelector('link[rel*="icon"]')) {
      document.querySelector('link[rel*="icon"]').href = chrome.runtime.getURL('images/favicon.png');
    }

    await observeForElement(document, 'a[title="Gmail"]:not([aria-label])');
    const gSuiteLogo = document.querySelector('.gb_ua.gb_ra.gb_va');
    if (gSuiteLogo) {
      addClass(document.body, 'g-suite');
    }
    this.handleSearchSubmit();
    this.handleHashChange();
  },
  async handleSearchSubmit() {
    const searchInput = await observeForElement(document, 'header form input');
    searchInput.addEventListener('keydown', event => {
      if (event.code === 'Enter') {
        inbox.restoreBundle();
      }
    });
    const searchButton = document.querySelector('.gb_Df');
    searchButton.addEventListener('click', inbox.restoreBundle);
  },
  handleHashChange() {
    let { hash } = window.location;
    // eslint-disable-next-line prefer-destructuring
    hash = hash.split('/')[0].split('?')[0];
    let title = hash.replace('#', '');
    if (isInBundle()) {
      hash = '#inbox';
      title = 'inbox';
      addClass(document.body, CLASSES.BUNDLE_PAGE_CLASS);
    } else {
      removeClass(document.body, CLASSES.BUNDLE_PAGE_CLASS);
      if (!leftNav.menuItems.some(item => `#${item.label}` === hash)) {
        hash = '#inbox';
        title = 'gmail';
      }
    }
    const headerElement = document.querySelector('header') && document.querySelector('header').parentElement.parentElement;
    if (headerElement) {
      headerElement.setAttribute('pageTitle', title);
    }

    const titleNode = document.querySelector('a[title="Gmail"]:not([aria-label])');
    if (titleNode) {
      titleNode.href = hash;
    }
  },
  async updateFloatingButtons() {
    const composeContainer = await observeForElement(document, '.aic');
    const mainContainer = document.querySelector('.bkL');
    mainContainer.appendChild(composeContainer);
    const addReminder = document.createElement('div');
    addReminder.className = 'add-reminder';
    addReminder.addEventListener('click', this.openReminder);
    window.addEventListener('keydown', event => {
      const inInput = event.target && isTypable(event.target);

      if (event.code === 'KeyT' && !inInput) {
        this.openReminder();
      }
    });
    composeContainer.querySelector('.z0').appendChild(addReminder);
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
