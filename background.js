function getCurrentDatetimeStr(date = null) {
    if (!date) {
        date = new Date();
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.message === "sendRequest") {
            if (request.action === 'chat') {
                chrome.storage.local.set({'chat-loading': '1'});
            }
            fetch(request.url, {
                method: request.type,
                body: request.data,
                headers: request.headers,
            })
                .then(response => response.json())
                .then(data => {
                    if (request.action === 'chat') {
                        chrome.storage.local.set({'chat-loading': null});
                        if (data.success) {
                            let openaiData = data.data;
                            let choices = openaiData.choices;
                            chrome.storage.local.get(['store_session'], function (result) {
                                let storeSession = JSON.parse(result['store_session']);
                                for (const choice of choices) {
                                    let item = {
                                        content: choice.message.content,
                                        role: choice.message.role,
                                        datetime: getCurrentDatetimeStr(new Date(openaiData.created * 1000))
                                    };
                                    storeSession.session_list[storeSession.current_session].topic_list.push(item);
                                }
                                chrome.storage.local.set({'store_session': JSON.stringify(storeSession)});
                            });
                        }
                    }
                    return sendResponse({data: data});
                })
                .catch(error => sendResponse({error: error}));
            return true;
        } else if (request.message === "log") {
            console.log(request)
            return true;
        }
    }
);

chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (key === 'store_session') {
            chrome.storage.local.set({'chat-loading': null});
        }
    }
});

