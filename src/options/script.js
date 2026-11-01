const browserAPI =
  typeof chrome !== 'undefined' &&
  chrome.runtime &&
  typeof chrome.runtime.sendMessage === 'function'
    ? chrome
    : typeof browser !== 'undefined'
      ? browser
      : chrome;

const STOCK_INBOX_TOGGLE_SELECTOR = '#stock-inbox-toggle';
const REMINDER_SELECT_SELECTOR = '#reminder-select';
const BUNDLE_ONE_SELECTOR = 'input[name=bundle-one]';
const BUNDLE_TODAY_SELECTOR = 'input[name=bundle-today]';
const BUNDLE_PURCHASES_SELECTOR = 'input[name=bundle-purchases]';
const BUNDLE_TRAVEL_SELECTOR = 'input[name=bundle-travel]';
const BUNDLE_FINANCE_SELECTOR = 'input[name=bundle-finance]';
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
  const stockInbox = document.querySelector(STOCK_INBOX_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const reminderTreatment = document.querySelector(REMINDER_SELECT_SELECTOR).value;
  const emailBundling = document.querySelector(BUNDLING_TOGGLE_SELECTOR).checked
    ? 'enabled'
    : 'disabled';
  const bundleOne = getCheckboxState(BUNDLE_ONE_SELECTOR);
  const bundleToday = getCheckboxState(BUNDLE_TODAY_SELECTOR);
  const bundlePurchases = getCheckboxState(BUNDLE_PURCHASES_SELECTOR);
  const bundleTravel = getCheckboxState(BUNDLE_TRAVEL_SELECTOR);
  const bundleFinance = getCheckboxState(BUNDLE_FINANCE_SELECTOR);
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
    stockInbox,
    reminderTreatment,
    emailBundling,
    bundleOne,
    bundleToday,
    bundlePurchases,
    bundleTravel,
    bundleFinance,
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
    document.querySelector(STOCK_INBOX_TOGGLE_SELECTOR).checked = options.stockInbox === 'enabled';
    document.querySelector(REMINDER_SELECT_SELECTOR).value = options.reminderTreatment;
    document.querySelector(BUNDLING_TOGGLE_SELECTOR).checked = options.emailBundling === 'enabled';
    setCheckbox(BUNDLE_ONE_SELECTOR, options.bundleOne);
    setCheckbox(BUNDLE_TODAY_SELECTOR, options.bundleToday);
    setCheckbox(BUNDLE_PURCHASES_SELECTOR, options.bundlePurchases);
    setCheckbox(BUNDLE_TRAVEL_SELECTOR, options.bundleTravel);
    setCheckbox(BUNDLE_FINANCE_SELECTOR, options.bundleFinance);
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
    updateSubSettings();
  });
}

// Bundling's sub-options only apply while bundling is on
function updateSubSettings() {
  const bundlingEnabled = document.querySelector(BUNDLING_TOGGLE_SELECTOR).checked;
  document.querySelectorAll('.sub-settings input').forEach((cb) => {
    cb.disabled = !bundlingEnabled;
  });
}

// The control for each setting Stock Inbox decides (see STOCK_INBOX in
// background.js, which sends the values)
const STOCK_INBOX_CONTROLS = {
  emailBundling: BUNDLING_TOGGLE_SELECTOR,
  bundleOne: BUNDLE_ONE_SELECTOR,
  bundleToday: BUNDLE_TODAY_SELECTOR,
  bundlePurchases: BUNDLE_PURCHASES_SELECTOR,
  bundleTravel: BUNDLE_TRAVEL_SELECTOR,
  bundleFinance: BUNDLE_FINANCE_SELECTOR,
  showAvatar: AVATAR_TOGGLE_SELECTOR,
  hideDateTime: HIDE_DATE_TIME_TOGGLE_SELECTOR,
  hideAiInbox: HIDE_AI_INBOX_TOGGLE_SELECTOR,
  hideAllMail: HIDE_ALL_MAIL_TOGGLE_SELECTOR,
  hideTravel: HIDE_TRAVEL_TOGGLE_SELECTOR,
  hideFinance: HIDE_FINANCE_TOGGLE_SELECTOR,
};

// Turning Stock Inbox on sets those controls to Inbox's values
function applyStockInbox() {
  browserAPI.runtime.sendMessage({ method: 'getStockInbox' }, (stock) => {
    Object.entries(STOCK_INBOX_CONTROLS).forEach(([key, selector]) => {
      if (key in stock) {
        document.querySelector(selector).checked = stock[key] === true || stock[key] === 'enabled';
      }
    });
    // Gravatar photos too, as an explicit opt-in: it isn't part of
    // STOCK_INBOX (new installs start with it off, since it shares a hashed
    // address with Gravatar), so switching it later leaves Stock Inbox on
    document.querySelector(GRAVATAR_TOGGLE_SELECTOR).checked = true;
    updateSubSettings();
    saveOptions();
  });
}

function setCheckbox(selector, value) {
  document.querySelector(selector).checked = !!value;
}

const getCheckboxState = (selector) => document.querySelector(selector).checked;

const monitorChange = (element) => element.addEventListener('click', saveOptions);

document.addEventListener('DOMContentLoaded', restoreOptions);

// Changing a setting Stock Inbox decides turns it off (and keeps the change).
// Registered before the save listeners below, so the save sees it off.
Object.values(STOCK_INBOX_CONTROLS).forEach((selector) =>
  document.querySelector(selector).addEventListener('click', () => {
    document.querySelector(STOCK_INBOX_TOGGLE_SELECTOR).checked = false;
  }),
);
document.querySelector(STOCK_INBOX_TOGGLE_SELECTOR).addEventListener('change', (e) => {
  if (e.target.checked) applyStockInbox();
  else saveOptions();
});
document.querySelector(REMINDER_SELECT_SELECTOR).addEventListener('change', saveOptions);
monitorChange(document.querySelector(BUNDLE_ONE_SELECTOR));
monitorChange(document.querySelector(BUNDLE_TODAY_SELECTOR));
monitorChange(document.querySelector(BUNDLE_PURCHASES_SELECTOR));
monitorChange(document.querySelector(BUNDLE_TRAVEL_SELECTOR));
monitorChange(document.querySelector(BUNDLE_FINANCE_SELECTOR));
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
  updateSubSettings();
});
document.querySelector(AVATAR_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(PRIORITY_INBOX_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_DATE_TIME_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_AI_INBOX_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_ALL_MAIL_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_TRAVEL_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(HIDE_FINANCE_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(GRAVATAR_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
