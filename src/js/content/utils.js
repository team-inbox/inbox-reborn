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
export const startObserver = (observer, element, options, callback) => {
  if (observer) {
    observer.disconnect();
  }
  observer = new MutationObserver(callback);
  observer.observe(element, options);
  return observer;
};

export const querySelectorWithText = (selector, container = document) => {
  const element = container.querySelector(selector);
  return element ? { element, text: element.innerText } : {};
};
export const querySelectorText = (selector, container = document) => querySelectorWithText(selector, container).text;

export const htmlToElements = html => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstElementChild;
};

export const isTypable = element => {
  const role = element.getAttribute && element.getAttribute('role');
  return [ 'INPUT', 'TEXTAREA' ].includes(element.tagName) || (role === 'textbox');
};

export const pixelsToInt = pixels => (typeof pixels === 'number' ? pixels : parseInt(pixels.replace('px')));
export const addPixels = (...pixels) => {
  const pixelInt = pixels.reduce((pixel, pixelSum) => {
    pixelSum += pixelsToInt(pixel);
    return pixelSum;
  }, 0);
  return `${pixelInt}px`;
};

export const encodeBundleId = bundleId => encodeURIComponent(bundleId.replace(/[/\\& ]/g, '-'));

export const queryParentSelector = (el, selector) => {
  if (!el) {
    return null;
  }
  let parent = el.parentElement;
  while (parent && !parent.matches(selector)) {
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
export const isInInbox = () => document.location.hash.match(/#inbox/g) !== null;
export const isInBundle = () => document.location.hash.match(/#search\/in%3Ainbox\+label%3A/g) !== null;
export const getCurrentBundle = () => {
  const matches = document.location.hash.match(/#search\/in%3Ainbox\+label%3A(.*)\+-in%3Astarred/);
  return matches && matches[1];
};
export const checkImportantMarkers = () => document.querySelector(`${SELECTORS.EMAIL_ROW}:not(.${CLASSES.BUNDLE_WRAPPER_CLASS}) td.WA.xY`);
export const openBundle = bundleId => { window.location.href = `#search/in%3Ainbox+label%3A${bundleId}+-in%3Astarred`; };
export const openInbox = () => { window.location.href = '#inbox'; };

export const getMyEmailAddress = () => {
  const emailSelector = '.gb_rb';
  if (document.querySelector(emailSelector) && document.querySelector(emailSelector).innerText) {
    return document.querySelector(emailSelector).innerText;
  }
};
