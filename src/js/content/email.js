import {
  buildAvatar,
  buildDateLabel
} from './emailUtils';
import { CLASSES } from './constants';
import calendar from './calendar';
import { getOptions } from './options';
import emailPreview from './emailPreview';
import {
  addClass,
  getMyEmailAddress,
  getTabs,
  hasClass,
  isInBundle,
  isInInbox,
  openInbox,
  queryParentSelector,
  observeForRemoval
} from './utils';

export default class Email {
  constructor(emailEl, prevDate) {
    this.emailEl = emailEl;

    this.processIcon();
    this.processBundle();
    this.processCalendar();
    this.processDate(prevDate);
    this.setupPreview();
  }

  getLabels() {
    return Array.from(this.emailEl.querySelectorAll('.ar.as')).map(labelContainer => {
      const labelEl = labelContainer.querySelector('.at');
      const labelText = labelContainer.querySelector('.av');
      return {
        title: labelEl.getAttribute('title'),
        color: labelText.style.color !== 'rgb(255, 255, 255)' ? labelText.style.color : labelEl.style.backgroundColor,
        element: labelEl
      };
    });
  }

  getParticipants() {
    return Array.from(this.emailEl.querySelectorAll('.yW span[email]'));
  }

  getParticipantNames() {
    return this.getParticipants().map(node => node.getAttribute('name'));
  }

  isBundled() {
    return this.emailEl.getAttribute('data-inbox') === 'bundled';
  }

  isReminder() {
    const options = getOptions();
    // if user doesn't want reminders treated special,
    // then just return as though current email is not a reminder
    if (options.reminderTreatment === 'none') {
      return false;
    }

    const participants = this.getParticipants().map(node => node.getAttribute('email'));
    const allNamesMe = participants.length > 0 && participants.every(participant => participant === getMyEmailAddress());

    if (options.reminderTreatment === 'all') {
      return allNamesMe;
    } if (options.reminderTreatment === 'containing-word') {
      const titleNode = this.emailEl.querySelector('.y6');
      return allNamesMe && titleNode && titleNode.innerText.match(/reminder/i);
    }

    return false;
  }

  isUnread() {
    return hasClass(this.emailEl, 'zE');
  }

  processIcon() {
    if (this.isReminder()) {
      this.processReminder();
      this.emailEl.setAttribute('data-icon', 'reminder');
    } else {
      this.processAvatar();
      this.emailEl.setAttribute('data-icon', 'avatar');
    }
  }

  processAvatar() {
    const options = getOptions();
    if (options.showAvatar === 'enabled') {
      const participants = Array.from(this.getParticipantNames()); // convert to array to filter
      if (!participants.length) {
        return; // Prevents Drafts in Search or Drafts folder from causing errors
      }
      let firstParticipant = participants[0];

      const excludingMe = participants.filter(participant => participant !== getMyEmailAddress());
      // If there are others in the participants, use one of their initials instead
      if (excludingMe.length > 0) {
        [firstParticipant] = excludingMe;
      }

      const firstLetter = (firstParticipant && firstParticipant.toUpperCase()[0]) || '-';
      this.addAvatar(firstLetter);
    }
  }

  processDate(prevDate) {
    const dateElement = this.emailEl.querySelector('.xW.xY span');
    const dateDisplay = dateElement && dateElement.innerText;
    const rawDate = dateElement && dateElement.getAttribute('title');
    let date = new Date(rawDate);
    const snoozeElement = this.emailEl.querySelector('.by1.cL');
    const snoozeString = snoozeElement && snoozeElement.innerText;
    const isSnoozed = snoozeString || (prevDate && date < prevDate);
    if (isSnoozed) {
      date = prevDate || new Date();
    }

    const dateLabel = buildDateLabel(date);
    this.dateInfo = {
      date,
      dateLabel,
      dateDisplay,
      rawDate
    };

    this.emailEl.setAttribute('data-date-label', dateLabel);
  }

  processBundle() {
    const options = getOptions();

    const tabs = getTabs();
    const labels = this.getLabels().filter(label => !tabs.includes(label.title));
    const labelTitles = labels.map(label => label.title);

    // only process bundles on the inbox page
    if (options.emailBundling === 'enabled' && !isInBundle() && isInInbox()) {
      const starContainer = this.emailEl.querySelector('.T-KT');
      const isStarred = hasClass(starContainer, 'T-KT-Jp');
      const isUnbundled = labelTitles.some(title => title.includes(CLASSES.UNBUNDLED_PARENT_LABEL));

      if (labels.length && !isStarred && !isUnbundled) {
        this.emailEl.setAttribute('data-inbox', 'bundled');
      } else {
        this.emailEl.setAttribute('data-inbox', 'email');
        if (isUnbundled) {
          labels.forEach(label => {
            if (label.title.includes(CLASSES.UNBUNDLED_PARENT_LABEL)) {
              // Remove 'Unbundled/' from display in the UI
              label.element.querySelector('.av').innerText = label.title.replace(`${CLASSES.UNBUNDLED_PARENT_LABEL}/`, '');
            } else {
              // Hide labels that aren't nested under UNBUNDLED_PARENT_LABEL
              label.element.hidden = true;
            }
          });
        }
      }
    }
  }

  processCalendar() {
    const calendarAlreadyProcessed = this.emailEl.getAttribute('data-calendar');
    const node = this.emailEl.querySelector('.aKS .aJ6');
    const isCalendarEvent = node && node.innerText === 'RSVP';

    if (isCalendarEvent && !calendarAlreadyProcessed) {
      calendar.addEventAttachment(this.emailEl);
      this.emailEl.setAttribute('data-calendar', true);
    }
  }

  processReminder() {
    const subjectEl = this.emailEl.querySelector('.y6');
    const subject = subjectEl && subjectEl.innerText.trim();

    // if subject is reminder, hide subject in the row and show the body instead
    if (subject && subject.toLowerCase() === 'reminder') {
      subjectEl.outerHTML = '';
      this.emailEl.querySelectorAll('.Zt').forEach(node => { node.outerHTML = ''; });
      this.emailEl.querySelectorAll('.y2').forEach(node => { node.style.color = '#202124'; });
    }
    // replace email with Reminder
    this.emailEl.querySelectorAll('.yP,.zF').forEach(node => { node.innerHTML = 'Reminder'; });
    this.addAvatar();
    addClass(this.emailEl, CLASSES.REMINDER_EMAIL_CLASS);
  }

  addAvatar(firstLetter) {
    const avatarWrapperEl = this.emailEl.querySelector('.oZ-x3');
    if (avatarWrapperEl && avatarWrapperEl.getElementsByClassName(CLASSES.AVATAR_CLASS).length === 0) {
      avatarWrapperEl.appendChild(buildAvatar(firstLetter));
    }
  }

  setupPreview() {
    const previewProcessed = this.emailEl.getAttribute('data-preview-enabled');
    if (previewProcessed !== 'true') {
      const ignoreColumns = [ 'oZ-x3', 'apU', 'bq4' ];
      this.emailEl.addEventListener('click', async event => {
        if (this.emailEl.getAttribute('data-inbox') && isInBundle()) {
          openInbox();
          emailPreview.hidePreview();
          await observeForRemoval(document, '[data-pane="bundle"]');
          const clickColumn = queryParentSelector(event.target, '.xY');
          if (clickColumn && ignoreColumns.some(col => hasClass(clickColumn, col))) {
            const clickSelector = `${event.target.tagName}.${Array.from(event.target.classList).join('.')}`;
            const clickTarget = this.emailEl.querySelector(clickSelector);
            if (clickTarget) {
              clickTarget.click();
            }
          } else {
            emailPreview.emailClicked(this.emailEl);
          }
        } else {
          const clickColumn = queryParentSelector(event.target, '.xY');
          if (clickColumn && ignoreColumns.some(col => hasClass(clickColumn, col))) {
            return;
          }
          emailPreview.emailClicked(this.emailEl);
        }
      });
      this.emailEl.setAttribute('data-preview-enabled', true);
    }
  }
}
