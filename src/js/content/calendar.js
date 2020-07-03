import { htmlToElements } from './utils';

const CALENDAR_ATTACHMENT_CLASS = 'calendar-attachment';

export default {
  addEventAttachment(email) {
    if (email.querySelector(`.${CALENDAR_ATTACHMENT_CLASS}`)) return;

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
      <div class="brd calendar-attachment">
        <span class="bzB">Attachment</span>
        <div class="brc" role="listitem" title="${title}">
          <span class="calendar-image"></span>
          <span class="brg">
            <span class="event-title">${title}</span>
            <span class="event-time">${time}</span>
            <span class="aKS">
              <div class="T-I J-J5-Ji aOd aS9 T-I-awv L3" role="button" tabindex="0">
                <span class="aJ6">RSVP</span>
                <img class="J-J5-Ji aTi aJ4" src="images/cleardot.gif" alt=""/>
              </div>
            </span>
          </span>
        </div>
      </div>
    `);

    const emailSubjectWrapper = email.querySelectorAll('.a4W');
    if (emailSubjectWrapper) {
      emailSubjectWrapper[0].appendChild(calendarNode);
    }
  }
};
