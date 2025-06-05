/**
 * gameState.js - Gestión del estado del juego
 * Maneja el estado global y las transiciones entre diferentes modos
 */

// Estado global del juego
const gameState = {
    isPaused: false,
    canInteract: false,
    dialogOpen: false,
    activeNPC: null // Referencia al NPC con el que se está interactuando
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
 * Establece el NPC activo para la interacción
 * @param {Object|null} npc - El NPC activo o null si no hay ninguno
 */
function setActiveNPC(npc) {
    gameState.activeNPC = npc;
}

/**
 * Establece el estado del diálogo
 * @param {boolean} isOpen - Si el diálogo está abierto o no
 */
function setDialogState(isOpen) {
    gameState.dialogOpen = isOpen;
    gameState.isPaused = isOpen;
    
    // Limpiar el NPC activo cuando se cierra el diálogo
    if (!isOpen) {
        gameState.activeNPC = null;
    }
}