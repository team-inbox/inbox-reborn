import { CLASSES } from './constants';
import {
  addClass,
  checkImportantMarkers,
  htmlToElements,
  removeClass
} from './utils';

export default class Bundle {
  constructor(label, stats) {
    this.label = label;
    this.stats = stats;
    this.element = document.querySelector(`.BltHke[role=main] .bundle-wrapper[bundleLabel="${label}"]`);
    if (stats.count === 0 && this.element) {
      this.element.remove();
    } else if (!this.element) {
      this.element = this.buildBundleWrapper();
    }
  }

  buildBundleWrapper() {
    const importantMarkerClass = checkImportantMarkers() ? '' : 'hide-important-markers';
    const bundleImage = this.getBundleImageForLabel();
    const { emailEl, date, dateDisplay } = this.stats;
    const bundleTitleColor = bundleImage.match(/custom-cluster/) && this.getBundleTitleColorForLabel();

    const bundleWrapper = htmlToElements(`
        <tr class="zA yO ${CLASSES.BUNDLE_WRAPPER_CLASS}" bundleLabel="${this.label}" data-date-label="${emailEl.getAttribute('data-date-label')}">
          <td class="PF xY"/>
          <td class="oZ-x3 xY aid bundle-image">
            <img src="${bundleImage}" ${bundleTitleColor ? `style="filter: drop-shadow(0 0 0 ${bundleTitleColor}) saturate(300%)"` : ''}/>
          </td>
          <td class="apU xY"></td>
          <td class="WA xY ${importantMarkerClass}"/>
          <td class="yX xY label-link .yW" ${bundleTitleColor ? `style="color: ${bundleTitleColor}"` : ''}>${this.label}</td>
          <td class="xY a4W">
            <div class="xS">
              <div class="xT">
                <span class="y2 bundle-senders"/>
              </div>
            </div>
          </td>
          <td class="xW xY">
            <span title="${date}">${dateDisplay}</span>
          </td>
        </tr>
    `);

    bundleWrapper.onclick = () => {
      window.location.href = `#search/in%3Ainbox+label%3A${this.fixLabel(this.label)}`;
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
    const labelEls = this.stats.emailEl.querySelectorAll('.at');
    let bundleTitleColor = null;

    labelEls.forEach(labelEl => {
      if (labelEl.innerText === this.label) {
        const labelColor = labelEl.style.backgroundColor;
        // Ignore default label color, light gray
        if (labelColor !== 'rgb(221, 221, 221)') {
          bundleTitleColor = labelColor;
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
      addClass(this.element, CLASSES.UNREAD_BUNDLE_CLASS);
    } else {
      removeClass(this.element, CLASSES.UNREAD_BUNDLE_CLASS);
    }
  }

  replaceHtml(selector, html) {
    const el = this.element.querySelector(selector);
    if (el && el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }
}
