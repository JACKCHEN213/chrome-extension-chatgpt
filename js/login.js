async function initOldData() {
    let loginInfo = await getChromeCache('login_info');
    if (!loginInfo) {
        return;
    }
    loginInfo = JSON.parse(atob(loginInfo));
    $('#username').val(loginInfo.username);
    $('#password').val(loginInfo.password);
    $('#remember').attr('checked', 'checked');
}

function registerListener() {
    $('#password-eye').on('click', function () {
        if ($(this).hasClass('bi-eye-slash')) {  // 显示密码
            $(this).removeClass('bi-eye-slash').addClass('bi-eye');
            $('#password').attr('type', 'text');
        } else {  // 隐藏密码
            $(this).addClass('bi-eye-slash').removeClass('bi-eye');
            $('#password').attr('type', 'password');
        }
    });
    $('#login-btn').on('click', function () {
        let username = $('#username').val().trim();
        $('#username-feedback').hide();
        if (!username) {
            $('#username-feedback').html('用户名不能为空').show();
            return;
        }
        let password = $('#password').val().trim();
        $('#password-feedback').hide();
        if (!password) {
            $('#password-feedback').html('密码不能为空').show();
            return;
        }
        let remember = $('#remember').get(0).checked;
        $.ajax({
            type: 'POST',
            url: `${BASE_URL}/${LOGIN_URL}`,
            contentType: 'application/json;charset=utf8',
            data: JSON.stringify({
                username,
                password: btoa(md5(password))
            }),
            success: async (data) => {
                if (data.success) {
                    let accountInfo = btoa(JSON.stringify(data.data));
                    await setChromeCache('account_info', accountInfo);
                    if (remember) {
                        let loginInfo = btoa(JSON.stringify({
                            username,
                            password
                        }));
                        await setChromeCache('login_info', loginInfo);
                    }
                    messageEx('登录成功');
                    window.location = 'popup.html';
                } else {
                    $('#username-feedback').html(data.message).show();
                }
            }
        });
    });
}

function init() {
    initOldData().then();
    registerListener();
}

$(document).ready(function () {
    init();
});
