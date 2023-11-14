

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
}

$(document).ready(function () {
    init();
});
