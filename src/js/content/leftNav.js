import { addClass, queryParentSelector, removeClass } from './utils';
import inbox from './inbox';

export default {
  loadedMenu: false,
  menuItems: [
    { label: 'inbox', selector: '.aHS-bnt' },
    { label: 'snoozed', selector: '.aHS-bu1' },
    { label: 'archive', selector: '.aHS-aHO' },
    { label: 'drafts', selector: '.aHS-bnq' },
    { label: 'sent', selector: '.aHS-bnu' },
    { label: 'spam', selector: '.aHS-bnv' },
    { label: 'trash', selector: '.aHS-bnx' },
    { label: 'starred', selector: '.aHS-bnw' },
    { label: 'important', selector: '.aHS-bns' },
    { label: 'chats', selector: '.aHS-aHP' }
  ],
  init() {
    const observer = new MutationObserver(() => {
      const parent = document.querySelector('.wT .byl');
      const refer = document.querySelector('.wT .byl > .TK');
      const moreMenu = document.querySelector('.J-Ke.n4.ah9');

      const menuItemsLoaded = this.menuItems.every(item => {
        item.node = this.findMenuItem(item.selector);
        return !!item.node;
      });

      if (parent && refer && this.loadedMenu && menuItemsLoaded) {
        // Gmail will execute its script to add element to the first child, so
        // add one placeholder for it and do the rest in the next child.
        const placeholder = document.createElement('div');
        addClass(placeholder, 'TK');
        addClass(placeholder, 'google-menu-placeholder');
        placeholder.style.cssText = 'padding: 0; border: 0;';
        parent.insertBefore(placeholder, refer);

        const inboxEl = this.menuItems.find(item => item.label === 'inbox').node;
        const snoozed = this.menuItems.find(item => item.label === 'snoozed').node;
        const done = this.menuItems.find(item => item.label === 'archive').node;

        done.firstChild.removeAttribute('id'); // removing the ID disconnects gmail event
        done.addEventListener('click', () => window.location.assign('#archive')); // Manually add on-click event to done elment
        done.querySelector('a').innerText = 'Done'; // default text is All Mail
        const doneItem = done.querySelector('div');
        addClass(doneItem, 'done-item');
        if (window.location.hash === '#archive') {
          addClass(doneItem, 'nZ');
        }

        const newNode = document.createElement('div');
        addClass(newNode, 'TK');
        addClass(newNode, 'main-menu');
        newNode.appendChild(inboxEl);
        newNode.appendChild(snoozed);
        newNode.appendChild(done);
        parent.insertBefore(newNode, refer);

        const chatContainer = document.querySelector('div[aria-label="Hangouts"][role="complementary"]');
        const leftHandChat = chatContainer && queryParentSelector(chatContainer, '.aeN');
        addClass(document.body, leftHandChat ? 'left-hand-chat' : 'right-hand-chat');
        moreMenu.click();
        this.setupClickEventForNodes();
        this.observeLabelNav();
        observer.disconnect();
      }

      if (!this.loadedMenu && moreMenu) {
        moreMenu.click(); // done menu item is hiding in the more menu
        this.loadedMenu = true;
      }
    });
    observer.observe(document.body, { subtree: true, childList: true });
  },
  observeLabelNav() {
    this.applyLabelColors();
    const observer = new MutationObserver(() => {
      this.applyLabelColors();
      this.setupClickEventForNodes();
    });
    const leftNavContainer = document.querySelector('.ajl.aib .wT');
    observer.observe(leftNavContainer, { subtree: true, childList: true });
  },
  applyLabelColors() {
    document.querySelectorAll('.qj').forEach(labelIcon => {
      if (labelIcon.style.borderColor) {
        const color = labelIcon.style.borderColor;
        const text = labelIcon.parentNode.querySelector('a');
        text.style.color = color;
        labelIcon.style.filter = `drop-shadow(0 0 0 ${color}) saturate(300%)`;
        labelIcon.style.borderWidth = 0;
      }
    });
  },
  setupClickEventForNodes() {
    const leftNavItems = document.querySelectorAll('.TN');
    leftNavItems.forEach(item => item.addEventListener('click', this.activateMenuItem));
  },
  activateMenuItem(event) {
    inbox.restoreBundle();
    document.querySelectorAll('.nZ').forEach(el => removeClass(el, 'nZ'));
    addClass(event.currentTarget.parentNode, 'nZ');
  },
  findMenuItem(itemSelector) {
    return queryParentSelector(document.querySelector(itemSelector), '.aim');
  }
};
