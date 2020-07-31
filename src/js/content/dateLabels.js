import { addClass } from './utils';
import { SELECTORS } from './constants';

const { EMAIL_CONTAINER, EMAIL_ROW } = SELECTORS;

export default {
  addDateLabels() {
    let lastLabel = null;
    this.cleanupDateLabels();
    const emailContainer = document.querySelector(`${EMAIL_CONTAINER}[role=main]`);
    if (emailContainer) {
      const emailElements = emailContainer.querySelectorAll(`${EMAIL_ROW}:not([data-inbox="bundled"])`);
      emailElements.forEach(emailEl => {
        const dateLabel = emailEl.getAttribute('data-date-label');

        // Add date label if it's a new label
        if (dateLabel !== lastLabel) {
          this.addDateLabel(emailEl, dateLabel);
          lastLabel = dateLabel;
        }
      });
    }
  },
  addDateLabel(email, label) {
    if (email.previousSibling && email.previousSibling.className === 'time-row') {
      if (email.previousSibling.innerText === label) {
        return;
      }
      email.previousSibling.remove();
    }
    const timeRow = document.createElement('div');
    addClass(timeRow, 'time-row');

    const time = document.createElement('div');
    time.className = 'time';
    time.innerText = label;
    timeRow.appendChild(time);
    email.parentElement.insertBefore(timeRow, email);
  },
  isEmptyDateLabel(row) {
    let sibling = row.nextSibling;
    if (!sibling) {
      return true;
    }
    if (sibling.classList.contains('bundle-placeholder')) {
      sibling = sibling.nextSibling;
    }
    if (sibling.className === 'time-row') {
      return true;
    }
    if (sibling.getAttribute('data-inbox') !== 'bundled') {
      return false;
    }
    return this.isEmptyDateLabel(sibling);
  },
  cleanupDateLabels() {
    document.querySelectorAll('.time-row').forEach(row => {
      // Delete any back to back date labels
      if (row.nextSibling && row.nextSibling.className === 'time-row') {
        row.remove();
        // Check nextSibling recursively until reaching the next .time-row
        // If all siblings are bundled, then hide row
      } else if (this.isEmptyDateLabel(row)) {
        row.hidden = true;
      }
    });
  }
};
