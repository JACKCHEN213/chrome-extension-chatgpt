importScripts('js/tools.js');
importScripts('Config.js');

function addChatLog(message, token, model, type = 1) {
    fetch(`${BASE_URL}/${CHAT_LOG_URL}`, {
        method: 'POST',
        body: JSON.stringify({
            'message': message,
            'type': type,
            'model': model,
        }),
        headers: {
            'Content-Type': 'application/json;charset=utf8',
            'Authorization': token 
        }
    });
}

async function sendChatRequest(request, sender, sendResponse) {
    let account_info = await getChromeCache('account_info');
    /**
     * @see ACCOUNT_INFO_STRUCTURE
     */
    account_info = JSON.parse(atob(account_info));
    
    addChatLog(request.content, account_info.token, request.data.model, 1);
    
    fetch(`${account_info.openai_proxy}/${OPENAI_CHAT_URL}`, {
        method: 'POST',
        body: JSON.stringify(request.data),
        headers: {
            'Content-Type': 'application/json;charset=utf8',
            'Authorization': `Bearer ${account_info.openai_api_key}`
        },
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
            let storeSession = JSON.parse(await getChromeCache('store_session'));
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
                        addChatLog(content, account_info.token, request.data.model, 2);
                        await setChromeCache('refresh_flag', null);
                        return sendResponse({data: match});
                    }
                    storeSession = JSON.parse(await getChromeCache('store_session'));
                    chatSession = storeSession.session_list[storeSession.current_session];
                    for (const index in chatSession.topic_list) {
                        if (chatSession.topic_list[index].id === id) {
                            storeSession.session_list[storeSession.current_session].topic_list[index] = {
                                id: id,
                                content: content,
                                datetime: getCurrentDatetimeStr(),
                                role: role,
                            }
                            await setChromeCache('store_session', JSON.stringify(storeSession));
                            await setChromeCache('refresh_flag', '1');
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
}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.message === "chatRequestMessage") {
            sendChatRequest(request, sender, sendResponse).then();
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
            // setChromeCache('chat-loading', null);
        }
    }
});

