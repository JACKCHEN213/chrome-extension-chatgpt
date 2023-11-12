$('#send-button').on('click', function () {
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
  hljs.initHighlightingOnLoad();
});

$(document).ready(function () {
  let messageList = $('#chat-content ul li div.chat-display-message');
  for (const messageElement of messageList) {
    let message = $(messageElement).html()
      .replace(/&quot;/g, '"')
      .replace(/&#96;/g, '`')
      .replace(/&#36;/g, '$')
      .replace(/&lt;/g, '<');
    $(messageElement).html(marked.parse(message));
  }
  hljs.initHighlightingOnLoad();
});

