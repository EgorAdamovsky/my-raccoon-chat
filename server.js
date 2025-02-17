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
    constructor(nick, sms) {
        this.nick = nick;
        this.sms = sms;
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
    chats.push(new Chat(msg[0], msg[1]));
    if (chats.length > MAX_SMS) {
        chats.shift();
    }
    console.log(chats);
}

function AddUser(user) {
    for (let i = 0; i < users.length; i++) {
        if (users[i]["nick"] === user[0]) {
            if (users[i]["pass"] === user[1]) {
                return true;
            }
        }
    }
    users.push(new User(user[0], user[1]));
    return true;
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
    console.log(users);
});

// ПОДКЛЮЧЕНИЕ
io.on("connection", (socket) => {

    // ПРИВЕТСТВИЕ ПОЛЬЗОВАТЕЛЯ
    io.emit("start-chat", chats);

    // ПРИШЕЛ НИК
    socket.on("my-nick", (msg) => {
        SetUserId(msg, socket.id);
        console.log(users);
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
        console.log(users);
    });

    setInterval(() => {
        let members = [];
        for (let i = 0; i < users.length; i++) {
            if (users[i]["id"] !== -1) {
                members.push(users[i]["nick"]);
            }
        }
        socket.emit("members", members);
    }, 1000);

});
