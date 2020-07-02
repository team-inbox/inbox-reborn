// ---- HTML Elements ---- \\
export const observeForElement = (el, selector) => new Promise(
  resolve => {
    const observer = new MutationObserver(() => {
      const findEl = el.querySelector(selector);
      if (findEl) {
        observer.disconnect();
        resolve(findEl);
      }
    });
    observer.observe(el, { subtree: true, childList: true });
  }
);

export const htmlToElements = html => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstElementChild;
};

export const isTypable = element => {
  const role = element.getAttribute && element.getAttribute('role');
  return ['INPUT', 'TEXTAREA'].includes(element.tagName) || (role === 'textbox');
};

// ---- Classes ---- \\
export const hasClass = (element, className) => element.classList.contains(className);

export const addClass = (element, className) => {
  if (!hasClass(element, className)) {
    element.classList.add(className);
  }
};

export const removeClass = (element, className) => {
  if (hasClass(element, className)) {
    element.classList.remove(className);
  }
};

// ---- Gmail ---- \\
export const getTabs = () => Array.from(document.querySelectorAll('.aKz')).map(el => el.innerText);
export const isInInbox = () => document.querySelector('.nZ a[title=Inbox]') !== null;
export const isInBundle = () => document.location.hash.match(/#search\/in%3Ainbox\+label%3A/g) !== null;
export const checkImportantMarkers = () => document.querySelector('td.WA.xY');

export const getMyEmailAddress = () => {
  if (document.querySelector('.gb_tb') && document.querySelector('.gb_tb').innerText) {
    return document.querySelector('.gb_tb').innerText;
  }
};
