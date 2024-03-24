// server.js

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path=require("path")

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;


app.use(express.static("public"))

let users = []; // Array to store connected users
let readyUsers = 0; // Count of users who are ready

io.on('connection', (socket) => {
    console.log('User connected');

    // Add new user to the list
    users.push({ id: socket.id, ready: false , name: socket.id});

    // Broadcast updated user list to all clients
    io.emit('updateUsers', users);

    // Handle user ready state change
    socket.on('toggleReady', () => {
        const user = users.find(u => u.id === socket.id);
        if (user) {
            user.ready = !user.ready;
            io.emit('updateUsers', users); // Broadcast updated user list
            if (user.ready) {
                readyUsers++;
                if (readyUsers === users.length) {
                    io.emit('startGame'); // Start game when all users are ready
                }
            } else {
                readyUsers--;
            }
        }
    });


    socket.on('setName', (input) => {
        const user = users.find(u => u.id === socket.id);
        if (user) {
            user.name = input.name
            io.emit('updateUsers', users); // Broadcast updated user list
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
        users = users.filter(user => user.id !== socket.id);
        io.emit('updateUsers', users); // Broadcast updated user list
        readyUsers = Math.max(0, readyUsers - 1); // Update readyUsers count

        //TODO - ked sa odpoji odstranit jeho vtaka 
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
  });

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
