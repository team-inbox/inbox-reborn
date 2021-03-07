import { CLASSES, SELECTORS } from './constants';
import emailPreview from './emailPreview';
import {
  addClass,
  checkImportantMarkers,
  encodeBundleId,
  getCurrentBundle,
  htmlToElements,
  isInBundle,
  observeForRemoval,
  openBundle,
  openInbox,
  removeClass,
  hasClass
} from './utils';

const { BUNDLE_WRAPPER_CLASS } = CLASSES;
const { EMAIL_CONTAINER } = SELECTORS;

export default class Bundle {
  constructor(bundleName, stats) {
    this.bundleName = bundleName;
    this.stats = stats;
    this.element = document.querySelector(`${EMAIL_CONTAINER}[role=main] .${BUNDLE_WRAPPER_CLASS}[data-bundle-id="${bundleName}"]`);
    if (stats.count === 0 && this.element) {
      this.element.remove();
    } else if (!this.element) {
      this.element = this.buildBundleWrapper();
    }
  }

  buildBundleWrapper() {
    const importantMarkerClass = checkImportantMarkers() ? '' : 'hide-important-markers';
    const { email, emailEl } = this.stats;
    const labels = this.stats.email.getLabels();
    const label = labels.find(lab => lab.title === this.bundleName);
    const encodedBundleId = encodeBundleId(this.bundleName);
    const { dateLabel, dateDisplay, rawDate } = email.dateInfo;

    const bundleWrapper = htmlToElements(`
        <div class="zA yO ${BUNDLE_WRAPPER_CLASS}" data-bundle-id="${this.bundleName}"
            data-inbox=${encodedBundleId} data-date-label="${dateLabel}" data-show-emails="false">
          <div class="PF xY"></div>
          <div class="apU xY"></div>
          <div class="WA xY ${importantMarkerClass}"></div>
          <div class="yX xY label-link .yW" style="color: ${label.backgroundColor}">${this.bundleName}</div>
          <div class="xY a4W">
            <div class="xS">
              <div class="xT">
                <span class="y2 bundle-senders"/>
              </div>
            </div>
          </div>
          <div class="xW xY">
            <span title="${rawDate}">${dateDisplay}</span>
          </div>
          <div class="bq4 xY">
            <ul class="bqY" role="toolbar">
              <li class="bqX show-emails" data-tooltip="Show Inbox Emails"></li>
            </ul>
          </div>
        </div>
    `);

    bundleWrapper.onclick = e => this.handleBundleClick(e);

    if (emailEl && emailEl.parentNode) {
      emailEl.parentElement.insertBefore(bundleWrapper, emailEl);
    }
    return bundleWrapper;
  }

  async handleBundleClick(e) {
    const bundleId = encodeBundleId(this.bundleName);
    if (hasClass(e.target, 'show-emails')) {
      const bundleRow = e.currentTarget;
      const currentlyShowing = bundleRow.getAttribute('data-show-emails') === 'true';
      if (currentlyShowing) {
        document.querySelectorAll(`[data-inbox="show-bundled"][data-${bundleId}]`).forEach(emailRow => {
          emailRow.setAttribute('data-inbox', 'bundled');
        });
      } else {
        document.querySelectorAll(`[data-inbox="bundled"][data-${bundleId}]`).forEach(emailRow => {
          emailRow.setAttribute('data-inbox', 'show-bundled');
        });
      }
      bundleRow.setAttribute('data-show-emails', !currentlyShowing);
    } else {
      const currentBundleId = getCurrentBundle(); // will be null when in inbox
      const isInBundleFlag = isInBundle();
      const clickedClosedBundle = bundleId !== currentBundleId;

      emailPreview.hidePreview();
      if (isInBundleFlag) {
        openInbox(); // opening the inbox closes the open bundle
      }
      if (clickedClosedBundle) {
        if (isInBundleFlag) {
          await observeForRemoval(document, '[data-pane="bundle"]');
        }
        openBundle(bundleId);
      }
    }
  }

  updateStats() {
    if (this.stats.count === 0) {
      return;
    }
    this.addCount();
    this.addSenders();
    this.checkUnread();
  }

  addCount() {
    const replacementHTML = `<span>${this.bundleName}</span><span class="bundle-count">(${this.stats.count})</span>`;
    this.replaceHtml('.label-link', replacementHTML);
  }

  addSenders() {
    const uniqueSenders = this.stats.senders.reverse().filter((sender, index, self) => {
      if (self.findIndex(s => s.name === sender.name && s.isUnread === sender.isUnread) === index) {
        if (!sender.isUnread && self.findIndex(s => s.name === sender.name && s.isUnread) >= 0) {
          return false;
        }
        return true;
      }
      return false;
    });

    const replacementHTML = `${uniqueSenders.map(sender => `<span class="${sender.isUnread ? 'strong' : ''}">${sender.name}</span>`).join(', ')}`;
    this.replaceHtml('.bundle-senders', replacementHTML);
  }

  checkUnread() {
    if (this.stats.containsUnread) {
      addClass(this.element, 'zE');
      removeClass(this.element, 'yO');
    } else {
      addClass(this.element, 'yO');
      removeClass(this.element, 'zE');
    }
  }

  replaceHtml(selector, html) {
    const el = this.element.querySelector(selector);
    if (el && el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }
}
