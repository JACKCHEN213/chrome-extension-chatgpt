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
     *                     id: 唯一的id,
     *                     isFinish: 是否结束
     *                     isPreset: 是否预设
     *                 }
     *             ]
     *         }
     *     ]
     * }
     */
    let storeSession = await getLocalCache('store_session');
    if (!storeSession) {  // 初始化
        let mask = MASKS[0];
        storeSession = {
            current_session: 0,
            session_list: [{
                last_message: '',
                model: mask.model,
                title: mask.name,
                topic_list: deepCloneObject(mask.context),
            }],
        }
        await setLocalCache('store_session', JSON.stringify(storeSession));
    } else {
        storeSession = JSON.parse(storeSession);
    }
    return storeSession;
}

/**
 * 添加消息
 */
function appendMessage({message, datetime, role = 'user', liId = '', isInput = false}) {
    let avatar = 'images/icon-v.png';
    let isInputText = '';
    if (isInput) {
        isInputText = `<div class="${role === 'user' ? 'role-user' : 'role-gpt'}">
        <span style="font-size: 12px; color: #999">正在输入....</span>
      </div>`;
    }
    if (role === 'user') {
        avatar = 'images/user.png';
    }
    let element = $(`
    <li class="chat-item" ${liId ? 'id="' + liId + '"' : ''} data-value="${message}">
      <div class="${role === 'user' ? 'role-user' : 'role-gpt'}">
        <img class="avatar-24" src="${avatar}" alt="avatar" />
          <div>
            <a class="copy-item">
              <i class="bi bi-copy"></i>
              <span>复制</span>
            </a>
          </div>
      </div>
      ${isInputText}
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
    registerChatItem();
}

function setLoading() {
    let element = $(`<li class="chat-item">
      <div class="role-gpt">
        <img class="avatar-24" src="images/icon-v.png" alt="avatar">
      </div>
      <div class="role-gpt">
        <span style="font-size: 12px; color: #999">正在输入....</span>
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
async function chatRequest(storeSession, content) {
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
    let response = await sendRequestMessage({
        message: "chatRequestMessage",
        data: {
            messages: messages,
            model: currentSession.model,
            stream: true,
        },
        content,
    });
    if (response.error) {
        let msg = response.error;
        if (typeof response.error !== 'string') {
            msg = JSON.stringify(response.error);
        }
        confirmEx({
            title: '提示',
            message: msg,
            modal_size: 'modal-sm',
            body_height: '200px'
        });
    } else {
        refreshChatContent().then();
    }
}

function getCurrentInput() {
    let message = $('#message-input').val();
    if (!message) {
        return '';
    }
    return message.replace(/&quot;/g, '"')
        .replace(/&#96;/g, '`')
        .replace(/&#36;/g, '$')
        .replace(/&lt;/g, '<');
}

async function sendMessage(liId = '', isInput = false) {
    $('#chat-preview').remove();  // 移除当前存在的预览
    let message = getCurrentInput();
    if (!message) {
        await setLocalCache('current-input', null);
        return;
    }
    let currentDatetime = getCurrentDatetimeStr();
    appendMessage({
        message,
        datetime: currentDatetime,
        role: 'user',
        liId,
        isInput,
    });
    let chatContentTag = $('#chat-content');
    chatContentTag.scrollTop(chatContentTag[0].scrollHeight); // 滚动到底部
    await setLocalCache('current-input', message);

    if (isInput) {
        return;
    }
    $('#message-input').val('');
    await setLocalCache('current-input', null);

    // 缓存
    let storeSession = await getStoreSession();
    storeSession.session_list[storeSession.current_session].topic_list.push({
        content: message,
        role: 'user',
        datetime: currentDatetime,
        id: generateUUID(),
        isFinish: true,
        isPreset: false,
    });
    storeSession.session_list[storeSession.current_session].topic_list.push({
        content: '',
        role: 'loading',
        datetime: currentDatetime,
        id: generateUUID(),
        isFinish: false,
        isPreset: false,
    });
    storeSession.session_list[storeSession.current_session].last_message = message;
    $('b.topic-nums').html(storeSession.session_list[storeSession.current_session].topic_list.length);
    setLocalCache('store_session', JSON.stringify(storeSession)).then(async () => {
        await refreshChatContent();
    });
    await chatRequest(storeSession, message);
}

function loginOut() {
    setLocalCache('account_info', null).then(() => {
        window.location = 'login.html';
    });
}

async function initAuth() {
    if (!(await getLocalCache('account_info'))) {
        loginOut();
        return;
    }
    let response = await sendRequestMessage({
        message: "loginVerifyMessage",
    });
    if (response.error) {
        let msg = response.error;
        if (typeof response.error !== 'string') {
            msg = JSON.stringify(response.error);
        }
        confirmEx({
            title: '提示',
            message: msg,
            modal_size: 'modal-sm',
            body_height: '200px'
        });
    } else {
        let data = response.data;
        if (!data.success) {
            loginOut();
        }
    }
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
    await setLocalCache('store_session', JSON.stringify(storeSession));
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
            appendMessage({
                message: topic.content,
                datetime: topic.datetime,
                role: topic.role,
                isInput: !topic.isFinish
            });
        }
    }
    let message = await getLocalCache('current-input');
    if (message) {
        appendMessage({
            message,
            datetime: getCurrentDatetimeStr(),
            role: 'user',
            isInput: true,
            liId: 'chat-preview',
        })
    }
    $('b.topic-nums').html(topicList.length);
}

async function changeChatMask() {
    let storeSession = await getStoreSession();
    let changeIndex = parseInt($(this).data('index'));
    if (storeSession.current_session === changeIndex) {
        return;
    }
    storeSession.current_session = changeIndex;
    await setLocalCache('store_session', JSON.stringify(storeSession));
    refreshChatContent();
    initChatMaskList();
}

async function removeChatMask(ev) {
    ev.stopPropagation()
    let liTag = $(this).parent();
    let deleteIndex = parseInt(liTag.data('index'));
    let storeSession = await getStoreSession();
    if (deleteIndex < storeSession.current_session) {
        storeSession.current_session--;
    }
    storeSession.session_list.splice(deleteIndex, 1);
    await setLocalCache('store_session', JSON.stringify(storeSession));
    $(this).parent().remove();
}

async function initChatMaskList() {
    let storeSession = await getStoreSession();
    let element = '';
    for (const index in storeSession.session_list) {
        let selected = 'class="dropdown-item"';
        let closeBtn = `<button type="button" class="btn-close" aria-label="Close"></button>`;
        if (parseInt(index) === storeSession.current_session) {
            selected = 'class="dropdown-item active"';
            closeBtn = '';
        }
        element += `<li data-index="${index}" ${selected} style="display: flex; justify-content: space-between">
        ${storeSession.session_list[index].title}
        ${closeBtn}
        </li>`
    }
    $('#chat-mask-title').html(storeSession.session_list[storeSession.current_session].title);
    $('#chat-mask-menu').html(element);
    $('#chat-mask-menu li').unbind('click').on('click', changeChatMask);
    $('#chat-mask-menu li .btn-close').unbind('click').on('click', removeChatMask);
}

async function initOldData() {
    marked.setOptions({
        highlight: function (code, language) {
            const validLanguage = hljs.getLanguage(language) ? language : 'javascript';
            return hljs.highlight(code, {language: validLanguage}).value;
        }
    });
    initChatMaskList().then();
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

    let message = await getLocalCache('current-input');
    if (message) {
        $('#message-input').val(message);
    }
}

function userInput() {
    let chatContentTag = $('#chat-content');
    chatContentTag.scrollTop(chatContentTag[0].scrollHeight); // 滚动到底部
    sendMessage('chat-preview', true).then();
}

async function initKeydown(event) {
    let textareaTag = $('#message-input');
    let storeSession = await getStoreSession();
    if (event.ctrlKey && event.key === 'Enter') {
        sendMessage().then();
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

async function initClearCache() {
    let storeSession = await getStoreSession();
    let currentSession = storeSession.session_list[storeSession.current_session];
    for (let i = currentSession.topic_list.length - 1; i >= 0; i--) {
        if (!currentSession.topic_list[i].isPreset) {
            currentSession.topic_list.splice(i, 1);
        }
    }
    storeSession.session_list[storeSession.current_session] = currentSession;
    setLocalCache('store_session', JSON.stringify(storeSession)).then();
    setLocalCache('refresh_flag', null).then();
    $('#chat-content ul').html('');
    refreshChatContent().then();
}

async function initShowCache() {
    let storeSession = await getLocalCache('store_session');
    let msg = 'store_session: ' + jsonHighlight(JSON.parse(storeSession)) + '<br>';
    let refreshFlag = await getLocalCache('refresh_flag')
    msg += 'refresh_flag:' + refreshFlag + '<br>';
    let accountInfo = await getLocalCache('account_info');
    if (accountInfo) {
        msg += 'account_info:' + jsonHighlight(JSON.parse(atob(accountInfo))) + '<br>';
    }
    let loginInfo = await getLocalCache('login_info');
    if (loginInfo) {
        msg += 'login_info:' + jsonHighlight(JSON.parse(atob(loginInfo))) + '<br>';
    }
    let title = `全部缓存 - <a id="copy-all-cache" style="display: inline-block; width: 86px"><i class="bi bi-copy"></i>&nbsp;<span>复制缓存</span></a>`;
    confirmEx({
        title,
        message: msg,
        modal_size: 'modal-sm',
        body_height: '200px'
    });
    $('#copy-all-cache').on('click', function () {
        let message = {
            store_session: JSON.parse(storeSession),
            account_info: JSON.parse(atob(accountInfo)),
            login_info: JSON.parse(atob(loginInfo)),
            refresh_flag: refreshFlag
        };
        navigator.clipboard.writeText(JSON.stringify(message)).then(() => {
            messageEx('复制成功')
        });
    });
}

function registerChatItem() {
    $('.chat-item').unbind('mouseenter, mouseleave').on('mouseenter', function () {
        $(this).find('.copy-item').css('opacity', 1);
    }).on('mouseleave', function () {
        $(this).find('.copy-item').css('opacity', 0);
    });
    $('.copy-item').unbind('click').on('click', function () {
        let message = $(this).closest('li.chat-item').data('value');
        navigator.clipboard.writeText(message).then(() => {
            messageEx('复制成功')
        });
    });
}

async function addMask(maskIndex) {
    let storeSession = await getStoreSession();
    let mask = MASKS[maskIndex];
    if (undefined === mask) {
        messageEx('面具不存在', 'danger', 800);
        return false;
    }

    // 判断面具是否已添加
    for (const session of storeSession.session_list) {
        if (session.title === mask.name) {
            messageEx('面具已经添加了', 'danger', 800);
            return false;
        }
    }

    // 将面具添加到列表里面
    storeSession.session_list.push({
        last_message: '',
        model: mask.model,
        title: mask.name,
        topic_list: deepCloneObject(mask.context),
    });
    storeSession.current_session = storeSession.session_list.length - 1;
    await setLocalCache('store_session', JSON.stringify(storeSession));
    refreshChatContent();
    initChatMaskList();
    return true;
}

function showSelectMaskModal() {
    let element = `<div class="form-group">`;
    element += `<label class="form-label">请选择面具</label>`;
    element += `<select class="form-select" id="select-mask">`;
    for (const index in MASKS) {
        element += `<option value="${index}">${MASKS[index].name}</option>`
    }
    element += `</select>`;
    element += `</div>`;
    confirmEx({
        title: '添加面具',
        message: element,
        modal_size: 'modal-sm',
        body_height: '200px',
        confirm: '添加',
        callback: async result => {
            if (!result) {
                return true;
            }
            let maskIndex = parseInt($('#select-mask').val());
            $('#confirmExBody').html(`<div class="spinner-border text-primary" role="status"></div>`);
            result = await addMask(maskIndex);
            if (result) {
                return true;
            }
            return false;
        }
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
    registerChatItem();
    $('#chat-mask-tips').on('click', showSelectMaskModal);
}

function initRefresh() {
    setInterval(async () => {
        let refreshFlag = await getLocalCache('refresh_flag');
        if (refreshFlag) {
            // await setChromeCache('refresh_flag', null);
            await refreshChatContent();
        }
    }, 500);
}

function init() {
    registerChatItem();
    initAuth().then(async () => {
        await initOldData();
        registerListener();
        initRefresh();
    });
}

$(document).ready(function () {
    init();
});
