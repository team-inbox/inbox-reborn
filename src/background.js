// Polyfill for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

/* Stock Inbox: the settings that make Gmail look and behave like Inbox did.
   While the Stock Inbox switch is on, these win over the stored values;
   changing any of them in the options turns the switch off. Dark mode,
   reminders and the Priority Inbox headings aren't part of it - Inbox had no
   say in those. Neither is Gravatar: it shares a hashed address with
   Gravatar, so it stays off until someone turns it on - turning Stock Inbox
   on in the options does (options/script.js), new installs don't. */
const STOCK_INBOX = {
  emailBundling: 'enabled',
  bundleOne: true,
  bundleToday: false,
  bundlePurchases: true,
  bundleTravel: true,
  bundleFinance: true,
  showAvatar: 'enabled',
  hideDateTime: 'enabled',
  hideAiInbox: 'enabled',
  hideAllMail: 'enabled',
  hideTravel: 'disabled',
  hideFinance: 'disabled',
};

browserAPI.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.method === 'getOptions') {
    browserAPI.storage.local.get('options', function (result) {
      // New installs start on Stock Inbox; installs from before the switch
      // existed keep the settings they chose
      const options = { stockInbox: result.options ? 'disabled' : 'enabled', ...result.options };
      options.reminderTreatment = options.reminderTreatment || 'containing-word';
      options.emailBundling = options.emailBundling || 'enabled';
      options.showAvatar = options.showAvatar || 'enabled';
      if (options.stockInbox === 'enabled') Object.assign(options, STOCK_INBOX);

      sendResponse(options);
    });
    return true; // Indicates that sendResponse will be called asynchronously
  } else if (request.method === 'getStockInbox') {
    sendResponse(STOCK_INBOX);
  } else {
    sendResponse({});
  }
});
