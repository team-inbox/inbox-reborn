export default {
  addDateLabels() {
    let lastLabel = null;
    this.cleanupDateLabels();
    const emailElements = document.querySelectorAll('.BltHke[role=main] .zA');
    emailElements.forEach(emailEl => {
      const dateLabel = emailEl.getAttribute('data-date-label');

      // Add date label if it's a new label
      if (dateLabel !== lastLabel) {
        this.addDateLabel(emailEl, dateLabel);
        lastLabel = dateLabel;
      }
    });
  },
  addDateLabel(email, label) {
    if (email.previousSibling && email.previousSibling.className === 'time-row') {
      if (email.previousSibling.innerText === label) {
        return;
      }
      email.previousSibling.remove();
    }
    const timeRow = document.createElement('div');
    timeRow.classList.add('time-row');

    const time = document.createElement('div');
    time.className = 'time';
    time.innerText = label;
    timeRow.appendChild(time);
    email.parentElement.insertBefore(timeRow, email);
  },
  isEmptyDateLabel(row) {
    const sibling = row.nextSibling;
    if (!sibling) {
      return true;
    }
    if (sibling.className === 'time-row') {
      return true;
    }
    if (![...sibling.classList].includes('bundled-email')) {
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
        // If all siblings are .bundled-email, then hide row
      } else if (this.isEmptyDateLabel(row)) {
        row.hidden = true;
      }
    });
  }
};
