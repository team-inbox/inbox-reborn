import {
  addClass,
  addPixels,
  observeForElement,
  removeClass,
  startObserver
} from './utils';
import { SELECTORS } from './constants';

const { EMAIL_CONTAINER, EMAIL_ROW, PREVIEW_PANE } = SELECTORS;

/* Issues
* navigating quickly between two bundles can cause weird things
*/

export default {
  currentEmail: null,
  hidePreview() {
    this.showPreview = false;
  },
  getPreviewPane() {
    const previewSelector = `${EMAIL_CONTAINER}[role="main"] ${PREVIEW_PANE}`;
    return document.querySelector(previewSelector);
  },
  async emailClicked(clickedEmail) {
    const previewPane = this.getPreviewPane();
    const clickedCurrentEmail = clickedEmail && this.currentEmail && this.currentEmail === clickedEmail;
    if (clickedCurrentEmail) {
      if (this.previewShowing) {
        this.showPreview = false;
        this.hidePreviewPane(previewPane);
      } else {
        await observeForElement(previewPane, '.UG');
        this.showPreview = true;
        this.showPreviewPane(previewPane);
      }
    } else {
      // clicking the email changes the selected email automatically
      // set showPreview so that checkPreview will make it visible
      // when it processes the new selected email
      this.showPreview = true;
    }
  },
  movePreviewPane(previewPane) {
    // this creates a space for the preview and uses absolute positioning to make it look like it's under the current email
    let previewPlaceholder = document.querySelector('.preview-placeholder');
    if (!previewPlaceholder) {
      previewPlaceholder = document.createElement('div');
      addClass(previewPlaceholder, 'preview-placeholder');
    }
    this.currentEmail.style.position = 'relative';
    const selectedTop = this.currentEmail.offsetTop;
    this.currentEmail.style.position = '';
    this.currentEmail.parentNode.insertBefore(previewPlaceholder, this.currentEmail.nextSibling);
    previewPane.style.position = 'absolute';
    previewPane.style.top = `${selectedTop}px`;
  },
  showPreviewPane(previewPane) {
    this.movePreviewPane(previewPane);
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    addClass(previewPane, 'show-preview');
    this.previewShowing = true;
    const adjustPreviewHeight = () => {
      const rowHeight = this.currentEmail.clientHeight;
      previewPane.style['padding-top'] = `${rowHeight}px`;
      previewPlaceholder.style.height = addPixels(previewPane.offsetHeight, -rowHeight, 16);
    };
    this.previewObserver = startObserver(this.previewObserver, previewPane, { subtree: true, attributes: true }, adjustPreviewHeight);
    adjustPreviewHeight();

    const checkPreviewPosition = () => {
      this.rowObserver.disconnect();
      this.currentEmail.style.position = 'relative';
      const selectedTop = this.currentEmail.offsetTop;
      this.currentEmail.style.position = '';
      if (previewPane.style.top !== `${selectedTop}px`) {
        previewPane.style.top = `${selectedTop}px`;
      }
      this.rowObserver.observe(this.currentEmail, { attributes: true });
    };
    this.rowObserver = startObserver(this.rowObserver, this.currentEmail, { attributes: true }, checkPreviewPosition);
    if (!this.currentEmail.getAttribute('data-previewing')) {
      this.currentEmail.setAttribute('data-previewing', true);
      previewPane.scrollIntoView({ behavior: 'smooth' });
    }
  },
  hidePreviewPane(previewPane) {
    const previewingEmail = document.querySelector('[data-previewing]');
    if (previewingEmail) {
      previewingEmail.removeAttribute('data-previewing');
    }
    if (previewPane) {
      removeClass(previewPane, 'show-preview');
    }
    this.previewShowing = false;
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    if (previewPlaceholder) {
      previewPlaceholder.style.height = 0;
    }
    if (this.previewObserver) {
      this.previewObserver.disconnect();
    }
    if (this.rowObserver) {
      this.rowObserver.disconnect();
    }
    if (previewPane) {
      previewPane.style['padding-top'] = 0;
    }
  },
  hideIfCurrentEmailRemoved() {
    if (this.currentEmail) {
      const currentEmailEl = document.getElementById(this.currentEmail.getAttribute('id'));
      const previewPane = this.getPreviewPane();
      if (!currentEmailEl) {
        this.currentEmail = null;
        this.hidePreviewPane(previewPane);
      }
    }
  },
  previewMatchesSelected(previewPane, selectedEmail) {
    const previewThread = previewPane.querySelector('[data-thread-perm-id]');
    const selectedThread = selectedEmail.querySelector('[data-thread-id]');
    const previewThreadId = previewThread && previewThread.getAttribute('data-thread-perm-id');
    const selectedThreadId = selectedThread && selectedThread.getAttribute('data-thread-id');
    return `#${previewThreadId}` === selectedThreadId;
  },
  checkPreview() {
    this.hideIfCurrentEmailRemoved();

    const selectedEmail = document.querySelector(`${EMAIL_CONTAINER}[role="main"]  ${EMAIL_ROW}.btb`);
    if (selectedEmail) {
      const previewPane = this.getPreviewPane();
      const selectedEmailIsBundled = selectedEmail && selectedEmail.getAttribute('data-inbox') === 'bundled';
      const currentEmailChanged = this.currentEmail !== selectedEmail;
      const emailPreviewing = previewPane && previewPane.querySelector('.UG');
      const previewMatchesSelected = this.previewMatchesSelected(previewPane, selectedEmail);

      if (currentEmailChanged) {
        this.currentEmail = selectedEmail;
        this.movePreviewPane(previewPane);
      }

      if (selectedEmailIsBundled || !this.showPreview || !emailPreviewing || !previewMatchesSelected) {
        this.hidePreviewPane(previewPane);
      } else {
        this.showPreviewPane(previewPane);
      }
    }
  }
};
