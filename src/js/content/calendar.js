import { CLASSES } from './constants';
import { htmlToElements } from './utils';

export default {
  addEventAttachment(email) {
    if (email.querySelector(`.${CLASSES.CALENDAR_ATTACHMENT_CLASS}`)) {
      return;
    }

    let title = 'Calendar Event';
    let time = '';
    const titleNode = email.querySelector('.bqe, .bog');
    if (titleNode) {
      const titleFullText = titleNode.innerText;
      const matches = Array.from(titleFullText.matchAll(/[^:]*: ([^@]*)@(.*)/g))[0];
      if (matches) {
        title = matches[1].trim();
        time = matches[2].trim();
      }
    }

    const calendarNode = htmlToElements(`
      <div class="brd ${CLASSES.CALENDAR_ATTACHMENT_CLASS}">
        <span class="bzB">Attachment</span>
        <div class="brc" role="listitem" title="${title}">
          <span class="calendar-image"></span>
          <span class="brg">
            <span class="event-title">${title}</span>
            <span class="event-time">${time}</span>
          </span>
        </div>
      </div>
    `);

    const emailSubjectWrapper = email.querySelectorAll('.a4W');
    if (emailSubjectWrapper) {
      emailSubjectWrapper[0].appendChild(calendarNode);
    }

    const action = email.querySelector('.aKS');
    if (action) {
      const attachmentContentWrapper = calendarNode.querySelector('.brg');
      attachmentContentWrapper.appendChild(action);
    }
  }
};
