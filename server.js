const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname + "/static"));

const MAX_SMS = 5;
let chats = [];
let users = [];

class Chat {
    constructor(nick, sms, time) {
        this.nick = nick;
        this.sms = sms;
        this.time = time;
    }
}

class User {

    constructor(nick, pass) {
        this.nick = nick;
        this.pass = pass;
        this.id = -1;
    }
}

function AddChat(msg) {
    if (msg[0] != null) {
        chats.push(new Chat(msg[0], msg[1], msg[2]));
        if (chats.length > MAX_SMS) {
            chats.shift();
        }
    }
}

function AddUser(user) {
    if (user[0] !== null && user[0] !== "") {
        for (let i = 0; i < users.length; i++) {
            if (users[i]["nick"] === user[0]) {         // если такой ник уже есть
                if (users[i]["pass"] === user[1]) {     // и если пароль правильный
                    if (users[i]["id"] === -1) {        // и если юзер уже не сидит в чате
                        return true;                    // то допуск к чату разрешен
                    } else {                            // а если сессия уже начата
                        return false;                   // то что-то явно не так
                    }
                } else {                                // а если пароль неправильный
                    return false;                       // то никакого доступа
                }
            }
        }
    }
    else {
        return false;
    }
    users.push(new User(user[0], user[1]));         // если совпадений не нашлось, то регистрация новичка
    return true;                                    // и для него чат открыт
}

function SetUserId(nick, id) {
    for (let i = 0; i < users.length; i++) {
        if (users[i]["nick"] === nick) {
            users[i]["id"] = id;
            break;
        }
    }
}

function DeleteOnlineUser(id) {
    for (let i = 0; i < users.length; i++) {
        if (users[i]["id"] === id) {
            users[i]["id"] = -1;
            break;
        }
    }
}

function CreateOnlineList() {
    let members = [];
    for (let i = 0; i < users.length; i++) {
        if (users[i]["id"] !== -1) {
            members.push(users[i]["nick"]);
        }
    }
    return members;
}

// API /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

server.listen(3000, () => {
    console.log("Сервер запущен: http://localhost:3000");
});

// ПЕРВОЕ ПОСЕЩЕНИЕ САЙТА
app.get("/", (req, res) => {
    res.redirect("reg.html");
});

// РЕГИСТРАЦИЯ ИЛИ АВТОРИЗАЦИЯ
app.post("/reg", function (req, res) {
    if (AddUser([req.body["nick"], req.body["pass"]])) {
        res.send(req.body["nick"]);
    } else {
        res.send("");
    }
});

// ПОДКЛЮЧЕНИЕ
io.on("connection", (socket) => {

    // ПРИВЕТСТВИЕ ПОЛЬЗОВАТЕЛЯ
    socket.emit("start-chat", chats);

    // ПРИШЕЛ НИК
    socket.on("my-nick", (msg) => {
        if (msg === null) {
            socket.disconnect();
            return;
        }
        SetUserId(msg, socket.id);
        socket.emit("members", CreateOnlineList());
        socket.broadcast.emit("members", CreateOnlineList());
    });

    // ПРИШЛО СООБЩЕНИЕ
    socket.on("chat", (msg) => {
        AddChat(msg);
        socket.emit("input-chat-me", msg);
        socket.broadcast.emit("input-chat-other", msg);
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', () => {
        DeleteOnlineUser(socket.id);
        socket.broadcast.emit("members", CreateOnlineList());
    });

    // РАССЫЛКА
    setInterval(() => {
        console.log(users);
        console.log(chats);
    }, 5000);

});
