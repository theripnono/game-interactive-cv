/**
 * main.js - Archivo principal del juego
 * Coordina todos los sistemas y maneja el loop principal
 */

/**
 * Actualiza toda la lógica del juego
 */
function updateGame() {
    updateRedCirclePosition();
    updateNPCCirclesPosition(); // Actualiza todos los círculos NPC de una vez
    updateInteractionState();
    handleCollisions();
}

/**
 * Loop principal del juego - se ejecuta continuamente
 */
function gameLoop() {
    updateGame();
    render();
    requestAnimationFrame(gameLoop);
}

/**
 * Inicializa el juego y configura todos los sistemas
 */
function initializeGame() {
    // Configurar el canvas para recibir el foco del teclado
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
    
    // Inicializar todos los sistemas
    initializeInputHandlers();
    initializeChatHandlers();
    
    // Renderizado inicial
    render();
    
    // Iniciar el loop del juego
    gameLoop();
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', initializeGame);