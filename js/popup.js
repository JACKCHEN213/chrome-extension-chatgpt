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

function init() {
  $('#send-button').on('click', sendMessage);
  marked.setOptions({
    highlight: function (code, language) {
      const validLanguage = hljs.getLanguage(language) ? language : 'javascript';
      return hljs.highlight(code, { language: validLanguage }).value;
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

  $(document).keydown(function (event) {
    if (event.ctrlKey && event.key === 'Enter') {
      sendMessage();
    }
  });
  $('#login-out').on('click', function () {
    window.location = 'login.html';
  });
}

$(document).ready(function () {
  init();
});
