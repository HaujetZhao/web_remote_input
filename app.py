import socket, ssl, os


import qrcode
import keyboard
import pyclip
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit


app = Flask(__name__)
socketio = SocketIO(app)
last_input  = ''

@app.route("/")
def index():
    return render_template("index.html")

@app.route('/get-clipboard', methods=['GET'])
def get_clipboard():
    # 网页端获取服务端的剪贴板文字
    return jsonify({"content": pyclip.paste().decode('utf-8')})

@app.route('/set-clipboard', methods=['POST'])
def set_clipboard():
    # 网页端将剪贴板发送到服务端，服务端将收到的文字复制到剪贴板
    clipboard_content = request.form.get('clipboard')
    pyclip.copy(clipboard_content)
    print(f"Received clipboard content: {clipboard_content}")
    return "Clipboard content received."

@socketio.on("message")
def handle_message(message):
    # message 是一段话，由发送按钮产生
    print(f'message: {message}')
    keyboard.write(message)

@socketio.on("input")
def handle_char(input: str):
    # input 一般是单个按键，如 a b c d，电脑端用键盘传过来的都是长度为1的键值
    # 但是手机端打的中文、符号，也是以 char 形式传过来
    # 甚至在手机语音输入时，这个 char 是连续的好几个字
    # input = input.lstrip(',.，。')
    print(f'input: {input}\n')

    i = 0

    # 这一段复杂的部分是为了兼容 ios 的语音输入
    # global last_input
    # if len(input) > 1:
    #     while i < len(input) and i < len(last_input) and input[i] == last_input[i]:
    #         i += 1
    #     if i > 0:
    #         for j in range(len(last_input) - i):
    #             keyboard.send('Backspace')

    keyboard.write(input[i:])
    # last_input = input


@socketio.on("word")
def handle_word(word):
    # word 指的是中文字词，主要是中文输入法会拦截按键
    # 输入法的一个上屏就是 word
    word = word.strip(',.，。')
    print(f'word: {word}')
    keyboard.write(word)


@socketio.on("paste")
def handle_paste(paste):
    # 这是指被粘贴的文本
    print(f'paste: {paste}')
    keyboard.write(paste)


@socketio.on("event")
def handle_event(event):
    print(f'event: {event}')


@socketio.on("change")
def handle_change(event):
    print(f'event: {event}')

@socketio.on("key")
def handle_key(key):
    # key 是按键事件，例如 a b c d Backspace、ArrowLeft 等
    # 手机端的输入法也会把一些词句作为按键发过来，所以要用白名单，只接收合法名字的按键
    print(f'key: {key}')
    match key:
        case 'ArrowUp' | 'ArrowDown'| 'ArrowLeft'|'ArrowRight' :
            keyboard.send(key[5:])
        case 'Enter'| 'Escape'| 'Home'| 'End'| 'PageUp' 'PageDown':
            keyboard.send(key)
        case 'Backspace':
            keyboard.send(key)
        case _:
            ...



def main():
    ip = socket.gethostbyname(socket.gethostname())
    port = 5000
    url = f'https://{ip}:{port}'
    
    qr = qrcode.QRCode()
    qr.add_data(url)
    qr.print_ascii()
    print(url + '\n\n')

    qr.make(fit=True)
    qr_file = "qr.png"
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(qr_file)
    os.startfile(qr_file)

    # 指定 SSL 参数
    ssl_params = {
        'keyfile': 'key.pem',
        'certfile': 'cert.pem',
    }
    
    # socketio.run(app, host="0.0.0.0", port=port, debug=False)
    socketio.run(app, host="0.0.0.0", port=port, debug=False, **ssl_params)

if __name__ == "__main__":
    main()
