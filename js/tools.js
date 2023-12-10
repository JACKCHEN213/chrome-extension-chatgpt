function jsonHighlight(str) {
    if (typeof str !== 'string') {
        str = JSON.stringify(str, undefined, 2)
    }
    str = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/ /g, '&nbsp;')
    return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number'
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key'
            } else {
                cls = 'string'
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean'
        } else if (/null/.test(match)) {
            cls = 'null'
        }
        return '<span class="' + cls + '">' + match + '</span>'
    })
}

function deepCloneObject(target, hash = new WeakMap()) {
    if (!(target !== null && typeof target === 'object')) {
        return target;
    }

    if (hash.get(target)) {
        return hash.get(target);
    }

    let newObj = Array.isArray(target) ? [] : {};
    hash.set(target, newObj);

    for (let key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
            if ((target[key] !== null && typeof target[key] === 'object')) {
                // 如果是{}则转成[]
                if (JSON.stringify(target[key]) === '{}') {
                    newObj[key] = [];
                } else {
                    // 递归拷贝
                    newObj[key] = deepCloneObject(target[key], hash);
                }
            } else {
                if (target[key].toString() === parseInt(target[key]).toString()) { // 判断是否为纯数字字符串
                    newObj[key] = parseInt(target[key]);
                } else if (target[key] === null) { // 判断是否为null
                    newObj[key] = '';
                } else {
                    newObj[key] = target[key];
                }
            }
        }
    }

    return newObj;
}

/**
 * 获取日期时间
 * @param {Date} date
 * @return {*}
 */
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

async function getLocalStorageCache(key) {
    if (null === key) {
        return window.localStorage;
    }
    return window.localStorage.getItem(key);
}

async function getChromeLocalCache(key) {
    if (key === null) {
        return await chrome.storage.local.get(null);
    }
    let chromeCache = await chrome.storage.local.get([key]);
    return chromeCache[key];
}

async function getLocalCache(key) {
    if (1 === WORK_SCENE) {
        return await getChromeLocalCache(key);
    } else {
        return await getLocalStorageCache(key);
    }
}

async function setLocalStorageCache(key, value) {
    window.localStorage.setItem(key, value);
}

async function setChromeLocalCache(key, value) {
    let data = {};
    data[key] = value;
    await chrome.storage.local.set(data);
}

async function setLocalCache(key, value) {
    if (1 === WORK_SCENE) {
        await setChromeLocalCache(key, value);
    } else {
        await setLocalStorageCache(key, value);
    }
}

function addChatLogTool(message, token, model, type = 1) {
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

async function sendChatRequestTool(request, sendResponse = null) {
    try {
        let accountInfo = await getLocalCache('account_info');
        /**
         * @see ACCOUNT_INFO_STRUCTURE
         */
        accountInfo = JSON.parse(atob(accountInfo));

        addChatLogTool(request.content, accountInfo.token, request.data.model, 1);

        let response = await fetch(`${accountInfo.openai_proxy}/${OPENAI_CHAT_URL}`, {
            method: 'POST',
            body: JSON.stringify(request.data),
            headers: {
                'Content-Type': 'application/json;charset=utf8',
                'Authorization': `Bearer ${accountInfo.openai_api_key}`
            },
        });

        if (!response.ok) {
            if (sendResponse) {
                sendResponse({error: `HTTP error! status: ${response.status}`});
            } else {
                return {error: `HTTP error! status: ${response.status}`};
            }
        }
        const reader = response.body.getReader();
        let content = '';
        let id = '';
        let storeSession = JSON.parse(await getLocalCache('store_session'));
        let chatSession = storeSession.session_list[storeSession.current_session];
        for (const topic of chatSession.topic_list) {
            if (topic.role === 'loading') {
                id = topic.id;
                break;
            }
        }

        let match;
        let role = 'assistant';
        while (true) {
            const { done, value } = await reader.read();
            // 处理每个数据块
            let text = new TextDecoder().decode(new Uint8Array(value));
            let isDone = /data: \[DONE]/g.exec(text)

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
                break;
            }
            storeSession = JSON.parse(await getLocalCache('store_session'));
            chatSession = storeSession.session_list[storeSession.current_session];
            for (const index in chatSession.topic_list) {
                if (chatSession.topic_list[index].id === id) {
                    storeSession.session_list[storeSession.current_session].topic_list[index] = {
                        id: id,
                        content: content,
                        datetime: getCurrentDatetimeStr(),
                        role: role,
                        isFinish: !!isDone,
                    }
                    await setLocalCache('store_session', JSON.stringify(storeSession));
                    await setLocalCache('refresh_flag', '1');
                    // 继续读取下一个数据块
                    break;
                }
            }
        }
        console.log('已传输完毕', content);
        addChatLogTool(content, accountInfo.token, request.data.model, 2);
        await setLocalCache('refresh_flag', null);
        if (sendResponse) {
            return sendResponse({data: match});
        } else {
            return {data: match};
        }
    } catch (error) {
        if (sendResponse) {
            sendResponse({error});
        } else {
            return {error};
        }
    }
}

async function loginVerifyTool(request, sendResponse = null) {
    try {
        let accountInfo = await getLocalCache('account_info');
        /**
         * @see ACCOUNT_INFO_STRUCTURE
         */
        accountInfo = JSON.parse(atob(accountInfo));
        let response = await fetch(`${BASE_URL}/${LOGIN_VERIFY_URL}`, {
            method: 'POST',
            body: JSON.stringify({
                token: accountInfo.token
            }),
            headers: {
                'Content-Type': 'application/json;charset=utf8',
            }
        });
        if (!response.ok) {
            if (sendResponse) {
                sendResponse({error: `HTTP error! status: ${response.status}`});
            } else {
                return {error: `HTTP error! status: ${response.status}`};
            }
        }
        let data = await response.json();
        if (sendResponse) {
            sendResponse({data});
        } else {
            return {data};
        }
    } catch (error) {
        if (sendResponse) {
            sendResponse({error});
        } else {
            return {error};
        }
    }
}

async function loginTool(request, sendResponse = null) {
    try {
        let response = await fetch(`${BASE_URL}/${LOGIN_URL}`, {
            method: 'POST',
            body: JSON.stringify(request.data),
            headers: {
                'Content-Type': 'application/json;charset=utf8',
            }
        });
        if (!response.ok) {
            if (sendResponse) {
                sendResponse({error: `HTTP error! status: ${response.status}`});
            } else {
                return {error: `HTTP error! status: ${response.status}`};
            }
        }
        let data = await response.json();
        if (sendResponse) {
            sendResponse({data});
        } else {
            return {data};
        }
    } catch (error) {
        if (sendResponse) {
            sendResponse({error});
        } else {
            return {error};
        }
    }
}

async function sendChromeRuntimeMessage(request) {
    return await chrome.runtime.sendMessage(request);
}

async function sendRequestMessage(request) {
    if (request.message === "chatRequestMessage") {
        if (1 === WORK_SCENE) {
            return await sendChromeRuntimeMessage(request);
        } else {
            return await sendChatRequestTool(request);
        }
    } else if (request.message === "logMessage") {
        if (1 === WORK_SCENE) {
            return await sendChromeRuntimeMessage(request);
        } else {
            console.log(request)
            return true;
        }
    } else if (request.message === 'loginVerifyMessage') {
        if (1 === WORK_SCENE) {
            return await sendChromeRuntimeMessage(request);
        } else {
            return await loginVerifyTool(request);
        }
    } else if (request.message === 'loginMessage') {
        if (1 === WORK_SCENE) {
            return await sendChromeRuntimeMessage(request);
        } else {
            return await loginTool(request);
        }
    }
}
