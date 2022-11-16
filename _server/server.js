/*

How to deploy?

1. Open Terminal on this folder
2. Run `gcloud app deploy`
3. Follow instructions
4. Wait a few minutes

*/

const express    = require('express');
const http       = require('http');
const { Server } = require("socket.io");

const app        = express();
const server     = http.createServer(app);
const io         = new Server(server);

const PORT       = process.env.PORT || 8080;

io.on('connection', (socket) => {

    socket.on('user', (data) => {

        // Sends to all clients except sender
        socket.broadcast.emit('user', data);

    });

    socket.on('orientation', (data) => {

        // Sends to all clients except sender
        socket.broadcast.emit('orientation', data);

    });

});

server.listen(PORT);