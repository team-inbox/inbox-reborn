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

    // build calendar attachment, this is based on regular attachments we no longer
    // have access to inbox to see the full structure
    const span = document.createElement('span');
    span.appendChild(document.createTextNode('Attachment'));
    span.classList.add('bzB');

    const attachmentNameSpan = document.createElement('span');
    attachmentNameSpan.classList.add('event-title');
    attachmentNameSpan.appendChild(document.createTextNode(title));

    const attachmentTimeSpan = document.createElement('span');
    attachmentTimeSpan.classList.add('event-time');
    attachmentTimeSpan.appendChild(document.createTextNode(time));

    const attachmentContentWrapper = document.createElement('span');
    attachmentContentWrapper.classList.add('brg');
    attachmentContentWrapper.appendChild(attachmentNameSpan);
    attachmentContentWrapper.appendChild(attachmentTimeSpan);

    // Find Invitation Action
    const action = email.querySelector('.aKS');
    if (action) attachmentContentWrapper.appendChild(action);

    const imageSpan = document.createElement('span');
    imageSpan.classList.add('calendar-image');

    const attachmentCard = document.createElement('div');
    attachmentCard.classList.add('brc');
    attachmentCard.setAttribute('role', 'listitem');
    attachmentCard.setAttribute('title', title);
    attachmentCard.appendChild(imageSpan);
    attachmentCard.appendChild(attachmentContentWrapper);

    const attachmentNode = document.createElement('div');
    attachmentNode.classList.add('brd', CALENDAR_ATTACHMENT_CLASS);
    attachmentNode.appendChild(span);
    attachmentNode.appendChild(attachmentCard);

    const emailSubjectWrapper = email.querySelectorAll('.a4W');
    if (emailSubjectWrapper) emailSubjectWrapper[0].appendChild(attachmentNode);
  }
};
