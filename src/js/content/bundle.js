import { CLASSES, SELECTORS } from './constants';
import emailPreview from './emailPreview';
import {
  addClass,
  checkImportantMarkers,
  getCurrentBundle,
  htmlToElements,
  isInBundle,
  observeForRemoval,
  openBundle,
  openInbox,
  removeClass
} from './utils';

const { BUNDLE_WRAPPER_CLASS, UNREAD_BUNDLE_CLASS } = CLASSES;
const { EMAIL_CONTAINER } = SELECTORS;

export default class Bundle {
  constructor(label, stats) {
    this.label = label;
    this.stats = stats;
    this.element = document.querySelector(`${EMAIL_CONTAINER}[role=main] .${BUNDLE_WRAPPER_CLASS}[bundleLabel="${label}"]`);
    if (stats.count === 0 && this.element) {
      this.element.remove();
    } else if (!this.element) {
      this.element = this.buildBundleWrapper();
    }
  }

  buildBundleWrapper() {
    const importantMarkerClass = checkImportantMarkers() ? '' : 'hide-important-markers';
    const bundleImage = this.getBundleImageForLabel();
    const { email, emailEl } = this.stats;
    const bundleTitleColor = bundleImage.match(/custom-cluster/) && this.getBundleTitleColorForLabel();
    const bundleId = this.fixLabel(this.label);
    const { dateLabel, dateDisplay, rawDate } = email.dateInfo;

    const bundleWrapper = htmlToElements(`
        <div class="zA yO ${BUNDLE_WRAPPER_CLASS}" bundleLabel="${this.label}" data-bundle=${bundleId} data-date-label="${dateLabel}">
          <div class="PF xY"></div>
          <div class="oZ-x3 xY aid bundle-image">
            <img src="${bundleImage}" ${bundleTitleColor ? `style="filter: drop-shadow(0 0 0 ${bundleTitleColor}) saturate(300%)"` : ''}/>
          </div>
          <div class="apU xY"></div>
          <div class="WA xY ${importantMarkerClass}"></div>
          <div class="yX xY label-link .yW" ${bundleTitleColor ? `style="color: ${bundleTitleColor}"` : ''}>${this.label}</div>
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
        </div>
    `);

    bundleWrapper.onclick = async () => {
      const currentBundleId = getCurrentBundle(); // will be null when in inbox
      const isInBundleFlag = isInBundle();
      const clickedClosedBundle = bundleId !== currentBundleId;

      emailPreview.hidePreview();
      if (isInBundleFlag) {
        openInbox(); // opening the inbox closes the open bundle
      }
      if (clickedClosedBundle) {
        if (isInBundleFlag) {
          await observeForRemoval(document, '.nested-bundle');
        }
        openBundle(bundleId);
      }
    };

    if (emailEl && emailEl.parentNode) {
      emailEl.parentElement.insertBefore(bundleWrapper, emailEl);
    }
    return bundleWrapper;
  }

  getBundleImageForLabel() {
    switch (this.label) {
      case 'Promotions':
        return chrome.runtime.getURL('images/ic_offers_24px_clr_r3_2x.png');
      case 'Finance':
        return chrome.runtime.getURL('images/ic_finance_24px_clr_r3_2x.png');
      case 'Purchases':
      case 'Orders':
        return chrome.runtime.getURL('images/ic_purchases_24px_clr_r3_2x.png');
      case 'Trips':
      case 'Travel':
        return chrome.runtime.getURL('images/ic_travel_clr_24dp_r1_2x.png');
      case 'Updates':
        return chrome.runtime.getURL('images/ic_updates_24px_clr_r3_2x.png');
      case 'Forums':
        return chrome.runtime.getURL('images/ic_forums_24px_clr_r3_2x.png');
      case 'Social':
        return chrome.runtime.getURL('images/ic_social_24px_clr_r3_2x.png');
      default:
        return chrome.runtime.getURL('images/ic_custom-cluster_24px_g60_r3_2x.png');
    }
  }

  getBundleTitleColorForLabel() {
    const labels = this.stats.email.getLabels();
    let bundleTitleColor = null;

    labels.forEach(label => {
      if (label.title === this.label) {
        // Ignore default label color, light gray
        if (label.color !== 'rgb(221, 221, 221)') {
          bundleTitleColor = label.color;
        }
      }
    });

    return bundleTitleColor;
  }

  fixLabel() {
    return encodeURIComponent(this.label.replace(/[/\\& ]/g, '-'));
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
    const replacementHTML = `<span>${this.label}</span><span class="bundle-count">(${this.stats.count})</span>`;
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
      addClass(this.element, UNREAD_BUNDLE_CLASS);
    } else {
      removeClass(this.element, UNREAD_BUNDLE_CLASS);
    }
  }

  replaceHtml(selector, html) {
    const el = this.element.querySelector(selector);
    if (el && el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }
}
