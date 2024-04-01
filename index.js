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
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const TICK_RATE = 1000 / 60; // 60 frames per second

// Game state
let pipes = [];
let users = []; // Array to store connected users
let usersPositions = []
let readyUsers = 0; // Count of users who are ready
let gameLoopInterval;
let gameRunning = false
let gameTime = 0;
let lastSpeedIncreaseTime = 0; // Initialize the time of the last speed increase
let PIPE_SPEED = 2;


// Main game loop
function gameLoop() {

    if (gameRunning) {
        // Update game state
        update();

        gameTime += TICK_RATE;
        updatePipeSpeed()

        // Render game
        io.emit('render', { 'usersPositions': usersPositions, 'pipes': pipes, 'pipe_width': PIPE_WIDTH, 'pipe_gap': PIPE_GAP })

    } else {
        clearInterval(gameLoopInterval)
        readyUsers = 0
        lastSpeedIncreaseTime = 0
        gameTime = 0
        PIPE_SPEED = 2
        pipes = []
        users = []
        usersPositions = []
        io.emit('gameEnd', "Winner is somebody")
    }
}


function updatePipeSpeed() {
    const elapsedTime = gameTime - lastSpeedIncreaseTime;

    // Example: Increase pipe speed every 5000ms (5 seconds)
    if (elapsedTime >= 5000) {
        PIPE_SPEED += 0.5; // Increase by 0.5 units
        lastSpeedIncreaseTime = gameTime; // Update the time of the last speed increase
    }
}

// Update function (to handle game logic)
function update() {
    // Update bird position
    usersPositions.forEach(user => {
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
                if (user.status !== "dead") {
                    user.score++; // Increment score if the bird passes the pipe
                }
            })
        }
    }

    // Check for collisions
    checkCollisions();
    checkAlivePlayers();
    io.emit('updateUsers', users)
}

// Spawn a new pipe
function spawnPipe() {
    const gapPosition = Math.floor(Math.random() * (CANVAS_HEIGHT - PIPE_GAP));
    console.log(gapPosition)
    pipes.push({ x: CANVAS_WIDTH, y: gapPosition });
}

function checkAlivePlayers() {
    let anybodyAlive = false
    users.forEach(user => {
        if (user.status === "ready") {
            anybodyAlive = true
        }
    })
    if (!anybodyAlive) {
        gameRunning = false
    }
}


// Check for collisions with pipes
function checkCollisions() {
    for (let pipe of pipes) {
        usersPositions.forEach(user => {

            // hruba rura vrchnej pipe
            if (user.bird.x < pipe.x + PIPE_WIDTH &&  // ked je vtak pred koncom pipe
                user.bird.x + user.bird.width > pipe.x && // ked je vtak a jeho objam za zaciatkom pipe
                user.bird.y < pipe.y && user.bird.y + user.bird.height > pipe.y - 32
            ) {
                gameOver(user);
                return;
            }

            // hruba rura spodnej pipe
            if (user.bird.x < pipe.x + PIPE_WIDTH &&
                user.bird.x + user.bird.width > pipe.x &&
                user.bird.y + user.bird.height > pipe.y + PIPE_GAP && user.bird.y < pipe.y + PIPE_GAP + 32
            ) {
                gameOver(user);
                return;
            }

            // tenka rura spodnej pipe
            if (user.bird.x < pipe.x + PIPE_WIDTH - 8 &&
                user.bird.x + user.bird.width > pipe.x + 8 &&
                user.bird.y + user.bird.height > pipe.y + PIPE_GAP
            ) {
                gameOver(user);
                return;
            }

            // tenka rura vrchnej pipe
            if (user.bird.x < pipe.x + PIPE_WIDTH - 8 &&
                user.bird.x + user.bird.width > pipe.x + 8 &&
                user.bird.y < pipe.y
            ) {
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
    const image = await sharp("./public/bird_flying.png").raw().toBuffer({ resolveWithObject: true });

    // RGB values of the color to replace
    const targetColor = [132, 175, 211];

    // Get image metadata
    let { info, data } = image;

    // Get the width and height of the image
    let { width, height, channels } = info;

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

    const data2 = data

    // Read the input image
    const image2 = await sharp("./public/bird_falling.png").raw().toBuffer({ resolveWithObject: true });

    // Get image metadata

    ({ info, data } = image2);

    // Get the width and height of the image
    ({ width, height, channels } = info);



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

    return { 'width': width, 'height': height, 'bird_flying': data2, 'bird_falling': data }
}

// Game over function
function gameOver(user) {
    readyUsers--;
    users.find(u => u.id === user.id).status = "dead"
    io.to(user.id).emit('gameOver', "You lost");
}



io.on('connection', (socket) => {
    console.log('User connected');

    // Add new user to the list

    recolorImage('#84AFD3').then(data => {
        users.push({ id: socket.id, status: "not_ready", name: socket.id, score: 0, birdImage: data });
        usersPositions.push({ id: socket.id, bird: { x: 100, y: CANVAS_HEIGHT / 2, vy: 0, width: 33, height: 38 } })
        io.emit('updateUsers', users);
    })



    // Handle user ready state change
    socket.on('toggleReady', () => {
        const user = users.find(u => u.id === socket.id);
        if (user) {
            if (user.status === "not_ready") {
                user.status = "ready"
            } else if (user.status === "ready") {
                user.status = "not_ready"
            }
            io.emit('updateUsers', users); // Broadcast updated user list

            if (user.status === "ready") {
                readyUsers++;
                if (readyUsers === users.length || user.name === "risko") {
                    io.emit('startGame'); // Start game when all users are ready
                    gameRunning = true
                    gameLoopInterval = setInterval(gameLoop, TICK_RATE);
                }
            } else {
                readyUsers--;
            }
        }
    });

    socket.on('jump', (id) => {
        usersPositions.forEach(user => {
            const foundUser = users.find(u => u.id === id);
            if (user.id === id && foundUser.status !== "dead") {
                user.bird.vy = -5; // Flap bird upwards
            }
        })
    })


    socket.on('savePlayerInfo', (input) => {
        const user = users.find(u => u.id === socket.id);
        if (user) {
            user.name = input.name
            recolorImage(input.color).then(data => {
                user.birdImage = data
                io.emit('updateUsers', users); // Broadcast updated user list
            })

        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
        users = users.filter(user => user.id !== socket.id);
        usersPositions = usersPositions.filter(user => user.id !== socket.id);
        io.emit('userDisconnected', socket.id); // Broadcast updated user list
        readyUsers = Math.max(0, readyUsers - 1); // Update readyUsers count

    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
