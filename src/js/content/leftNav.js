export default {
  loadedMenu: false,
  menuItems: [
    { label: 'inbox', selector: '.aHS-bnt' },
    { label: 'snoozed', selector: '.aHS-bu1' },
    { label: 'done', selector: '.aHS-aHO' },
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
        placeholder.classList.add('TK');
        placeholder.classList.add('google-menu-placeholder');
        placeholder.style.cssText = 'padding: 0; border: 0;';
        parent.insertBefore(placeholder, refer);

        const inbox = this.menuItems.find(item => item.label === 'inbox').node;
        const snoozed = this.menuItems.find(item => item.label === 'snoozed').node;
        const done = this.menuItems.find(item => item.label === 'done').node;

        done.firstChild.removeAttribute('id'); // removing the ID disconnects gmail event
        done.addEventListener('click', () => window.location.assign('#archive')); // Manually add on-click event to done elment
        done.querySelector('a').innerText = 'Done'; // default text is All Mail
        done.querySelector('div').classList.add('done-item');

        const newNode = document.createElement('div');
        newNode.classList.add('TK');
        newNode.classList.add('main-menu');
        newNode.appendChild(inbox);
        newNode.appendChild(snoozed);
        newNode.appendChild(done);
        parent.insertBefore(newNode, refer);

        this.setupClickEventForNodes(this.menuItems.map(item => item.node));

        moreMenu.click();
        observer.disconnect();
      }

      if (!this.loadedMenu && moreMenu) {
        moreMenu.click(); // done menu item is hiding in the more menu
        this.loadedMenu = true;
      }
    });
    observer.observe(document.body, { subtree: true, childList: true });
  },
  setupClickEventForNodes(nodes) {
    nodes.map(node => node.addEventListener('click', () => this.activateMenuItem(node, nodes)));
  },
  activateMenuItem(target, nodes) {
    nodes.map(node => node.firstChild.classList.remove('nZ'));
    target.firstChild.classList.add('nZ');
  },
  findMenuItem(itemSelector) {
    return this.queryParentSelector(document.querySelector(itemSelector), '.aim');
  },
  queryParentSelector(el, selector) {
    if (!el) {
      return null;
    }
    let parent = el.parentElement;
    while (!parent.matches(selector)) {
      parent = parent.parentElement;
      if (!parent) {
        return null;
      }
    }
    return parent;
  }

};
