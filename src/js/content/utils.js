import { CLASSES, SELECTORS } from './constants';

// ---- HTML Elements ---- \\
export const observeForCondition = (el, condition) => new Promise(
  resolve => {
    let satisfied = condition();
    if (satisfied) {
      resolve(satisfied);
    }
    const observer = new MutationObserver(() => {
      satisfied = condition();
      if (satisfied) {
        observer.disconnect();
        resolve(satisfied);
      }
    });
    if (el) {
      observer.observe(el, { subtree: true, childList: true });
    }
  }
);

export const observeForElement = (el, selector) => observeForCondition(el, () => el && el.querySelector(selector));
export const observeForRemoval = (el, selector) => observeForCondition(el, () => !el || !el.querySelector(selector));

export const htmlToElements = html => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstElementChild;
};

export const isTypable = element => {
  const role = element.getAttribute && element.getAttribute('role');
  return ['INPUT', 'TEXTAREA'].includes(element.tagName) || (role === 'textbox');
};

// export const pixelsToInt = pixels => (typeof pixels === 'number' ? pixels : parseInt(pixels.replace('px')));
// export const addPixels = (pixel1, pixel2) => `${pixelsToInt(pixel1) + pixelsToInt(pixel2)}px`;

export const queryParentSelector = (el, selector) => {
  if (!el) {
    return null;
  }
  let parent = el.parentElement;
  while (!parent.matches(selector)) {
    parent = parent.parentElement;
    if (!parent) {
      return null;
    }
  }
  return parent;
};

// ---- Classes ---- \\
export const hasClass = (element, className) => element && element.classList.contains(className);

export const addClass = (element, className) => {
  if (element && !hasClass(element, className)) {
    element.classList.add(className);
  }
};

export const removeClass = (element, className) => {
  if (element && hasClass(element, className)) {
    element.classList.remove(className);
  }
};

// ---- Gmail ---- \\
export const getTabs = () => Array.from(document.querySelectorAll('.aKz')).map(el => el.innerText);
export const isInInbox = () => document.querySelector('.nZ a[title=Inbox]') !== null;
export const isInBundle = () => document.location.hash.match(/#search\/in%3Ainbox\+label%3A/g) !== null;
export const getCurrentBundle = () => document.location.hash.replace('#search/in%3Ainbox+label%3A', '');
export const checkImportantMarkers = () => document.querySelector(`${SELECTORS.EMAIL_ROW}:not(.${CLASSES.BUNDLE_WRAPPER_CLASS}) td.WA.xY`);
export const openBundle = bundleId => { window.location.href = `#search/in%3Ainbox+label%3A${bundleId}`; };
export const openInbox = () => { window.location.href = '#inbox'; };

export const getMyEmailAddress = () => {
  if (document.querySelector('.gb_tb') && document.querySelector('.gb_tb').innerText) {
    return document.querySelector('.gb_tb').innerText;
  }
};
