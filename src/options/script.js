// Polyfill for cross-browser compatibility with callback support
const browserAPI = (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function')
    ? chrome
    : (typeof browser !== 'undefined' ? browser : chrome);

const REMINDER_TREATMENT_SELECTOR = 'input[name=reminder-treatment]';
const BUNDLED_EMAIL_SELECTOR = 'input[name=email-bundling]';
const BUNDLE_ONE_SELECTOR = 'input[name=bundle-one]';
const AVATAR_SELECTOR = 'input[name=avatar]';
const PRIORITY_INBOX_SELECTOR = 'input[name=priority-inbox]';

function saveOptions() {
	const reminderTreatment = getSelectedRadioValue(REMINDER_TREATMENT_SELECTOR);
	const emailBundling = getSelectedRadioValue(BUNDLED_EMAIL_SELECTOR);
	const bundleOne = getCheckboxState(BUNDLE_ONE_SELECTOR);
	const showAvatar = getSelectedRadioValue(AVATAR_SELECTOR);
	const priorityInbox = getSelectedRadioValue(PRIORITY_INBOX_SELECTOR);

	const options = { reminderTreatment, emailBundling, bundleOne, showAvatar, priorityInbox };

	browserAPI.storage.local.set({ 'options': options }, function() {
    console.log('Options saved:', options);
});
}

function restoreOptions() {
	browserAPI.runtime.sendMessage({ method: 'getOptions' }, function(options) {
		selectRadioWithValue(REMINDER_TREATMENT_SELECTOR, options.reminderTreatment);
		selectRadioWithValue(BUNDLED_EMAIL_SELECTOR, options.emailBundling);
		setCheckbox(BUNDLE_ONE_SELECTOR, options.bundleOne);
		selectRadioWithValue(AVATAR_SELECTOR, options.showAvatar);
		selectRadioWithValue(PRIORITY_INBOX_SELECTOR, options.priorityInbox);
		
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
document.querySelectorAll(REMINDER_TREATMENT_SELECTOR).forEach(monitorChange);
document.querySelectorAll(BUNDLED_EMAIL_SELECTOR).forEach(monitorChange);
monitorChange(document.querySelector(BUNDLE_ONE_SELECTOR));
document.querySelectorAll(AVATAR_SELECTOR).forEach(monitorChange);
document.querySelectorAll(PRIORITY_INBOX_SELECTOR).forEach(monitorChange);
