const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Bird properties
const bird = {
    x: 50,
    y: canvas.height / 2,
    radius: 20,
    velocity: 0,
    gravity: 0.5,
    jump: -10
};

// Pipe properties
let pipes = [];
const pipeWidth = 50;
const pipeGap = 150;
const pipeSpeed = 2;

// Score
let score = 0;

// Game over flag
let gameOver = false;

// Event listener for bird jump
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' && !gameOver) {
        bird.velocity = bird.jump;
    }
});

// Function to draw bird
function drawBird() {
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f7cd33';
    ctx.fill();
    ctx.closePath();
}

// Function to draw pipes
function drawPipes() {
    ctx.fillStyle = '#009900';
    for (let i = 0; i < pipes.length; i++) {
        ctx.fillRect(pipes[i].x, 0, pipeWidth, pipes[i].top);
        ctx.fillRect(pipes[i].x, pipes[i].bottom, pipeWidth, canvas.height - pipes[i].bottom);
    }
}

// Function to draw score
function drawScore() {
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
}

// Function to move pipes
function movePipes() {
    for (let i = 0; i < pipes.length; i++) {
        pipes[i].x -= pipeSpeed;
        if (pipes[i].x < -pipeWidth) {
            pipes.splice(i, 1);
            score++;
        }
    }
}

// Function to check for collisions
function checkCollisions() {
    if (bird.y + bird.radius > canvas.height || bird.y - bird.radius < 0) {
        gameOver = true;
    }

    for (let i = 0; i < pipes.length; i++) {
        if (bird.x + bird.radius > pipes[i].x && bird.x - bird.radius < pipes[i].x + pipeWidth) {
            if (bird.y - bird.radius < pipes[i].top || bird.y + bird.radius > pipes[i].bottom) {
                gameOver = true;
            }
        }
    }
}

// Function to update game
function update() {
    if (!gameOver) {
        bird.velocity += bird.gravity;
        bird.y += bird.velocity;
        movePipes();
        checkCollisions();
    }
}

// Function to draw everything on canvas
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBird();
    drawPipes();
    drawScore();
}

// Function to spawn pipes
function spawnPipes() {
    if (Math.random() < 0.02) {
        const topHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
        const bottomHeight = canvas.height - topHeight - pipeGap;
        pipes.push({ x: canvas.width, top: topHeight, bottom: canvas.height - bottomHeight });
    }
}

// Main game loop
function gameLoop() {

    if (gameOver) {
        ctx.fillStyle = '#000';
        ctx.font = '30px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
    } else {
        update();
        spawnPipes();
        requestAnimationFrame(gameLoop);
    }
    console.log("peto")
    draw();

}

// Add an event listener for when the window loads
window.addEventListener('load', () => {
    // Start the game loop when the window is loaded
    gameLoop();
});