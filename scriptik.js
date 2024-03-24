const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Constants
const GRAVITY = 0.3;
const PIPE_WIDTH = 80;
const PIPE_GAP = 200;
const PIPE_SPEED = 2;

// Game state
let bird = { x: 100, y: canvas.height / 2, vy: 0, width: 40, height: 40 };
let pipes = [];
let gameRunning = true;
let score = 0;

// Main game loop
function gameLoop() {
    if (gameRunning) {
        // Update game state
        update();

        // Render game
        render();

        // Call game loop recursively
        requestAnimationFrame(gameLoop);
    }
}

// Update function (to handle game logic)
function update() {
    // Update bird position
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Remove offscreen pipes
    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    // Spawn new pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 300) {
        spawnPipe();
    }

    // Update pipe positions and check for scoring
    for (let pipe of pipes) {
        pipe.x -= PIPE_SPEED;
        if (pipe.x < bird.x && !pipe.scored) {
            score++; // Increment score if the bird passes the pipe
            pipe.scored = true; // Mark the pipe as scored to avoid duplicate scoring
        }
    }

    // Check for collisions
    checkCollisions();
}

// Render function (to draw the game)
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bird
    ctx.fillStyle = 'yellow';
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);

    // Draw pipes
    ctx.fillStyle = 'green';
    for (let pipe of pipes) {
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.y);
        ctx.fillRect(pipe.x, pipe.y + PIPE_GAP, PIPE_WIDTH, canvas.height - (pipe.y + PIPE_GAP));
    }

    // Update score display
    document.getElementById('scoreValue').textContent = score;
}

// Handle user input (flap bird)
document.addEventListener('keydown', handleInput);
function handleInput(event) {
    if (event.code === 'Space') {
        bird.vy = -5; // Flap bird upwards
    }
}

// Spawn a new pipe
function spawnPipe() {
    const gapPosition = Math.floor(Math.random() * (canvas.height - PIPE_GAP));
    pipes.push({ x: canvas.width, y: gapPosition });
}

// Check for collisions with pipes
function checkCollisions() {
    for (let pipe of pipes) {
        if (bird.x < pipe.x + PIPE_WIDTH &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.y || bird.y + bird.height > pipe.y + PIPE_GAP)) {
            gameOver();
            return;
        }
    }

    // Check for collisions with ground
    if (bird.y + bird.height > canvas.height) {
        gameOver();
    }

    // Check for collisions with roof
    if (bird.y < 0) {
        gameOver();
    }
}

// Game over function
function gameOver() {
    gameRunning = false;
    // Display game over message or perform other actions as needed
    console.log('Game Over');
}

// Start the game loop
gameLoop();