import {
  addClass,
  removeClass
} from './utils';

export default {
  currentEmail: null,
  hidePreview() {
    this.previewShowing = false;
  },
  getPreviewPane() {
    const paneSelector = '.BltHke.nH.oy8Mbf[role="main"]';
    const previewSelector = `${paneSelector} .Nu.S3.aZ6`;
    return document.querySelector(previewSelector);
  },
  emailClicked(clickedEmail) {
    const previewPane = this.getPreviewPane();
    const clickedCurrentEmail = clickedEmail && this.currentEmail && this.currentEmail === clickedEmail;
    if (clickedCurrentEmail) {
      if (this.previewShowing) {
        this.hidePreviewPane(previewPane);
      } else {
        this.showPreviewPane(previewPane);
      }
    } else {
      this.showPreview = true;
    }
  },
  movePreviewPane(selectedEmail, previewPane) {
    if (selectedEmail && previewPane) {
      selectedEmail.parentNode.insertBefore(previewPane, selectedEmail.nextSibling);
    }
  },
  showPreviewPane(previewPane) {
    addClass(previewPane, 'show-preview');
    this.showPreview = null;
    this.previewShowing = true;
  },
  hidePreviewPane(previewPane) {
    if (previewPane) {
      removeClass(previewPane, 'show-preview');
    }
    this.previewShowing = false;
  },
  checkPreview() {
    const previewPane = this.getPreviewPane();
    if (this.currentEmail) {
      const email = document.getElementById(this.currentEmail.getAttribute('id'));
      if (!email) {
        this.hidePreviewPane(previewPane);
      }
    }
    const selectedEmail = document.querySelector('.BltHke.nH.oy8Mbf[role="main"] .zA.btb');
    if (selectedEmail && selectedEmail.getAttribute('data-bundled') && this.previewShowing) {
      this.hidePreviewPane(previewPane);
    } else if (this.currentEmail !== selectedEmail) {
      this.currentEmail = selectedEmail;
      this.movePreviewPane(selectedEmail, previewPane);
      if (this.showPreview) {
        this.showPreviewPane(previewPane);
      }
    } else if (!this.previewShowing) {
      this.hidePreviewPane(previewPane);
    }
  }
};
