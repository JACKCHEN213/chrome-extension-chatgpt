function sendMessage(liId = '' , clearInput = true) {
    $('#chat-preview').remove();  // 移除当前存在的预览
    let message = $('#message-input').val();
    if (!message) {
        return;
    }
    message.replace(/&quot;/g, '"')
        .replace(/&#96;/g, '`')
        .replace(/&#36;/g, '$')
        .replace(/&lt;/g, '<');
    let element = $(`
    <li class="chat-item" ${liId ? 'id="' + liId + '"' : ''}>
      <div class="role-man">
        <img class="avatar-24" src="images/icon.png" alt="avatar" />
      </div>
      <div class="chat-display-wrapper flex-row-reverse">
        <div class="chat-display-message chat-display-message-man">
          ${marked.parse(message)}
        </div>
      </div>
    </li>`);
    $('#chat-content ul').append(element);
    if (clearInput) {
        $('#message-input').val('');
    }

    hljs.highlightAll();
    hljs.initCopyButtonOnLoad();
    /**
     * 聊天记录缓存设计
     */
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
        data: JSON.stringify({ token: accountInfo.token }),
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

function chooseModel(chooseIndex) {
    let modelLi = $('ul#model-list li');
    let currentChooseTag = $('ul#model-list li.choose-model');
    currentChooseTag.removeClass('choose-model');
    currentChooseTag.find('input[type="radio"').remove();

    let chooseModelTag = $(modelLi.get(chooseIndex));
    chooseModelTag.addClass('choose-model');
    chooseModelTag.append(`<input type="radio" checked />`)

    let chooseModel = chooseModelTag.find('a.dropdown-item').html();
    $('#model-dropdown-toggle span').html(`&nbsp;&nbsp;${chooseModel}`);
    $('#model-dropdown-toggle').attr('title', chooseModel);
    $('ul#model-list').scrollTop(chooseIndex * 32);

    window.localStorage.setItem('chat-model', chooseModel);
    return chooseModel;
}

function initOldData() {
    marked.setOptions({
        highlight: function (code, language) {
            const validLanguage = hljs.getLanguage(language) ? language : 'javascript';
            return hljs.highlight(code, {language: validLanguage}).value;
        }
    });
    let messageList = $('#chat-content ul li div.chat-display-message');
    for (const messageElement of messageList) {
        let message = $(messageElement).html()
            .replace(/&quot;/g, '"')
            .replace(/&#96;/g, '`')
            .replace(/&#36;/g, '$')
            .replace(/&lt;/g, '<');
        $(messageElement).html(marked.parse(message));
    }
    hljs.highlightAll();
    hljs.initCopyButtonOnLoad();
    /**
     * 默认值初始化
     */
    let model = window.localStorage.getItem('chat-model');
    if (!model || !MODEL_LIST.includes(model)) {
        window.localStorage.setItem('chat-model', DEFAULT_MODEL);
        model = DEFAULT_MODEL;
    }
    
    let modelListTag = $('ul#model-list');
    modelListTag.html('');
    let chooseIndex = 0;
    for (const index in MODEL_LIST) {
        let _model = MODEL_LIST[index].toLowerCase();
        if (model.toLowerCase() === _model) {
            chooseIndex = index;
        }
        modelListTag.append($(`<li><a class="dropdown-item" style="cursor: pointer;">${_model}</a></li>`));
    }
    chooseModel(chooseIndex);
}

function registerListener() {
    $(document).keydown(function (event) {
        if (event.ctrlKey && event.key === 'Enter') {
            sendMessage();
        }
    });
    $('#message-input').on('input', () => {
        $('#chat-content').scrollTop($('#chat-content')[0].scrollHeight); // 滚动到底部
        sendMessage('chat-preview', false);
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
        chooseModel(this.value);
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
