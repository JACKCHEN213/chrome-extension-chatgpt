function jsonHighlight(str) {
    if (typeof str !== 'string') {
        str = JSON.stringify(str, undefined, 2)
    }
    str = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/ /g, '&nbsp;')
    return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number'
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key'
            } else {
                cls = 'string'
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean'
        } else if (/null/.test(match)) {
            cls = 'null'
        }
        return '<span class="' + cls + '">' + match + '</span>'
    })
}



function deepCloneObject(target, hash = new WeakMap()) {
    if (!(target !== null && typeof target === 'object')) {
        return target;
    }

    if (hash.get(target)) {
        return hash.get(target);
    }

    let newObj = Array.isArray(target) ? [] : {};
    hash.set(target, newObj);

    for (let key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
            if ((target[key] !== null && typeof target[key] === 'object')) {
                // 如果是{}则转成[]
                if (JSON.stringify(target[key]) === '{}') {
                    newObj[key] = [];
                } else {
                    // 递归拷贝
                    newObj[key] = deepCloneObject(target[key], hash);
                }
            } else {
                if (target[key].toString() === parseInt(target[key]).toString()) { // 判断是否为纯数字字符串
                    newObj[key] = parseInt(target[key]);
                } else if (target[key] === null) { // 判断是否为null
                    newObj[key] = '';
                } else {
                    newObj[key] = target[key];
                }
            }
        }
    }

    return newObj;
}

/**
 * 获取日期时间
 * @param {Date} date
 * @return {*}
 */
function getCurrentDatetimeStr(date = null) {
    if (!date) {
        date = new Date();
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function generateUUID() {
    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    let uuid = Array(32).fill(null);
    let radix = chars.length;

    let timestamp = Date.now().toString(36);
    uuid.splice(0, timestamp.length, ...timestamp.split(''));

    for (let i = timestamp.length; i < 32; i++) {
        uuid[i] = chars[0 | Math.random()*radix];
    }

    return uuid.join('');
}

async function getChromeCache(key) {
    if (key === null) {
        return await chrome.storage.local.get(null);
    }
    let chromeCache = await chrome.storage.local.get([key]);
    return chromeCache[key];
}

async function setChromeCache(key, value) {
    let data = {};
    data[key] = value;
    await chrome.storage.local.set(data);
}
