let textareaLine = 0;

async function getStoreSession() {
    /**
     * 聊天记录缓存设计
     * 存储介质: localStorage
     * 考虑方面:
     * 1. 保存所有聊天记录
     * 2. 多个聊天框支持
     * 结构设计:
     * {
     *     current_session: 当前聊天的索引,
     *     session_list: [ 所有聊天框
     *         {
     *             last_message: 最后发送的消息,
     *             model: 使用的模型,
     *             title: 对话框的标题,
     *             topic_list: [  消息列表
     *                 {
     *                     content: 显示的内容,
     *                     role: 说话的角色[],
     *                     datetime: 发送的日期时间(Y-m-d H:i:s, 2012-07-12 11:35:42)
     *                     id: 唯一的id
     *                 }
     *             ]
     *         }
     *     ]
     * }
     */
    let storeSession = await getChromeCache('store_session');
    if (!storeSession) {  // 初始化
        storeSession = {
            current_session: 0,
            session_list: [{
                last_message: '',
                model: DEFAULT_MODEL,
                title: 'ChatGPT助手',
                topic_list: [
                    {
                        content: '你好',
                        role: 'system',  // assistant, user
                        datetime: getCurrentDatetimeStr(),
                        id: generateUUID(),
                    }
                ]
            }],
        }
        await setChromeCache('store_session', JSON.stringify(storeSession));
    } else {
        storeSession = JSON.parse(storeSession);
    }
    return storeSession;
}

/**
 * 添加消息
 * @param message
 * @param datetime
 * @param role
 * @param liId
 */
function appendMessage(message, datetime, role = 'user', liId = '') {
    let element = $(`
    <li class="chat-item" ${liId ? 'id="' + liId + '"' : ''}>
      <div class="${role === 'user' ? 'role-user' : 'role-gpt'}">
        <img class="avatar-24" src="images/icon.png" alt="avatar" />
      </div>
      <div class="chat-display-wrapper ${role === 'user' ? 'flex-row-reverse' : ''}">
        <div class="chat-display-message${role === 'user' ? ' chat-display-message-man' : ''}">
          ${marked.parse(message)}
        </div>
      </div>
      <div class="chat-time-wrapper">
        <div class="chat-time">
          ${datetime}
        </div>
      </div>
    </li>`);
    $('#chat-content ul').append(element);

    hljs.highlightAll();
    hljs.initCopyButtonOnLoad();
}

function setLoading() {
    let element = $(`<li class="chat-item">
      <div class="role-gpt">
        <img class="avatar-24" src="images/icon.png" alt="avatar">
      </div>
      <div class="chat-display-wrapper ">
        <div class="chat-display-message">
          <div class="spinner-border spinner-grow-sm" role="status"></div>
        </div>
      </div>
    </li>`);
    $('#chat-content ul').append(element);
    let chatContentTag = $('#chat-content');
    chatContentTag.scrollTop(chatContentTag[0].scrollHeight); // 滚动到底部
}

/**
 * 发送请求
 */
async function chatRequest(storeSession) {
    let currentSession = storeSession.session_list[storeSession.current_session];
    // if (currentSession.topic_list.length > 10) {
    //     currentSession.topic_list = currentSession.topic_list.slice(-10);
    // }
    let messages = [];
    for (const topic of currentSession.topic_list) {
        if (topic.role === 'loading') {
            continue;
        }
        messages.push({
            role: topic.role,
            content: topic.content,
        })
    }
    chrome.runtime.sendMessage({
        message: "sendRequest",
        type: 'POST',
        url: `${PROXY_URL}/${REAL_CHAT_URL}`,
        data: JSON.stringify({
            messages: messages,
            model: currentSession.model,
            stream: true,
        }),
        headers: {
            'Content-Type': 'application/json;charset=utf8',
            'Authorization': `Bearer ${OPENAI_KEY}`
        },
        action: 'chat',
    }, function (response) {
        refreshChatContent();
    });
}

async function sendMessage(liId = '', clearInput = true) {
    $('#chat-preview').remove();  // 移除当前存在的预览
    let messageInputTag = $('#message-input');
    let message = messageInputTag.val();
    if (!message) {
        return;
    }
    let currentDatetime = getCurrentDatetimeStr();
    message = message.replace(/&quot;/g, '"')
        .replace(/&#96;/g, '`')
        .replace(/&#36;/g, '$')
        .replace(/&lt;/g, '<');
    appendMessage(message, currentDatetime, 'user', liId);
    let chatContentTag = $('#chat-content');
    chatContentTag.scrollTop(chatContentTag[0].scrollHeight); // 滚动到底部

    if (!clearInput) {
        return;
    }
    messageInputTag.val('');
    textareaLine = 0;

    // 缓存
    let storeSession = await getStoreSession();
    storeSession.session_list[storeSession.current_session].topic_list.push({
        content: message,
        role: 'user',
        datetime: currentDatetime,
        id: generateUUID(),
    });
    storeSession.session_list[storeSession.current_session].topic_list.push({
        content: '',
        role: 'loading',
        datetime: currentDatetime,
        id: generateUUID(),
    });
    storeSession.session_list[storeSession.current_session].last_message = message;
    $('b.topic-nums').html(storeSession.session_list[storeSession.current_session].topic_list.length);
    setChromeCache('store_session', JSON.stringify(storeSession)).then(async () => {
        await refreshChatContent();
    });
    await chatRequest(storeSession);
}

function loginOut() {
    setChromeCache('account_info', null).then(() => {
        window.location = 'login.html';
    });
}

async function initAuth() {
    let accountInfo = await getChromeCache('account_info');
    if (!accountInfo) {
        loginOut();
        return;
    }
    accountInfo = JSON.parse(atob(accountInfo));
    $.ajax({
        type: 'POST',
        url: `${BASE_URL}/${AUTH_URL}`,
        contentType: 'application/json;charset=utf8',
        async: false,
        data: JSON.stringify({token: accountInfo.token}),
        success: (data) => {
            if (data.success) {
                //
            } else {
                loginOut();
            }
        },
        error: (error) => {
            console.log(error)
            loginOut();
        }
    })
}

async function chooseModelByIndex(model) {
    let modelLi = $('ul#model-list li');
    let currentChooseTag = $('ul#model-list li.choose-model');
    currentChooseTag.removeClass('choose-model');
    currentChooseTag.find('input[type="radio"').remove();
    let chooseIndex = 0;
    for (const index in MODEL_LIST) {
        if (model === MODEL_LIST[index]) {
            chooseIndex = index;
            $(modelLi.get(index)).addClass('choose-model');
            $(modelLi.get(index)).append(`<input type="radio" checked />`);
            break;
        }
    }

    $('#model-dropdown-toggle span').html(`&nbsp;&nbsp;${model}`);
    $('#model-dropdown-toggle').attr('title', model);
    $('ul#model-list').scrollTop(chooseIndex * 32);

    let storeSession = await getStoreSession();
    storeSession.session_list[storeSession.current_session].model = model;
    await setChromeCache('store_session', JSON.stringify(storeSession));
}

async function refreshChatContent() {
    let storeSession = await getStoreSession();
    let chatSession = storeSession.session_list[storeSession.current_session];
    let topicList = chatSession.topic_list;
    $('#chat-content ul').html('');
    for (const topic of topicList) {
        if (topic.role === 'loading') {
            setLoading();
        } else {
            appendMessage(topic.content, topic.datetime, topic.role);
        }
    }
    $('b.topic-nums').html(topicList.length);
}

async function initOldData() {
    marked.setOptions({
        highlight: function (code, language) {
            const validLanguage = hljs.getLanguage(language) ? language : 'javascript';
            return hljs.highlight(code, {language: validLanguage}).value;
        }
    });
    refreshChatContent().then();
    let chatContentTag = $('#chat-content');
    chatContentTag.scrollTop(chatContentTag[0].scrollHeight); // 滚动到底部

    /**
     * 初始化模型
     */
    let storeSession = await getStoreSession();
    let chatSession = storeSession.session_list[storeSession.current_session];
    let model = chatSession.model.toLowerCase();
    let modelListTag = $('ul#model-list');
    modelListTag.html('');
    for (const index in MODEL_LIST) {
        let _model = MODEL_LIST[index].toLowerCase();
        modelListTag.append($(`<li><a class="dropdown-item" style="cursor: pointer;">${_model}</a></li>`));
    }
    await chooseModelByIndex(model);
}

function setTextareaLine(obj) {
    let value = $(obj).val();
    let cv;
    if ("selectionStart" in this) {
        cv = value.substring(0, obj.selectionStart);
    } else {
        let oSel = document.selection.createRange();
        oSel.moveStart('character', -obj.value.length);
        cv = oSel.text;
    }
    textareaLine = cv.split('\n').length - 1
}

function userInput() {
    let objet = $('#message-input').get(0);
    let chatContentTag = $('#chat-content');
    chatContentTag.scrollTop(chatContentTag[0].scrollHeight); // 滚动到底部
    sendMessage('chat-preview', false).then();
    setTextareaLine(objet);
}

async function initKeydown(event) {
    let textareaTag = $('#message-input');
    let storeSession = await getStoreSession();
    if (event.ctrlKey && event.key === 'Enter') {
        sendMessage().then();
    } else if (event.key === 'Tab') {
        if (textareaTag.is(':focus')) {
            event.preventDefault()
            let value = textareaTag.val();
            if (event.shiftKey) {
                if (!value) {
                    return;
                }
                let textList = value.split('\n');
                let replaceContent = textList[textareaLine];
                let allChar = replaceContent.split('');
                for (let i = 0; i < 4; i++) {
                    if (allChar[0] === ' ') {
                        allChar.shift();
                    }
                }
                textList[textareaLine] = allChar.join('');
                textareaTag.val(textList.join('\n'));
            } else {
                textareaTag.val(value + '    ');
            }
        }
    } else if (event.key === 'ArrowUp') {
        if (textareaTag.is(':focus')) {
            let lastMessage = storeSession.session_list[storeSession.current_session].last_message;
            if (lastMessage) {
                textareaTag.val(lastMessage);
            }
        }
        userInput();
    } else {
        // console.log(event);
    }
}

function initModelToggle() {
    let modelLi = $('ul#model-list li');
    let chooseIndex = 0;
    for (const index in modelLi) {
        if ($(modelLi[index]).hasClass('choose-model')) {
            chooseIndex = index;
            break;
        }
    }
    $('ul#model-list').scrollTop(chooseIndex * 32);
}

function initModelSelect() {
    chooseModelByIndex($(this).find('a.dropdown-item').html().trim()).then();
}

function initClearCache() {
    chrome.storage.local.clear();
    $('#chat-content ul').html('');
    refreshChatContent().then();
}

async function initShowCache() {
    let storeSession = await getChromeCache('store_session');
    let msg = 'store_session: ' + jsonHighlight(JSON.parse(storeSession)) + '<br>';
    let refreshFlag = await getChromeCache('refresh_flag')
    msg += 'refresh_flag:' + refreshFlag + '<br>';
    let accountInfo = await getChromeCache('account_info');
    msg += 'account_info:' + jsonHighlight(JSON.parse(atob(accountInfo))) + '<br>';
    let loginInfo = await getChromeCache('login_info');
    msg += 'login_info:' + jsonHighlight(JSON.parse(atob(loginInfo))) + '<br>';
    confirmEx({
        title: '全部缓存',
        message: msg,
        modal_size: 'modal-sm',
        body_height: '200px'
    });
}

function registerListener() {
    $(document).keydown(initKeydown);
    $('#message-input').on('input change', userInput);
    $('#send-button').on('click', sendMessage);
    $('#login-out').on('click', loginOut);
    $('#model-dropdown-toggle').on('click', initModelToggle);
    $('ul#model-list li').on('click', initModelSelect);
    $('a#clear-cache-toggle').on('click', initClearCache);
    $('a#show-cache-toggle').on('click', initShowCache);
}

function initRefresh() {
    setInterval(async () => {
        let refreshFlag = await getChromeCache('refresh_flag');
        if (refreshFlag) {
            // await setChromeCache('refresh_flag', null);
            await refreshChatContent();
        }
    }, 100);
}

function init() {
    initAuth().then(() => {
        initOldData().then();
        registerListener();
        initRefresh();
    });
}

$(document).ready(function () {
    init();
});
