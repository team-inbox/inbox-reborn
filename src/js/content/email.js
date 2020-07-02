import {
  buildAvatar,
  buildDateLabel
} from './emailUtils';
import { CLASSES } from './constants';
import calendar from './calendar';
import { getOptions } from './options';
import {
  addClass,
  getMyEmailAddress,
  getTabs,
  hasClass,
  isInInbox
} from './utils';

const STYLE_NODE_ID_PREFIX = 'hide-email-';

export default class Email {
  constructor(emailEl) {
    this.emailEl = emailEl;

    const options = getOptions();

    if (options.showAvatar === 'enabled') {
      this.processAvatar();
    }
    if (options.emailBundling === 'enabled') {
      this.processBundle();
    }
    this.processCalendar();
    this.processDate();
    this.processReminder();
    this.processUnbundled();
  }

  getLabelTitles() {
    return Array.from(this.emailEl.querySelectorAll('.ar .at')).map(el => el.attributes.title.value);
  }

  getParticipants() {
    return Array.from(this.emailEl.querySelectorAll('.yW span[email]'));
  }

  getParticipantNames() {
    return this.getParticipants().map(node => node.getAttribute('name'));
  }

  getRawDate() {
    const dateElement = this.emailEl.querySelector('.xW.xY span');
    if (dateElement) {
      return dateElement.getAttribute('title');
    }
  }

  getSnoozeString() {
    const node = this.emailEl.querySelector('.by1.cL');
    return node && node.innerText;
  }

  bundleAlreadyProcessed() {
    return hasClass(this.emailEl, CLASSES.BUNDLED_EMAIL_CLASS)
      || hasClass(this.emailEl, CLASSES.BUNDLE_WRAPPER_CLASS);
  }

  isCalendarEvent() {
    const node = this.emailEl.querySelector('.aKS .aJ6');
    return node && node.innerText === 'RSVP';
  }

  isBundleWrapper() {
    return hasClass(this.emailEl, CLASSES.BUNDLE_WRAPPER_CLASS);
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

  isStarred() {
    const node = this.emailEl.querySelector('.T-KT');
    return node && node.title !== 'Not starred';
  }

  isUnbundled() {
    return this.getLabelTitles().some(label => label.includes(CLASSES.UNBUNDLED_PARENT_LABEL));
  }

  isUnread() {
    return hasClass(this.emailEl, 'zE');
  }

  processAvatar() {
    const avatarAlreadyProcessed = hasClass(this.emailEl, CLASSES.AVATAR_EMAIL_CLASS);

    if (!avatarAlreadyProcessed && !this.bundleAlreadyProcessed() && !this.isReminder()) {
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

      addClass(this.emailEl, CLASSES.AVATAR_EMAIL_CLASS);
    }
  }

  processBundle() {
    const tabs = getTabs();
    const isInInboxFlag = isInInbox();

    const labels = this.getLabelTitles().filter(x => !tabs.includes(x));
    const styleId = `${STYLE_NODE_ID_PREFIX}-${this.emailEl.id}`;
    const hideEmailStyle = document.getElementById(styleId);

    if (isInInboxFlag && !this.isStarred() && labels.length && !this.isUnbundled() && !this.bundleAlreadyProcessed()) {
      addClass(this.emailEl, CLASSES.BUNDLED_EMAIL_CLASS);
      // Insert style node to avoid bundled emails appearing briefly in inbox during redraw
      if (!hideEmailStyle) {
        const style = document.createElement('style');
        document.head.appendChild(style);
        style.id = styleId;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(`.nH.ar4.z .zA[id="${this.emailEl.id}"] { display: none; }`));
      }
    } else if (!this.isUnbundled() && !labels.length && hideEmailStyle) {
      document.getElementById(styleId).remove();
    }
  }

  processDate() {
    const dateLabel = buildDateLabel(this.getRawDate(), this.getSnoozeString());
    this.emailEl.setAttribute('data-date-label', dateLabel);
  }

  processCalendar() {
    const calendarAlreadyProcessed = hasClass(this.emailEl, CLASSES.CALENDAR_EMAIL_CLASS);

    if (this.isCalendarEvent() && !calendarAlreadyProcessed) {
      calendar.addEventAttachment(this.emailEl);
      addClass(this.emailEl, CLASSES.BUNDLED_EMAIL_CLASS);
    }
  }

  processReminder() {
    const reminderAlreadyProcessed = hasClass(this.emailEl, CLASSES.REMINDER_EMAIL_CLASS);

    if (this.isReminder() && !reminderAlreadyProcessed) {
      const subjectEl = this.emailEl.querySelector('.y6');
      const subject = subjectEl && subjectEl.innerText.trim();

      // if subject is reminder, hide subject in the row and show the body instead
      if (subject.toLowerCase() === 'reminder') {
        subjectEl.outerHTML = '';
        this.emailEl.querySelectorAll('.Zt').forEach(node => { node.outerHTML = ''; });
        this.emailEl.querySelectorAll('.y2').forEach(node => { node.style.color = '#202124'; });
      }
      // replace email with Reminder
      this.emailEl.querySelectorAll('.yP,.zF').forEach(node => { node.innerHTML = 'Reminder'; });
      this.addAvatar();
      addClass(this.emailEl, CLASSES.REMINDER_EMAIL_CLASS);
    }
  }

  processUnbundled() {
    const labels = this.emailEl.querySelectorAll('.ar.as');
    const unbundledAlreadyProcessed = hasClass(this.emailEl, CLASSES.UNBUNDLED_EMAIL_CLASS);

    if (this.isUnbundled() && !unbundledAlreadyProcessed) {
      addClass(this.emailEl, CLASSES.UNBUNDLED_EMAIL_CLASS);
      labels.forEach(labelEl => {
        if (labelEl.querySelector('.at').title.includes(CLASSES.UNBUNDLED_PARENT_LABEL)) {
          // Remove 'Unbundled/' from display in the UI
          labelEl.querySelector('.av').innerText = labelEl.innerText.replace(`${CLASSES.UNBUNDLED_PARENT_LABEL}/`, '');
        } else {
          // Hide labels that aren't nested under UNBUNDLED_PARENT_LABEL
          labelEl.hidden = true;
        }
      });
    }
  }

  addAvatar(firstLetter) {
    const avatarWrapperEl = this.emailEl.querySelector('.oZ-x3');
    if (avatarWrapperEl && avatarWrapperEl.getElementsByClassName(CLASSES.AVATAR_CLASS).length === 0) {
      avatarWrapperEl.appendChild(buildAvatar(firstLetter));
    }
  }
}
