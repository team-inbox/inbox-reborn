import {
  addClass,
  addPixels,
  removeClass,
  observeForElement
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
  movePreviewPane(selectedEmail, previewPane) {
    // this creates a space for the preview and uses absolute positioning to make it look like it's under the current email
    let previewPlaceholder = document.querySelector('.preview-placeholder');
    if (!previewPlaceholder) {
      previewPlaceholder = document.createElement('div');
      addClass(previewPlaceholder, 'preview-placeholder');
    }
    const selectedTop = selectedEmail.offsetTop;
    selectedEmail.parentNode.insertBefore(previewPlaceholder, selectedEmail.nextSibling);
    previewPane.style.position = 'absolute';
    previewPane.style.top = addPixels(selectedTop, selectedEmail.clientHeight);
  },
  showPreviewPane(previewPane) {
    this.movePreviewPane(this.currentEmail, previewPane);
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    addClass(previewPane, 'show-preview');
    this.previewShowing = true;
    const adjustPreviewHeight = () => {
      const previewHeight = previewPane.offsetHeight;
      previewPlaceholder.style.height = addPixels(previewHeight, 16);
    };
    if (this.observer) {
      this.observer.disconnect();
    }
    this.observer = new MutationObserver(adjustPreviewHeight);
    this.observer.observe(previewPane, { subtree: true, attributes: true });
    adjustPreviewHeight();
  },
  hidePreviewPane(previewPane) {
    if (previewPane) {
      removeClass(previewPane, 'show-preview');
    }
    this.previewShowing = false;
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    if (previewPlaceholder) {
      previewPlaceholder.style.height = 0;
    }
    if (this.observer) {
      this.observer.disconnect();
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
        this.movePreviewPane(selectedEmail, previewPane);
      }

      if (selectedEmailIsBundled || !this.showPreview || !emailPreviewing || !previewMatchesSelected) {
        this.hidePreviewPane(previewPane);
      } else {
        this.showPreviewPane(previewPane);
      }
    }
  }
};
