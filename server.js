const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static(__dirname + '/static'));

server.listen(3000, () => {
    console.log("Сервер запущен!");
});

app.get("/", (req, res) => {
    //res.redirect('static/client.html');
    res.sendFile(__dirname + "/static/client.html");
});

io.on("connection", (socket) => {
    io.emit("start-chat", "С подключением! Ваш ID: " + socket.id);
    socket.on("chat", (msg) => {
        socket.emit("input-chat", socket.id + ": " + msg);
        socket.broadcast.emit("input-chat", socket.id + ": " + msg);
    });
});
