const express    = require('express');
const http       = require('http');
const { Server } = require("socket.io");

const app        = express();
const server     = http.createServer(app);
const io         = new Server(server);

const PORT       = process.env.PORT || 8080;

io.on('connection', (socket) => {
    socket.on('message', (message) => {
        io.emit('message', message);
    });
});

server.listen(PORT);
