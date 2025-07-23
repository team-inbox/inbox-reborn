const browserAPI = (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function')
    ? chrome
    : (typeof browser !== 'undefined' ? browser : chrome);

const REMINDER_TREATMENT_SELECTOR = 'input[name=reminder-treatment]';
const REMINDER_SELECT_SELECTOR = '#reminder-select';
const BUNDLED_EMAIL_SELECTOR = 'input[name=email-bundling]';
const BUNDLE_ONE_SELECTOR = 'input[name=bundle-one]';
const BUNDLE_TOP_SELECTOR = 'input[name=bundle-top]';
const AVATAR_SELECTOR = 'input[name=avatar]';
const AVATAR_TOGGLE_SELECTOR = '#avatar-toggle';
const PRIORITY_INBOX_SELECTOR = 'input[name=priority-inbox]';
const PRIORITY_INBOX_TOGGLE_SELECTOR = '#priority-inbox-toggle';
const DARK_MODE_SELECTOR = 'input[name=dark-mode]';
const DARK_MODE_TOGGLE_SELECTOR = '#dark-mode-toggle';
const BUNDLING_TOGGLE_SELECTOR = '#bundling-toggle';

function saveOptions() {
	const reminderTreatment = document.querySelector(REMINDER_SELECT_SELECTOR).value;
	const emailBundling = document.querySelector(BUNDLING_TOGGLE_SELECTOR).checked ? 'enabled' : 'disabled';
	const bundleOne = getCheckboxState(BUNDLE_ONE_SELECTOR);
	const bundleTop = getCheckboxState(BUNDLE_TOP_SELECTOR);
	const showAvatar = document.querySelector(AVATAR_TOGGLE_SELECTOR).checked ? 'enabled' : 'disabled';
	const priorityInbox = document.querySelector(PRIORITY_INBOX_TOGGLE_SELECTOR).checked ? 'enabled' : 'disabled';
	const darkMode = document.querySelector(DARK_MODE_TOGGLE_SELECTOR).checked ? 'enabled' : 'disabled';

	const options = { reminderTreatment, emailBundling, bundleOne, bundleTop, showAvatar, priorityInbox, darkMode };

	browserAPI.storage.local.set({ 'options': options }, function() {
    console.log('Options saved:', options);
});
}

function restoreOptions() {
	browserAPI.runtime.sendMessage({ method: 'getOptions' }, function(options) {
		document.querySelector(REMINDER_SELECT_SELECTOR).value = options.reminderTreatment;
		document.querySelector(BUNDLING_TOGGLE_SELECTOR).checked = options.emailBundling === 'enabled';
		setCheckbox(BUNDLE_ONE_SELECTOR, options.bundleOne);
		setCheckbox(BUNDLE_TOP_SELECTOR, options.bundleTop);
		document.querySelector(AVATAR_TOGGLE_SELECTOR).checked = options.showAvatar === 'enabled';
		document.querySelector(PRIORITY_INBOX_TOGGLE_SELECTOR).checked = options.priorityInbox === 'enabled';
		document.querySelector(DARK_MODE_TOGGLE_SELECTOR).checked = options.darkMode === 'enabled';
		document.body.classList.toggle('dark-mode', options.darkMode === 'enabled');
		
		const bundlingEnabled = options.emailBundling === 'enabled';
		document.querySelectorAll('.sub-settings input').forEach(cb => {
		  cb.disabled = !bundlingEnabled;
		});
	});
}

function selectRadioWithValue(selector, value) {
	document.querySelectorAll(selector).forEach(radioInput => {
		if(radioInput.value === value) radioInput.checked = true;
	});
}

function setCheckbox(selector, value) {
	document.querySelector(selector).checked = !!value;
}

const getSelectedRadioValue = selector => document.querySelector(selector + ':checked').value;
const getCheckboxState = selector => document.querySelector(selector).checked;

const monitorChange = element => element.addEventListener('click', saveOptions);

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector(REMINDER_SELECT_SELECTOR).addEventListener('change', saveOptions);
// Removed monitoring for BUNDLED_EMAIL_SELECTOR radios since replaced by toggle
monitorChange(document.querySelector(BUNDLE_ONE_SELECTOR));
monitorChange(document.querySelector(BUNDLE_TOP_SELECTOR));
// document.querySelectorAll(AVATAR_SELECTOR).forEach(monitorChange);
// document.querySelectorAll(PRIORITY_INBOX_SELECTOR).forEach(monitorChange);
document.querySelector(DARK_MODE_TOGGLE_SELECTOR).addEventListener('change', () => {
  saveOptions();
  document.body.classList.toggle('dark-mode',
    document.querySelector(DARK_MODE_TOGGLE_SELECTOR).checked
  );
});
const bundlingToggle = document.querySelector(BUNDLING_TOGGLE_SELECTOR);
bundlingToggle.addEventListener('change', () => {
  saveOptions();
  document.querySelectorAll('.sub-settings input').forEach(cb => {
    cb.disabled = !bundlingToggle.checked;
  });
});
document.querySelector(AVATAR_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
document.querySelector(PRIORITY_INBOX_TOGGLE_SELECTOR).addEventListener('change', saveOptions);
