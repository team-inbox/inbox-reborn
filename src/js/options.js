const REMINDER_TREATMENT_SELECTOR = 'input[name=reminder-treatment]';
const BUNDLED_EMAIL_SELECTOR = 'input[name=email-bundling]';
const AVATAR_SELECTOR = 'input[name=avatar]';
const BUNDLE_ONE_SELECTOR = 'input[name=bundle-one]';

function saveOptions() {
	const reminderTreatment = getSelectedRadioValue(REMINDER_TREATMENT_SELECTOR);
	const emailBundling = getSelectedRadioValue(BUNDLED_EMAIL_SELECTOR);
	const showAvatar = getSelectedRadioValue(AVATAR_SELECTOR);
	const bundleOne = getCheckboxState(BUNDLE_ONE_SELECTOR);

	const options = { reminderTreatment, emailBundling, showAvatar, bundleOne };

	localStorage.setItem('options', JSON.stringify(options));
}

function restoreOptions() {
	chrome.runtime.sendMessage({ method: 'getOptions' }, function(options) {
		selectRadioWithValue(REMINDER_TREATMENT_SELECTOR, options.reminderTreatment);
		selectRadioWithValue(BUNDLED_EMAIL_SELECTOR, options.emailBundling);
		selectRadioWithValue(AVATAR_SELECTOR, options.showAvatar);
		setCheckbox(BUNDLE_ONE_SELECTOR, options.bundleOne);
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
document.querySelectorAll(AVATAR_SELECTOR).forEach(monitorChange);
monitorChange(document.querySelector(BUNDLE_ONE_SELECTOR));
