import leftNav from './leftNav';
import navigation from './navigation';
import inbox from './inbox';
import { addClass, observeForElement } from './utils';

async function checkForDarkMode() {
  const backgroundEl = await observeForElement(document, '.wl');
  const darkMode = getComputedStyle(backgroundEl).getPropertyValue('background-color') === 'rgb(17, 17, 17)';
  if (darkMode) {
    addClass(document.body, 'dark-mode');
  }
}

function initInboxReborn() {
  checkForDarkMode();
  inbox.observeEmails();
  navigation.init();
  leftNav.init();
}

if (document.head) {
  initInboxReborn();
} else {
  document.addEventListener('DOMContentLoaded', initInboxReborn);
}
