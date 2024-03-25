// server.js

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require("path")
const sharp = require('sharp');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;


app.use(express.static("public"))


// Constants
const GRAVITY = 0.3;
const PIPE_WIDTH = 80;
const PIPE_GAP = 200;
const PIPE_SPEED = 2;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const TICK_RATE = 1000 / 60; // 60 frames per second

// Game state
let pipes = [];
let users = []; // Array to store connected users
let usersBirds = []
let readyUsers = 0; // Count of users who are ready
let gameLoopInterval;


// Main game loop
function gameLoop() {
    anybodyAlive = false
    users.forEach(user => {
        if (user.alive) {
            anybodyAlive = true;
        }
    })

    if (anybodyAlive) {
        // Update game state
        update();

        //TODO-riso send user info to render the game
        // Render game
        io.emit('render', { 'users': users, 'pipes': pipes, 'pipe_width': PIPE_WIDTH, 'pipe_gap': PIPE_GAP })

    } else {
        //TODO-riso stop game
        clearInterval(gameLoopInterval)
        pipes = []
        io.emit('gameEnd', "Winner is somebody")
        users.forEach(player => {
            player.ready = false
            player.alive = true
        })
    }
}

// Update function (to handle game logic)
function update() {
    // Update bird position
    users.forEach(user => {
        user.bird.vy += GRAVITY;
        user.bird.y += user.bird.vy
    })

    // Remove offscreen pipes
    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    // Spawn new pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < CANVAS_WIDTH - 300) {
        spawnPipe();
    }

    // Update pipe positions and check for scoring
    for (let pipe of pipes) {
        pipe.x -= PIPE_SPEED;

        if (pipe.x < 100 && !pipe.scored) {
            pipe.scored = true // Mark the pipe as scored to avoid duplicate scoring 
            users.forEach(user => {
                if (user.alive) {
                    user.score++; // Increment score if the bird passes the pipe
                }
            })
        }
    }

    // Check for collisions
    checkCollisions();


    io.emit('updateUsers', users)
}

// Spawn a new pipe
function spawnPipe() {
    const gapPosition = Math.floor(Math.random() * (CANVAS_HEIGHT - PIPE_GAP));
    pipes.push({ x: CANVAS_WIDTH, y: gapPosition });
}


// Check for collisions with pipes
function checkCollisions() {
    for (let pipe of pipes) {
        users.forEach(user => {

            if (user.bird.x < pipe.x + PIPE_WIDTH &&
                user.bird.x + user.bird.width > pipe.x &&
                (user.bird.y < pipe.y || user.bird.y + user.bird.height > pipe.y + PIPE_GAP)) {
                gameOver(user);
                return;
            }

            // Check for collisions with ground
            if (user.bird.y + user.bird.height > CANVAS_HEIGHT) {
                gameOver(user);
            }

            // Check for collisions with roof
            if (user.bird.y < 0) {
                gameOver(user);
            }
        })
    }
}

async function recolorImage(replacementColor) {
    replacementColor = replacementColor.replace('#', '');
    // Convert hexadecimal to decimal
    const newr = parseInt(replacementColor.substring(0, 2), 16);
    const newg = parseInt(replacementColor.substring(2, 4), 16);
    const newb = parseInt(replacementColor.substring(4, 6), 16);

    // Read the input image
    const image = await sharp("./public/bird.png").raw().toBuffer({ resolveWithObject: true });

    // RGB values of the color to replace
    const targetColor = [132, 175, 211];

    // Get image metadata
    const { info, data } = image;

    // Get the width and height of the image
    const { width, height, channels } = info;

    // Iterate over each pixel in the image
    for (let i = 0; i < data.length; i += channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check if the pixel matches the target color
        if (r === targetColor[0] && g === targetColor[1] && b === targetColor[2]) {
            // Replace the pixel with the replacement color
            data[i] = newr
            data[i + 1] = newg
            data[i + 2] = newb
        }
    }

    return { 'width': width, 'height': height, 'data': data }
}

// Game over function
function gameOver(user) {
    user.alive = false
    io.to(user.id).emit('gameOver', "You lost");
}

// Start the game loop
gameLoop();

io.on('connection', (socket) => {
    console.log('User connected');

    // Add new user to the list
    users.push({ id: socket.id, ready: false, name: socket.id, color: "#000000", bird: { x: 100, y: CANVAS_HEIGHT / 2, vy: 0, width: 40, height: 40 }, score: 0, alive: true });

    recolorImage('#84AFD3').then(data => {
        usersBirds.push({ userId: socket.id, bird: data })
        io.emit('updateBirds', usersBirds)
        io.emit('updateUsers', users);
    })



    // Handle user ready state change
    socket.on('toggleReady', () => {
        const user = users.find(u => u.id === socket.id);
        if (user) {
            user.ready = !user.ready;
            io.emit('updateUsers', users); // Broadcast updated user list
            io.emit('updateBirds', usersBirds)
            if (user.ready) {
                readyUsers++;
                if (readyUsers === users.length) {
                    io.emit('startGame'); // Start game when all users are ready

                    gameLoopInterval = setInterval(gameLoop, TICK_RATE);
                }
            } else {
                readyUsers--;
            }
        }
    });

    socket.on('jump', (id) => {
        users.forEach(user => {
            if (user.id === id && user.alive) {
                user.bird.vy = -5; // Flap bird upwards
            }
        })
    })


    socket.on('savePlayerInfo', (input) => {
        const user = users.find(u => u.id === socket.id);
        const userBird = usersBirds.find(u => u.userId === socket.id)
        if (user && userBird) {
            user.name = input.name
            user.color = input.color
            recolorImage(input.color).then(data => {
                userBird.bird = data
                io.emit('updateUsers', users); // Broadcast updated user list
                io.emit('updateBirds', usersBirds)
            })

        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
        users = users.filter(user => user.id !== socket.id);
        usersBirds = usersBirds.filter(user => user.userId !== socket.id);
        io.emit('updateUsers', users); // Broadcast updated user list
        io.emit('updateBirds', usersBirds)
        readyUsers = Math.max(0, readyUsers - 1); // Update readyUsers count

    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
