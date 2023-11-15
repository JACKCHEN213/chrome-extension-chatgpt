

function init() {
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
        let password = $('#password').val().trim();
        let remember = $('#remember').get(0).checked;
        // $('#username-feedback').show();
        // $('#password-feedback').show();
        $.ajax({
            type: 'POST',
            url: 'http://192.168.24.20:3001/api/User/login',
            contentType: 'application/json;charset=utf8',
            data: JSON.stringify({
                username,
                password: btoa(md5(password))
            }),
            success: (data) => {
                if (data.success) {
                    console.log(data)
                    messageEx('登录成功', 'success', 500);
                } else {
                    messageEx(data.message, 'error');
                }
            }
        });
    });
}

$(document).ready(function () {
    init();
});
