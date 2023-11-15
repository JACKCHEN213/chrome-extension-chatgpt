function sendMessage() {
    let message = $('#message-input').val();
    if (!message) {
        return;
    }
    message.replace(/&quot;/g, '"')
        .replace(/&#96;/g, '`')
        .replace(/&#36;/g, '$')
        .replace(/&lt;/g, '<');
    let element = $(`
    <li class="chat-item">
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
    $('#message-input').val('');
    hljs.highlightAll();
    hljs.initCopyButtonOnLoad();
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
        url: 'http://192.168.24.20:3001/api/User/verify',
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
}

function registerListener() {
    $('#send-button').on('click', sendMessage);
    $(document).keydown(function (event) {
        if (event.ctrlKey && event.key === 'Enter') {
            sendMessage();
        }
    });
    $('#login-out').on('click', function () {
        window.localStorage.removeItem('account_info');
        window.location = 'login.html';
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
