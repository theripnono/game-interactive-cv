/**
 * input.js - Sistema de entrada del juego
 * Maneja todos los eventos de teclado y entrada del usuario
 */

/**
 * Maneja el evento de tecla presionada
 * @param {KeyboardEvent} event - Evento del teclado
 */
function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    
    // Manejar teclas cuando el chat está abierto
    if (gameState.dialogOpen) {
        if (event.key === 'Escape') {
            closeChat();
            event.preventDefault();
            return;
        }
        // ENTER en el input para enviar mensaje
        if (event.key === 'Enter' && event.target === chatInput) {
            sendMessage();
            event.preventDefault();
            return;
        }
        // No procesar otras teclas cuando el chat está abierto
        if (event.target !== chatInput) {
            event.preventDefault();
            return;
        }
    }
    
    // Manejar tecla de espacio para interacción
    if (event.key === ' ' || event.key === 'Spacebar') {
        if (!keys.space && gameState.canInteract && !gameState.dialogOpen) {
            keys.space = true;
            openChat();
        }
        event.preventDefault();
        return;
    }
    
    // Manejar teclas de movimiento
    if (keys.hasOwnProperty(key) || keys.hasOwnProperty(event.key)) {
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
            keys[key] = true;
        } else {
            keys[event.key] = true;
        }
        event.preventDefault();
    }
}

/**
 * Maneja el evento de tecla liberada
 * @param {KeyboardEvent} event - Evento del teclado
 */
function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    
    // Manejar liberación de tecla de espacio
    if (event.key === ' ' || event.key === 'Spacebar') {
        keys.space = false;
        return;
    }
    
    if (keys.hasOwnProperty(key) || keys.hasOwnProperty(event.key)) {
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
            keys[key] = false;
        } else {
            keys[event.key] = false;
        }
    }
}

/**
 * Inicializa los event listeners de entrada
 */
function initializeInputHandlers() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}