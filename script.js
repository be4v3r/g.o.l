const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const menuToggle = document.getElementById('menuToggle');
const menuContent = document.getElementById('menuContent');
const speedSlider = document.getElementById('speedSlider');
const speedInput = document.getElementById('speedInput');
const resetClear = document.getElementById('resetClear');
const resetRandom = document.getElementById('resetRandom');
const gridWidthInput = document.getElementById('gridWidth');
const gridHeightInput = document.getElementById('gridHeight');
const autoResetCheckbox = document.getElementById('autoReset');

let cols = 100; // Default grid width
let rows = 50; // Default grid height
const resolution = 10; // Size of each cell
let grid = create2DArray(cols, rows);
gridWidthInput.value = cols; // Set default value in the input field
gridHeightInput.value = rows; // Set default value in the input field

let paused = true;
let simulationSpeed = 100; // Default speed in milliseconds

let offsetX = 0; // Horizontal offset for panning
let offsetY = 0; // Vertical offset for panning
let scale = 1; // Scale for zooming
let isDragging = false;
let dragStartX, dragStartY;

let isDrawing = false; // Track if the user is drawing
let drawState = 1; // State to draw (1 for alive, 0 for dead)

let cycleCount = 0; // Track the number of cycles
let lastResetState = 'clear'; // Track the last reset type ('clear' or 'random')
let previousGridStates = new Set(); // Track previous grid states to detect repetition

// Toggle menu visibility
menuToggle.addEventListener('click', () => {
    if (menuContent.style.display === 'none' || menuContent.style.display === '') {
        menuContent.style.display = 'block'; // Show menu
    } else {
        menuContent.style.display = 'none'; // Hide menu
    }
});

// Sync slider and input field
speedSlider.addEventListener('input', () => {
    simulationSpeed = parseInt(speedSlider.value, 10);
    speedInput.value = simulationSpeed;
});

speedInput.addEventListener('input', () => {
    simulationSpeed = parseInt(speedInput.value, 10);
    speedSlider.value = simulationSpeed;
});

// Reset grid to clear
resetClear.addEventListener('click', () => {
    grid = create2DArray(cols, rows); // Clear the grid
    lastResetState = 'clear'; // Update the last reset state
    drawGrid();
    resetCycleTracking(); // Reset cycle tracking
});

// Reset grid to random
resetRandom.addEventListener('click', () => {
    randomizeGrid(); // Randomize the grid
    lastResetState = 'random'; // Update the last reset state
    drawGrid();
    resetCycleTracking(); // Reset cycle tracking
});

// Update grid size when the user changes the settings
gridWidthInput.addEventListener('input', () => {
    cols = parseInt(gridWidthInput.value, 10);
    updateGridSize();
});

gridHeightInput.addEventListener('input', () => {
    rows = parseInt(gridHeightInput.value, 10);
    updateGridSize();
});

// Update grid size and re-center it
function updateGridSize() {
    grid = create2DArray(cols, rows); // Reset the grid
    centerGrid(); // Re-center the grid
    drawGrid(); // Redraw the grid
}

// Center the grid in the window
function centerGrid() {
    const gridWidth = cols * resolution;
    const gridHeight = rows * resolution;

    offsetX = (canvas.width - gridWidth) / 2;
    offsetY = (canvas.height - gridHeight) / 2;
}

// Create a 2D array filled with 0s
function create2DArray(cols, rows) {
    return Array.from({ length: cols }, () => Array(rows).fill(0));
}

// Randomize the grid
function randomizeGrid() {
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            grid[i][j] = Math.random() > 0.8 ? 1 : 0;
        }
    }
}

// Draw the grid on the canvas
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#ccc'; // Light gray for grid lines

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            ctx.fillStyle = grid[i][j] === 1 ? 'black' : 'white';
            ctx.fillRect(i * resolution, j * resolution, resolution, resolution);
            ctx.strokeRect(i * resolution, j * resolution, resolution, resolution); // Draw grid lines
        }
    }

    ctx.restore();
}

// Get the next state of the grid
function nextGeneration() {
    const nextGrid = create2DArray(cols, rows);

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const neighbors = countNeighbors(grid, i, j);
            const state = grid[i][j];

            // Apply Game of Life rules
            if (state === 0 && neighbors === 3) {
                nextGrid[i][j] = 1; // Birth
            } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                nextGrid[i][j] = 0; // Death
            } else {
                nextGrid[i][j] = state; // Stasis
            }
        }
    }

    grid = nextGrid;
}

// Count the live neighbors of a cell
function countNeighbors(grid, x, y) {
    let sum = 0;

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const col = (x + i + cols) % cols;
            const row = (y + j + rows) % rows;

            sum += grid[col][row];
        }
    }

    sum -= grid[x][y]; // Exclude the cell itself
    return sum;
}

// Reset cycle tracking
function resetCycleTracking() {
    cycleCount = 0;
    previousGridStates.clear();
}

// Serialize the grid state for comparison
function serializeGrid(grid) {
    return grid.map(row => row.join('')).join('|');
}

// Auto-reset logic
function autoResetGrid() {
    if (autoResetCheckbox.checked) {
        const currentState = serializeGrid(grid);

        // Check if the current state has been seen before
        if (previousGridStates.has(currentState)) {
            cycleCount++;
        } else {
            previousGridStates.add(currentState);
            cycleCount = 0; // Reset cycle count if a new state is detected
        }

        // Reset the grid if cycles repeat for 50 iterations
        if (cycleCount >= 50) {
            if (lastResetState === 'clear') {
                grid = create2DArray(cols, rows); // Reset to clear
            } else if (lastResetState === 'random') {
                randomizeGrid(); // Reset to random
            }
            drawGrid();
            resetCycleTracking(); // Reset cycle tracking after auto-reset
        }
    }
}

// Handle spacebar to pause/unpause
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        paused = !paused;
    }
});

// Handle mouse down to start drawing
canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left mouse button
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left - offsetX) / scale;
        const mouseY = (event.clientY - rect.top - offsetY) / scale;

        const x = Math.floor(mouseX / resolution);
        const y = Math.floor(mouseY / resolution);

        if (x >= 0 && x < cols && y >= 0 && y < rows) {
            drawState = grid[x][y] === 1 ? 0 : 1; // Toggle state
            grid[x][y] = drawState;
            drawGrid();
        }
    }
});

// Handle mouse move to continue drawing
canvas.addEventListener('mousemove', (event) => {
    if (isDrawing) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left - offsetX) / scale;
        const mouseY = (event.clientY - rect.top - offsetY) / scale;

        const x = Math.floor(mouseX / resolution);
        const y = Math.floor(mouseY / resolution);

        if (x >= 0 && x < cols && y >= 0 && y < rows) {
            grid[x][y] = drawState; // Set cell to the current draw state
            drawGrid();
        }
    }
});

// Handle mouse up to stop drawing
canvas.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Left mouse button
        isDrawing = false;
    }
});

// Handle middle mouse button drag
canvas.addEventListener('mousedown', (event) => {
    if (event.button === 1) { // MMB
        isDragging = true;
        dragStartX = event.clientX - offsetX;
        dragStartY = event.clientY - offsetY;
        event.preventDefault(); // Prevent default MMB behavior
    }
});

canvas.addEventListener('mousemove', (event) => {
    if (isDragging) {
        offsetX = event.clientX - dragStartX;
        offsetY = event.clientY - dragStartY;
        drawGrid();
    }
});

canvas.addEventListener('mouseup', (event) => {
    if (event.button === 1) { // MMB
        isDragging = false;
    }
});

// Handle zoom with scroll wheel
canvas.addEventListener('wheel', (event) => {
    const zoomFactor = 0.1;

    // Calculate mouse position relative to the grid
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left - offsetX) / scale;
    const mouseY = (event.clientY - rect.top - offsetY) / scale;

    // Adjust scale
    if (event.deltaY < 0) {
        scale += zoomFactor; // Zoom in
    } else {
        scale = Math.max(zoomFactor, scale - zoomFactor); // Zoom out
    }

    // Adjust offsets to zoom into the mouse position
    offsetX = event.clientX - rect.left - mouseX * scale;
    offsetY = event.clientY - rect.top - mouseY * scale;

    drawGrid();
    event.preventDefault(); // Prevent default scroll behavior
});

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas(); // Reinitialize the canvas and grid on window resize
});

// Resize canvas without resetting the grid
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    centerGrid(); // Re-center the grid after resizing
    drawGrid();
}

// Main game loop
function update() {
    if (!paused) {
        nextGeneration();
        autoResetGrid(); // Check if auto-reset is needed
    }
    drawGrid();
    setTimeout(() => requestAnimationFrame(update), simulationSpeed);
}

// Initialize the game
resizeCanvas();
centerGrid();
drawGrid(); // Draw the empty grid
update();