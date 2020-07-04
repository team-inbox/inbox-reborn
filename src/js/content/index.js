import leftNav from './leftNav';
import navigation from './navigation';
import inbox from './inbox';

function initInboxReborn() {
  inbox.observeEmails();
  navigation.init();
  leftNav.init();
}

if (document.head) {
  initInboxReborn();
} else {
  document.addEventListener('DOMContentLoaded', initInboxReborn);
}
