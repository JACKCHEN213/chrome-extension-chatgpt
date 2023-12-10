importScripts('js/tools.js');
importScripts('Config.js');

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.message === "chatRequestMessage") {
            sendChatRequestTool(request, sendResponse).then();
            return true;
        } else if (request.message === "logMessage") {
            console.log(request)
            return true;
        } else if (request.message === 'loginVerifyMessage') {
            loginVerifyTool(request, sendResponse).then();
            return true;
        } else if (request.message === 'loginMessage') {
            loginTool(request, sendResponse);
            return true; 
        }
    }
);

chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
        if (key === 'store_session') {
            // setChromeCache('chat-loading', null);
        }
    }
});

