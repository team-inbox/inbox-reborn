import { CLASSES } from './constants';
import { addClass, removeClass } from './utils';

let options = {};
export const getOptions = () => options;
export const reloadOptions = () => {
  chrome.runtime.sendMessage({ method: 'getOptions' }, ops => {
    options = ops || {};
  });

  // Add option classes to body for css styling, removes avatars when disabled
  if (options.showAvatar === 'enabled') {
    addClass(document.body, CLASSES.AVATAR_OPTION_CLASS);
  } else if (options.showAvatar === 'disabled') {
    removeClass(document.body, CLASSES.AVATAR_OPTION_CLASS);
    // Remove avatar elements
    document.querySelectorAll(`.${CLASSES.AVATAR_EMAIL_CLASS}`).forEach(emailEl => removeClass(emailEl, CLASSES.AVATAR_EMAIL_CLASS));
    document.querySelectorAll(`.${CLASSES.AVATAR_CLASS}`).forEach(avatarEl => avatarEl.remove());
  }

  // Add option classes to body for css styling, and unbundle emails when disabled
  if (options.emailBundling === 'enabled') {
    addClass(document.body, CLASSES.BUNDLING_OPTION_CLASS);
  } else if (options.emailBundling === 'disabled') {
    removeClass(document.body, CLASSES.BUNDLING_OPTION_CLASS);
    // Unbundle emails
    document.querySelectorAll(`.${CLASSES.BUNDLED_EMAIL_CLASS}`).forEach(emailEl => removeClass(emailEl, CLASSES.BUNDLED_EMAIL_CLASS));
    // Remove bundle wrapper rows
    document.querySelectorAll(`.${CLASSES.BUNDLE_WRAPPER_CLASS}`).forEach(bundleEl => bundleEl.remove());
  }
};
