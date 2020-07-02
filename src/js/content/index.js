import leftNav from './leftNav';
import navigation from './navigation';
import emails from './emails';

function initInboxReborn() {
  emails.observeEmails();
  navigation.init();
  leftNav.init();
}

if (document.head) {
  initInboxReborn();
} else {
  document.addEventListener('DOMContentLoaded', initInboxReborn);
}
