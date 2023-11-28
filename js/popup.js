let textareaLine = 0;

/**
 * 获取日期时间
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

function getStoreSession() {
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
     *                 }
     *             ]
     *         }
     *     ]
     * }
     */
    let storeSession = window.localStorage.getItem('store_session');
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
                    }
                ]
            }]
        }
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
    let element = $(`<li class="chat-item" id="chat-loading">
      <div class="role-gpt">
        <img class="avatar-24" src="images/icon.png" alt="avatar">
      </div>
      <div class="chat-display-wrapper ">
        <div class="chat-display-message">
          <div class="spinner-border spinner-grow-sm" role="status"></div>
        </div>
      </div>
    </li>`);
    $('#chat-content ul li#chat-loading').remove();
    $('#chat-content ul').append(element);
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
 * 发送请求
 */
function chatRequest() {
    window.localStorage.setItem('chat-loading', '1');
    setLoading();
    let storeSession = getStoreSession();
    let currentSession = deepCloneObject(storeSession.session_list[storeSession.current_session]);
    if (currentSession.topic_list.length > 10) {
        currentSession.topic_list = currentSession.topic_list.slice(-10);
    }
    $.ajax({
        type: 'POST',
        url: `${BASE_URL}/${MESSAGE_URL}`,
        contentType: 'application/json;charset=utf-8',
        data: JSON.stringify({
            messages: currentSession.topic_list,
            model: currentSession.model,
        }),
        success: function (data) {
            window.localStorage.removeItem('chat-loading');
            $('#chat-content ul li#chat-loading').remove();
            if (data.success) {
                let openaiData = data.data;
                let choices = openaiData.choices;
                storeSession = getStoreSession();
                for (const choice of choices) {
                    let item = {
                        content: choice.message.content,
                        role: choice.message.role,
                        datetime: getCurrentDatetimeStr(new Date(openaiData.created * 1000))
                    };
                    storeSession.session_list[storeSession.current_session].topic_list.push(item);
                    appendMessage(item.content, item.datetime, item.role);
                }
                window.localStorage.setItem('store_session', JSON.stringify(storeSession));
            } else {
                toastr.error(data.message);
            }
        },
        error: function (error) {
            console.error(error);
        }
    });
}

function sendMessage(liId = '', clearInput = true) {
    $('#chat-preview').remove();  // 移除当前存在的预览
    let message = $('#message-input').val();
    if (!message) {
        return;
    }
    let currentDatetime = getCurrentDatetimeStr();
    message = message.replace(/&quot;/g, '"')
        .replace(/&#96;/g, '`')
        .replace(/&#36;/g, '$')
        .replace(/&lt;/g, '<');
    appendMessage(message, currentDatetime, 'user', liId);

    if (!clearInput) {
        return;
    }
    $('#message-input').val('');
    textareaLine = 0;

    // 缓存
    let storeSession = getStoreSession();
    storeSession.session_list[storeSession.current_session].topic_list.push({
        content: message,
        role: 'user',
        datetime: currentDatetime
    });
    storeSession.session_list[storeSession.current_session].last_message = message;
    $('b.topic-nums').html(storeSession.session_list[storeSession.current_session].topic_list.length);
    window.localStorage.setItem('store_session', JSON.stringify(storeSession));
    chatRequest();
}

function loginOut() {
    window.localStorage.removeItem('account_info');
    window.location = 'login.html';
}

function initAuth() {
    let accountInfo = window.localStorage.getItem('account_info');
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
            loginOut();
        }
    })
}

function chooseModelByIndex(model) {
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

    let storeSession = getStoreSession();
    storeSession.session_list[storeSession.current_session].model = model;
    window.localStorage.setItem('store_session', JSON.stringify(storeSession));
}

function initOldData() {
    marked.setOptions({
        highlight: function (code, language) {
            const validLanguage = hljs.getLanguage(language) ? language : 'javascript';
            return hljs.highlight(code, {language: validLanguage}).value;
        }
    });
    let storeSession = getStoreSession();
    let chatSession = storeSession.session_list[storeSession.current_session];
    let topicList = chatSession.topic_list;
    for (const topic of topicList) {
        appendMessage(topic.content, topic.datetime, topic.role);
    }
    $('b.topic-nums').html(topicList.length);

    let model = chatSession.model.toLowerCase();
    let modelListTag = $('ul#model-list');
    modelListTag.html('');
    for (const index in MODEL_LIST) {
        let _model = MODEL_LIST[index].toLowerCase();
        modelListTag.append($(`<li><a class="dropdown-item" style="cursor: pointer;">${_model}</a></li>`));
    }
    chooseModelByIndex(model);
    let chatLoading = window.localStorage.getItem('chat-loading');
    if (chatLoading) {
        setLoading();
    }
}

function setTextareaLine(obj) {
    let value = $(obj).val();
    let cv = '';
    if ("selectionStart" in this) {
        cv = value.substring(0, obj.selectionStart);
    } else {
        let oSel = document.selection.createRange();
        oSel.moveStart('character', -obj.value.length);
        cv = oSel.text;
    }
    textareaLine = cv.split('\n').length - 1
}

function registerListener() {
    $(document).keydown(function (event) {
        let textareaTag = $('#message-input');
        let storeSession = getStoreSession();
        if (event.ctrlKey && event.key === 'Enter') {
            sendMessage();
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
        } else {
            // console.log(event);
        }
    });
    $('#message-input').on('input', function () {
        $('#chat-content').scrollTop($('#chat-content')[0].scrollHeight); // 滚动到底部
        sendMessage('chat-preview', false);
        setTextareaLine(this);
    });
    $('#send-button').on('click', sendMessage);
    $('#login-out').on('click', function () {
        window.localStorage.removeItem('account_info');
        window.location = 'login.html';
    });
    $('#model-dropdown-toggle').on('click', function () {
        let modelLi = $('ul#model-list li');
        let chooseIndex = 0;
        for (const index in modelLi) {
            if ($(modelLi[index]).hasClass('choose-model')) {
                chooseIndex = index;
                break;
            }
        }
        $('ul#model-list').scrollTop(chooseIndex * 32);
    });
    $('ul#model-list li').on('click', function () {
        chooseModelByIndex($(this).find('a.dropdown-item').html().trim());
    });
}

function init() {
    initAuth();
    initOldData();
    registerListener();
}

$(document).ready(function () {
    init();
});
