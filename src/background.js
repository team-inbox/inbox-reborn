chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method === 'getOptions') {
        chrome.storage.local.get('options', function(result) {
            const options = result.options || {};
            options.reminderTreatment = options.reminderTreatment || 'containing-word';
            options.emailBundling = options.emailBundling || 'enabled';
            options.showAvatar = options.showAvatar || 'enabled';

            sendResponse(options);
        });
        return true; // Indicates that sendResponse will be called asynchronously
    } else {
        sendResponse({});
    }
});
