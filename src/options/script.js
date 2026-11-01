const browserAPI =
  typeof chrome !== 'undefined' &&
  chrome.runtime &&
  typeof chrome.runtime.sendMessage === 'function'
    ? chrome
    : typeof browser !== 'undefined'
      ? browser
      : chrome;

const REMINDER_SELECT_SELECTOR = '#reminder-select';
const BUNDLE_ONE_SELECTOR = 'input[name=bundle-one]';
const BUNDLE_TODAY_SELECTOR = 'input[name=bundle-today]';
const AVATAR_TOGGLE_SELECTOR = '#avatar-toggle';
const PRIORITY_INBOX_TOGGLE_SELECTOR = '#priority-inbox-toggle';
const HIDE_DATE_TIME_TOGGLE_SELECTOR = '#hide-date-time-toggle';
const HIDE_AI_INBOX_TOGGLE_SELECTOR = '#hide-ai-inbox-toggle';
const HIDE_ALL_MAIL_TOGGLE_SELECTOR = '#hide-all-mail-toggle';
const HIDE_TRAVEL_TOGGLE_SELECTOR = '#hide-travel-toggle';
const HIDE_FINANCE_TOGGLE_SELECTOR = '#hide-finance-toggle';
const GRAVATAR_TOGGLE_SELECTOR = '#gravatar-toggle';
const DARK_MODE_TOGGLE_SELECTOR = '#dark-mode-toggle';
const BUNDLING_TOGGLE_SELECTOR = '#bundling-toggle';

function saveOptions() {
  const reminderTreatment = document.querySelector(REMINDER_SELECT_SELECTOR).value;
  const emailBundling = document.querySelector(BUNDLING_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const bundleOne = getCheckboxState(BUNDLE_ONE_SELECTOR);
  const bundleToday = getCheckboxState(BUNDLE_TODAY_SELECTOR);
  const showAvatar = document.querySelector(AVATAR_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const priorityInbox = document.querySelector(PRIORITY_INBOX_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const darkMode = document.querySelector(DARK_MODE_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const hideDateTime = document.querySelector(HIDE_DATE_TIME_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const hideAiInbox = document.querySelector(HIDE_AI_INBOX_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const hideAllMail = document.querySelector(HIDE_ALL_MAIL_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const hideTravel = document.querySelector(HIDE_TRAVEL_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const hideFinance = document.querySelector(HIDE_FINANCE_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const gravatar = document.querySelector(GRAVATAR_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';

  const options = {
    reminderTreatment,
    emailBundling,
    bundleOne,
    bundleToday,
    showAvatar,
    priorityInbox,
    darkMode,
    hideDateTime,
    hideAiInbox,
    hideAllMail,
    hideTravel,
    hideFinance,
    gravatar,
  };

  browserAPI.storage.local.set({ options: options });
}

function restoreOptions() {
  browserAPI.runtime.sendMessage({ method: 'getOptions' }, function (options) {
    document.querySelector(REMINDER_SELECT_SELECTOR).value = options.reminderTreatment;
    document.querySelector(BUNDLING_TOGGLE_SELECTOR).checked = options.emailBundling === 'enabled';
    setCheckbox(BUNDLE_ONE_SELECTOR, options.bundleOne);
    setCheckbox(BUNDLE_TODAY_SELECTOR, options.bundleToday);
    document.querySelector(AVATAR_TOGGLE_SELECTOR).checked = options.showAvatar === 'enabled';
    document.querySelector(PRIORITY_INBOX_TOGGLE_SELECTOR).checked =
      options.priorityInbox === 'enabled';
    document.querySelector(DARK_MODE_TOGGLE_SELECTOR).checked = options.darkMode === 'enabled';
    document.querySelector(HIDE_DATE_TIME_TOGGLE_SELECTOR).checked =
      options.hideDateTime === 'enabled';
    document.querySelector(HIDE_AI_INBOX_TOGGLE_SELECTOR).checked =
      options.hideAiInbox === 'enabled';
    document.querySelector(HIDE_ALL_MAIL_TOGGLE_SELECTOR).checked =
      options.hideAllMail === 'enabled';
    document.querySelector(HIDE_TRAVEL_TOGGLE_SELECTOR).checked = options.hideTravel === 'enabled';
    document.querySelector(HIDE_FINANCE_TOGGLE_SELECTOR).checked =
      options.hideFinance === 'enabled';
    document.querySelector(GRAVATAR_TOGGLE_SELECTOR).checked = options.gravatar === 'enabled';
    document.body.classList.toggle('dark-mode', options.darkMode === 'enabled');

    const bundlingEnabled = options.emailBundling === 'enabled';
    document.querySelectorAll('.sub-settings input').forEach((cb) => {
      cb.disabled = !bundlingEnabled;
    });
  });
}

function setCheckbox(selector, value) {
  document.querySelector(selector).checked = !!value;
}

const getCheckboxState = (selector) => document.querySelector(selector).checked;

const monitorChange = (element) => element.addEventListener('click', saveOptions);

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector(REMINDER_SELECT_SELECTOR).addEventListener('change', saveOptions);
monitorChange(document.querySelector(BUNDLE_ONE_SELECTOR));
monitorChange(document.querySelector(BUNDLE_TODAY_SELECTOR));
document.querySelector(DARK_MODE_TOGGLE_SELECTOR).addEventListener('change', () => {
  saveOptions();
  document.body.classList.toggle(
    'dark-mode',
    document.querySelector(DARK_MODE_TOGGLE_SELECTOR).checked,
  );
});
const bundlingToggle = document.querySelector(BUNDLING_TOGGLE_SELECTOR);
bundlingToggle.addEventListener('change', () => {
  saveOptions();
  document.querySelectorAll('.sub-settings input').forEach((cb) => {
    cb.disabled = !bundlingToggle.checked;
  });
});
document.querySelector(AVATAR_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(PRIORITY_INBOX_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_DATE_TIME_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_AI_INBOX_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_ALL_MAIL_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_TRAVEL_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_FINANCE_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(GRAVATAR_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
