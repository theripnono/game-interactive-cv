/**
 * gameState.js - Gestión del estado del juego
 * Maneja el estado global y las transiciones entre diferentes modos
 */

// Estado global del juego
const gameState = {
    isPaused: false,
    canInteract: false,
    dialogOpen: false
};

// Objeto para rastrear las teclas presionadas
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
    space: false
};

/**
 * Pausa el juego
 */
function pauseGame() {
    gameState.isPaused = true;
}

/**
 * Reanuda el juego
 */
function resumeGame() {
    gameState.isPaused = false;
}

/**
 * Establece si el jugador puede interactuar
 * @param {boolean} canInteract - Si puede interactuar o no
 */
function setCanInteract(canInteract) {
    gameState.canInteract = canInteract;
}

/**
 * Establece el estado del diálogo
 * @param {boolean} isOpen - Si el diálogo está abierto o no
 */
function setDialogState(isOpen) {
    gameState.dialogOpen = isOpen;
    gameState.isPaused = isOpen;
}