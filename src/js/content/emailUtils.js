import {
  DATE_LABELS,
  CLASSES,
  MONTHS,
  NAME_COLORS
} from './constants';

const getSnoozeDate = snoozeString => {
  const [, count, interval] = snoozeString.split(' ');
  const intervals = {
    day: 1,
    days: 1,
    week: 7,
    weeks: 7,
    month: 30,
    months: 30
  };
  const date = new Date();
  if (intervals[interval]) {
    date.setDate(date.getDate() - (count * intervals[interval]));
    return date;
  }
  // if interval is hours, use today
  if (interval === 'hours') {
    return date;
  }
};

export const buildDateLabel = (dateString, snoozeString) => {
  // const dateString = getRawDate(this.emailEl);
  // const snoozed = this.isSnoozed();
  let date;
  if (snoozeString) {
    date = getSnoozeDate(snoozeString);
  }
  if (!date && dateString) {
    date = new Date(dateString);
  }

  const now = new Date();
  if (!date) {
    return null;
  }

  if (now.getFullYear() === date.getFullYear()) {
    if (now.getMonth() === date.getMonth()) {
      if (now.getDate() === date.getDate()) {
        return DATE_LABELS.TODAY;
      }
      if (now.getDate() - 1 === date.getDate()) {
        return DATE_LABELS.YESTERDAY;
      }
      return DATE_LABELS.THIS_MONTH;
    }
    return MONTHS[date.getMonth()];
  }
  if (now.getFullYear() - 1 === date.getFullYear()) {
    return DATE_LABELS.LAST_YEAR;
  }

  return date.getFullYear().toString();
};

export const buildAvatar = firstLetter => {
  const avatarElement = document.createElement('div');
  avatarElement.className = CLASSES.AVATAR_CLASS;
  if (firstLetter) {
    const firstLetterCode = firstLetter.charCodeAt(0);

    if (firstLetterCode >= 65 && firstLetterCode <= 90) {
      avatarElement.style.background = `#${NAME_COLORS[firstLetterCode - 65]}`;
    } else {
      avatarElement.style.background = '#000000';
      // Some unicode characters are not affected by 'color: white', hence this alternative
      avatarElement.style.color = 'transparent';
      avatarElement.style.textShadow = '0 0 rgba(255, 255, 255, 0.65)';
    }

    avatarElement.innerText = firstLetter;
  }
  return avatarElement;
};
