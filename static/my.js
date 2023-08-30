//==================================================================

// 获取 socket地址
var url = new URL(window.location);
var host = url.hostname;
var port = url.port || (url.protocol === "https:" ? 443 : 80);
var socket = io(`${url.protocol}//${host}:${port}`);

//==================================================================

// 获取输入框元素
var messageInput = document.getElementById("message");


//==================================================================

// 按下发送按钮，发送输入框中全部的内容，并清空输入框
function sendMessage() {
    var message = messageInput.value;

    socket.emit("message", message);
    messageInput.value = "";

    // 阻止表单提交的默认行为
    return false;
}


// 清空输入框
function clear_text(event) {
    messageInput.value = "";
}

// 开始输入中文
function start_chinese(event) {
    messageInput.isComposing = true;
    messageInput.value = "";
}

// 结束输入中文
function finish_chinese(event) {
    // 清除正在输入中文的标记
    messageInput.isComposing = false;

    // 发送中文内容
    socket.emit("word", event.data);
    messageInput.value = "";
}

// 发送输入的字符
function send_input(event) {
    if (event.inputType === "insertText") {
        // 发送插入的字符
        var message = event.data;
        socket.emit("input", message);
    } else if (event.inputType === "deleteContentBackward") {
        // 由于 ios 上的百度输入法语音输入不是用 backspace
        // 而是直接 deleteContentBackward 删除字符
        // 不得以做此兼容
        socket.emit("key", "Backspace");
    } else {
        socket.emit("event", message.inputType)
    }
}

// 发送粘贴的内容
function send_paste(event) {
    var clipboardData = event.clipboardData;
    var pastedData = clipboardData.getData("text");
    socket.emit("paste", pastedData);
    messageInput.value = "";
}

// 发送按键
function send_key(event) {
    if (event.key === "Backspace") {
        // 为 ios 百度输入法做的兼容
        if (messageInput.value !== "") {
            return false;
        }
    }
    socket.emit("key", event.key);
}


function send_change(event) {
    socket.emit("change", event.data);
}

//========================关于获取、设置服务端剪贴板==========================================


// 在 Safari 上有安全限制，写入剪贴板必须在一个用户操作后
// 同时，在一个 Promise 之后，无法再写入剪贴板
// 解决办法是给 navigator.clipboard.write 一个异步 Promise，让这个 Promise 拉取内容
async function getClipboardFromServer() {
    clear_text()
    try {
        const text = new ClipboardItem({
            "text/plain": fetch('/get-clipboard')
                .then(response => response.json())
                .then(data => data.content)
        })
        navigator.clipboard.write([text])
    } catch (err) {
        alert("剪贴板拉取失败: " + err);
    }
}

async function sendClipboardToServer() {
    clear_text()
    try {
        const text = await navigator.clipboard.readText();

        const formData = new FormData();
        formData.append("clipboard", text);

        fetch('/set-clipboard', {
            method: 'POST',
            body: formData
        });
    } catch (err) {
        alert("剪贴板推送失败: " + err);
    }
}

//==================================================================

// 配置即时输入的开关
var switchElem = document.getElementById("switch");
var on = false;
var sendButton = document.querySelector("#message-form button[id=submit]");
switchElem.addEventListener("click", function () {
    on = !on;
    if (on) {
        switchElem.classList.add("on");
        switchElem.classList.remove("off");
        sendButton.disabled = true;
        // 监听「开始输入中文」「结束输入中文」「输入的字符」「粘贴的内容」「按键」「点击清空」
        messageInput.addEventListener("compositionstart", start_chinese);
        messageInput.addEventListener("compositionend", finish_chinese);
        messageInput.addEventListener("input", send_input);
        messageInput.addEventListener("paste", send_paste);
        messageInput.addEventListener("keydown", send_key);
        messageInput.addEventListener("click", clear_text);
        messageInput.addEventListener("change", send_change);
    } else {
        switchElem.classList.add("off");
        switchElem.classList.remove("on");
        sendButton.disabled = false;
        // 移除监听
        messageInput.removeEventListener("compositionstart", start_chinese);
        messageInput.removeEventListener("compositionend", finish_chinese);
        messageInput.removeEventListener("input", send_input);
        messageInput.removeEventListener("paste", send_paste);
        messageInput.removeEventListener("keydown", send_key);
        messageInput.removeEventListener("click", clear_text);
        messageInput.removeEventListener("change", send_change);
    }
});


//==================================================================

// 打开网页时，直接聚焦到输入框
window.onload = function () {
    var messageInput = document.getElementById("message");
    messageInput.focus();
    messageInput.click();
}

//==================================================================


