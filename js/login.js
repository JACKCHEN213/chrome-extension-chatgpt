function initOldData() {
    let loginInfo = window.localStorage.getItem('login_info');
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
            url: 'http://192.168.24.20:3001/api/User/login',
            contentType: 'application/json;charset=utf8',
            data: JSON.stringify({
                username, password: btoa(md5(password))
            }),
            success: (data) => {
                if (data.success) {
                    let accountInfo = btoa(JSON.stringify(data.data));
                    window.localStorage.setItem('account_info', accountInfo);
                    if (remember) {
                        window.localStorage.setItem('login_info', btoa(JSON.stringify({
                            username, password
                        })));
                    }
                    toastr.success('登录成功');
                    window.location = 'popup.html';
                } else {
                    $('#username-feedback').html(data.message).show();
                }
            }
        });
    });
}

function init() {
    initOldData();
    registerListener();
}

$(document).ready(function () {
    init();
});
