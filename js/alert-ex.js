/**
 * 确认框
 * @param {Object} params
 * @param {String} params.modal_size 弹窗大小['modal-sm', 'modal-lg', 'modal-xl']
 * @param {String} params.title
 * @param {String} params.message
 * @param {String} params.confirm
 * @param {String} params.cancel
 * @param {Function} params.callback
 */
function confirmEx(params) {
    let modal_size = params.modal_size !== undefined ? params.modal_size : '';
    const modalElemet = $(`
    <div class="modal fade" id="confirmEx" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1"
        aria-labelledby="addAppLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered ${modal_size}">
            <div class="modal-content">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="confirmExHeader">${params.title !== undefined ? params.title : '确认框'}</h1>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" id="confirmExBody" style="max-height: cal(100vh - 600px); overflow-y: auto;">
                ${params.message !== undefined && params.message}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="confirmExCancel" data-bs-dismiss="modal">${params.cancel !== undefined ? params.cancel : '取消'}</button>
                    <button type="button" class="btn btn-primary" id="confirmExConfirm">${params.confirm !== undefined ? params.confirm : '确定'}</button>
                </div>
            </div>
        </div>
    </div>`);
    $('body').append(modalElemet);
    modalElemet.modal('show');

    $("#confirmExCancel").click(() => {
        modalElemet.modal('hide').remove();
        params.callback !== undefined && params.callback(false);
    });
    $("#confirmExConfirm").click(() => {
        modalElemet.modal('hide').remove();
        params.callback !== undefined && params.callback(true);
    });
}

/**
 * 弹出消息框
 * @param msg 消息内容
 * @param type 消息框类型（参考bootstrap的alert）
 * @return object
 */
function alertEx(msg, type = 'success') {
    if (typeof (msg) !== 'string') {
        msg = JSON.stringify(msg);
    }
    // 创建bootstrap的alert元素
    const divElement = $("<div></div>")
        .addClass('alert')
        .addClass('alert-' + type)
        .addClass('alert-dismissible')
        .addClass('d-flex')
        .addClass('align-items-center')
        .attr('role', 'alert');
    divElement.css({ // 消息框的定位样式
        "position": "fixed",
        "top": "80px",
        "right": "20px",
        "z-index": "2000"
    });
    // 设置图标
    if (type === 'danger') {
        divElement.append($('<i class="bi bi-exclamation-triangle-fill"></i>'))
    }
    // 设置消息框的内容
    const divMsg = $("<div></div>").html(msg);
    $(divElement).append(divMsg);
    // 消息框添加可以关闭按钮
    const closeBtn = $('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
    $(divMsg).append(closeBtn);
    // 消息框放入到页面中
    $('body').append(divElement);
    return divElement;
}

/**
 * 短暂显示后上浮消失的消息框
 * @param msg 消息内容
 * @param type 消息框类型
 * @param timeout
 */
function messageEx(msg, type = 'success', timeout = 1000) {
    if (type == 'error') {
        type = 'danger';
    }
    const divElement = alertEx(msg, type); // 生成Alert消息框
    let isIn = false; // 鼠标是否在消息框中

    divElement.on({ // 在setTimeout执行之前先判定鼠标是否在消息框中
        mouseover: function () {
            isIn = true;
        },
        mouseout: function () {
            isIn = false;
        }
    });

    // 短暂延时后上浮消失
    setTimeout(function () {
        const IntervalMS = 20; // 每次上浮的间隔毫秒
        const floatSpace = 60; // 上浮的空间(px)
        let nowTop = divElement.offset().top; // 获取元素当前的top值
        const stopTop = nowTop - floatSpace;    // 上浮停止时的top值
        divElement.fadeOut(IntervalMS * floatSpace); // 设置元素淡出

        let upFloat = setInterval(function () {
            // 开始上浮
            if (nowTop >= stopTop) { // 判断当前消息框top是否还在可上升的范围内
                divElement.offset({"top": nowTop--}); // 消息框的top上升1px
            } else {
                clearInterval(upFloat); // 关闭上浮
                divElement.remove();    // 移除元素
            }
        }, IntervalMS);

        if (isIn) { // 如果鼠标在setTimeout之前已经放在的消息框中，则停止上浮
            clearInterval(upFloat);
            divElement.stop();
        }

        divElement.hover(function () {
            // 鼠标悬浮时停止上浮和淡出效果，过后恢复
            clearInterval(upFloat);
            // divElement.stop();
        }, function () {
            divElement.fadeOut(IntervalMS * (nowTop - stopTop)); // 这里设置元素淡出的时间应该为：间隔毫秒*剩余可以上浮空间
            upFloat = setInterval(function () {
                // 继续上浮
                if (nowTop >= stopTop) {
                    divElement.offset({"top": nowTop--});
                } else {
                    clearInterval(upFloat); // 关闭上浮
                    divElement.remove();    // 移除元素
                }
            }, IntervalMS);
        });
    }, timeout);
}
