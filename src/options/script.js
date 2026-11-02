const browserAPI =
  typeof chrome !== 'undefined' &&
  chrome.runtime &&
  typeof chrome.runtime.sendMessage === 'function'
    ? chrome
    : typeof browser !== 'undefined'
      ? browser
      : chrome;

/* Each stored option and the control that sets it. Switches store
   'enabled'/'disabled', checkboxes store booleans. Controls marked
   data-invert in the HTML show the opposite of what's stored: the UI asks
   "show X?" while storage keeps its "hide X" keys. */
const SWITCHES = {
  stockInbox: 'stock-inbox-toggle',
  darkMode: 'dark-mode-toggle',
  gravatar: 'gravatar-toggle',
  emailBundling: 'bundling-toggle',
  showAvatar: 'avatar-toggle',
  hideDateTime: 'hide-date-time-toggle',
  priorityInbox: 'priority-inbox-toggle',
  hideAiInbox: 'hide-ai-inbox-toggle',
  hideAllMail: 'hide-all-mail-toggle',
  hideTravel: 'hide-travel-toggle',
  hideFinance: 'hide-finance-toggle',
};
const CHECKBOXES = {
  bundleOne: 'bundle-one',
  bundleToday: 'bundle-today',
  bundlePurchases: 'bundle-purchases',
  bundleTravel: 'bundle-travel',
  bundleFinance: 'bundle-finance',
};
const REMINDERS = 'input[name=reminder-treatment]';
const DARK_MODE_CACHE_KEY = 'inboxReborn.darkMode'; // read by theme.js

const byId = (id) => document.getElementById(id);
const KEY_FOR_ID = Object.fromEntries(
  Object.entries({ ...SWITCHES, ...CHECKBOXES }).map(([key, id]) => [id, key]),
);

// Inbox's values (STOCK_INBOX in background.js) - the settings Stock Inbox decides
let stockInbox = {};

const isOn = (input) => input.checked !== input.hasAttribute('data-invert');
const setOn = (input, on) => {
  input.checked = on !== input.hasAttribute('data-invert');
};

function readControls() {
  const options = {};
  Object.entries(SWITCHES).forEach(([key, id]) => {
    options[key] = isOn(byId(id)) ? 'enabled' : 'disabled';
  });
  Object.entries(CHECKBOXES).forEach(([key, id]) => {
    options[key] = isOn(byId(id));
  });
  options.reminderTreatment = document.querySelector(`${REMINDERS}:checked`)?.value || 'none';
  return options;
}

function writeControls(options) {
  Object.entries(SWITCHES).forEach(([key, id]) => setOn(byId(id), options[key] === 'enabled'));
  Object.entries(CHECKBOXES).forEach(([key, id]) => setOn(byId(id), !!options[key]));
  document.querySelectorAll(REMINDERS).forEach((radio) => {
    radio.checked = radio.value === options.reminderTreatment;
  });
}

let savedTimer;
function showStatus(text, sticky = false) {
  const status = byId('save-status');
  status.textContent = text;
  status.classList.add('visible');
  clearTimeout(savedTimer);
  if (!sticky) savedTimer = setTimeout(() => status.classList.remove('visible'), 1500);
}

function saveOptions() {
  // Say "Saved" once the write has landed, and say so if it didn't
  Promise.resolve(browserAPI.storage.local.set({ options: readControls() })).then(
    () => showStatus('Saved'),
    () => showStatus('Not saved - try again', true),
  );
}

function applyTheme() {
  const dark = isOn(byId(SWITCHES.darkMode));
  document.documentElement.classList.toggle('dark-mode', dark);
  try {
    localStorage.setItem(DARK_MODE_CACHE_KEY, dark ? 'enabled' : 'disabled');
  } catch {
    // Storage blocked - theme.js just won't know before the options load
  }
}

// Controls that only matter while another is on: bundle options need
// bundling, Gravatar needs avatars (no avatar, no picture lookup)
function updateDependents() {
  const bundling = isOn(byId(SWITCHES.emailBundling));
  document.querySelectorAll('.sub-settings input').forEach((input) => {
    input.disabled = !bundling;
  });
  document.querySelector('.sub-settings').classList.toggle('is-disabled', !bundling);

  const avatars = isOn(byId(SWITCHES.showAvatar));
  byId(SWITCHES.gravatar).disabled = !avatars;
  byId(SWITCHES.gravatar).closest('.row').classList.toggle('is-disabled', !avatars);
}

function updateStatus() {
  const stock = isOn(byId(SWITCHES.stockInbox));
  byId('stock-status').textContent = stock
    ? 'On — everything works like Inbox'
    : 'Custom — turn on to restore Inbox’s settings';
  byId('customize-status').textContent = stock ? 'Inbox’s settings' : 'Custom';
}

// Turning Stock Inbox on: Inbox's values, plus Gravatar as the explicit
// opt-in (it isn't part of STOCK_INBOX, so new installs start without it)
function applyStockInbox() {
  Object.entries(stockInbox).forEach(([key, value]) => {
    const id = SWITCHES[key] || CHECKBOXES[key];
    if (id) setOn(byId(id), value === true || value === 'enabled');
  });
  setOn(byId(SWITCHES.gravatar), true);
}

function restoreOptions() {
  // Nothing can be changed (or saved) until the stored options are shown:
  // saving the blank controls would overwrite the real settings
  const controls = document.querySelector('main');
  controls.inert = true;

  // The Stock Inbox keys come first - the change listener needs them to
  // tell which settings turn Stock Inbox off
  browserAPI.runtime.sendMessage({ method: 'getStockInbox' }, (stock) => {
    stockInbox = stock || {};
    browserAPI.runtime.sendMessage({ method: 'getOptions' }, (options) => {
      if (browserAPI.runtime.lastError || !options) {
        showStatus('Settings could not be loaded - close and reopen', true);
        return;
      }
      writeControls(options);
      applyTheme();
      updateDependents();
      updateStatus();
      // Custom settings are what someone came to change
      byId('customize').open = options.stockInbox !== 'enabled';
      controls.inert = false;
    });
  });
}

// One listener for every control: a change to a setting Stock Inbox decides
// turns Stock Inbox off (keeping the change), turning Stock Inbox on applies
// Inbox's values, and every change saves at once.
document.addEventListener('change', (e) => {
  const key = KEY_FOR_ID[e.target.id];
  if (!key && e.target.name !== 'reminder-treatment') return;

  if (key === 'stockInbox') {
    if (isOn(e.target)) applyStockInbox();
  } else if (key in stockInbox) {
    setOn(byId(SWITCHES.stockInbox), false);
  }
  if (key === 'darkMode') applyTheme();

  updateDependents();
  updateStatus();
  saveOptions();
});

document.addEventListener('DOMContentLoaded', () => {
  byId('version').textContent = `v${browserAPI.runtime.getManifest().version}`;
  restoreOptions();
});
