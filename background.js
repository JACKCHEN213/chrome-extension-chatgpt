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

function generateUUID() {
    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    let uuid = Array(32).fill(null);
    let radix = chars.length;

    let timestamp = Date.now().toString(36);
    uuid.splice(0, timestamp.length, ...timestamp.split(''));

    for (let i = timestamp.length; i < 32; i++) {
        uuid[i] = chars[0 | Math.random()*radix];
    }

    return uuid.join('');
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
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    // 返回一个可读流
                    return response.body;
                })
                .then(async stream => {
                    const reader = stream.getReader();
                    let content = '';
                    let id = '';
                    let result = await chrome.storage.local.get(['store_session']);
                    let storeSession = JSON.parse(result['store_session']);
                    let chatSession = storeSession.session_list[storeSession.current_session];
                    for (const topic of chatSession.topic_list) {
                        if (topic.role === 'loading') {
                            id = topic.id;
                            break;
                        }
                    }

                    // 读取数据流
                    function read() {
                        return reader.read().then(async ({done, value}) => {
                            // 处理每个数据块
                            let text = new TextDecoder().decode(new Uint8Array(value));

                            let match;
                            let role = 'assistant';
                            let regex = /data: (.*?})\n/g;
                            while ((match = regex.exec(text)) !== null) {
                                try {
                                    let json = JSON.parse(match[1]);
                                    for (let choice of json.choices) {
                                        if (choice.delta.content) {
                                            content += choice.delta.content;
                                        }
                                        if (choice.delta.role) {
                                            role = choice.delta.role;
                                        }
                                    }
                                } catch (error) {
                                    console.log(`Invalid JSON string: ${match[1]}`);
                                }
                            }
                            // 检查是否读取完毕
                            if (done) {
                                console.log('已传输完毕', content);
                                await chrome.storage.local.set({'refresh_flag': null});
                                return sendResponse({data: match});
                            }
                            result = await chrome.storage.local.get(['store_session']);
                            storeSession = JSON.parse(result['store_session']);
                            chatSession = storeSession.session_list[storeSession.current_session];
                            for (const index in chatSession.topic_list) {
                                if (chatSession.topic_list[index].id === id) {
                                    storeSession.session_list[storeSession.current_session].topic_list[index] = {
                                        id: id,
                                        content: content,
                                        datetime: getCurrentDatetimeStr(),
                                        role: role,
                                    }
                                    await chrome.storage.local.set({'store_session': JSON.stringify(storeSession)});
                                    await chrome.storage.local.set({'refresh_flag': '1'});
                                    // 继续读取下一个数据块
                                    read();
                                    break;
                                }
                            }
                        });
                    }

                    // 开始读取数据流
                    read();
                    return true;
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
    for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
        if (key === 'store_session') {
            chrome.storage.local.set({'chat-loading': null});
        }
    }
});

