// One live copy per document. Gmail's loading page rewrites itself with
// document.open(), and Chrome then injects the content scripts a second
// time, into a new isolated world, while the first copy's timers and window
// listeners live on (both copies logged the selector health check). Each
// copy stamps the document element with its own token as soon as it can;
// a copy that finds another token there is the older one and retires.
//
// Part of the content script. The files under src/content load in the order
// chrome.json and firefox.json list them and share one scope, so a binding
// declared here is visible to the files after it.

const INSTANCE_ATTR = 'data-inbox-reborn-instance';
const instanceToken = Math.random().toString(36).slice(2);
let instanceRetired = false;

const stampInstance = () => {
  const html = document.documentElement;
  if (html && !html.hasAttribute(INSTANCE_ATTR)) html.setAttribute(INSTANCE_ATTR, instanceToken);
};

// At document_start the <html> element may not exist yet; stamp it the
// moment it does, before anything else in the page can run
if (document.documentElement) {
  stampInstance();
} else if (typeof MutationObserver === 'function') {
  const waitForHtml = new MutationObserver(() => {
    if (!document.documentElement) return;
    stampInstance();
    waitForHtml.disconnect();
  });
  waitForHtml.observe(document, { childList: true });
}

/**
 * Whether this copy of the content script still owns the document. The
 * periodic timers stop and the listeners return early once it does not.
 * @returns {boolean}
 */
const instanceActive = () => {
  if (instanceRetired) return false;
  const stamp = document.documentElement?.getAttribute(INSTANCE_ATTR);
  if (stamp && stamp !== instanceToken) instanceRetired = true;
  return !instanceRetired;
};
