/**
 * main.js - Archivo principal del juego
 * Coordina todos los sistemas y maneja el loop principal
 */

// Estado específico para el modal de instrucciones
let modalState = {
    gameStarted: false,
    modalVisible: true
};

// Referencias a elementos del DOM del modal
const instructionsModal = document.getElementById('instructionsModal');
const startGameBtn = document.getElementById('startGameBtn');
const helpBtn = document.getElementById('helpBtn');

/**
 * Funciones para manejar el modal de instrucciones
 */
function startGame() {
    modalState.gameStarted = true;
    modalState.modalVisible = false;
    
    // Ocultar modal
    instructionsModal.classList.add('hidden');
    instructionsModal.style.display = 'none';
    
    // Mostrar botón de ayuda
    helpBtn.classList.remove('hidden');
    
    // Mostrar notificación de inicio
    // showPixelNotification('Game Started!');
    
    // Reanudar el juego si estaba pausado
    resumeGame();
    
    console.log('Juego iniciado - Modal cerrado');
}

function showInstructions() {
    modalState.modalVisible = true;
    instructionsModal.style.display = 'flex';
    instructionsModal.classList.remove('hidden');
    
    // Pausar el juego cuando se muestran las instrucciones
    if (modalState.gameStarted) {
        pauseGame();
    }
}

function closeInstructions() {
    if (modalState.gameStarted) {
        modalState.modalVisible = false;
        instructionsModal.classList.add('hidden');
        instructionsModal.style.display = 'none';
        
        // Reanudar el juego
        resumeGame();
    }
}

/**
 * Función para mostrar notificación pixelada
 */
// function showPixelNotification(message) {
//     const notification = document.createElement('div');
//     notification.className = 'pixel-notification';
//     notification.textContent = message;
//     notification.style.cssText = `
//         position: fixed;
//         top: 50%;
//         left: 50%;
//         transform: translate(-50%, -50%);
//         background-color: var(--bg-secondary);
//         color: var(--text-primary);
//         padding: 16px;
//         border: 4px solid var(--border-dark);
//         box-shadow: var(--shadow-pixel);
//         font-family: 'Courier New', monospace;
//         font-size: 16px;
//         font-weight: bold;
//         text-transform: uppercase;
//         z-index: 1001;
//         animation: pixelNotificationShow 0.3s steps(3, end);
//     `;
    
//     document.body.appendChild(notification);
    
//     setTimeout(() => {
//         if (notification.parentNode) {
//             notification.remove();
//         }
//     }, 2000);
// }

/**
 * Manejo de eventos adicionales para el modal
 */
function handleModalKeyDown(event) {
    // Cerrar instrucciones con ESC (solo si ya se inició el juego)
    if (event.key === 'Escape' && modalState.gameStarted && modalState.modalVisible) {
        closeInstructions();
        event.preventDefault();
    }
}

/**
 * Actualiza toda la lógica del juego
 */
function updateGame() {
    // Solo actualizar si el juego ha comenzado y el modal no está visible
    if (modalState.gameStarted && !modalState.modalVisible) {
        updateRedCirclePosition();
        updateNPCCirclesPosition();
        updateInteractionState();
        handleCollisions();
    }
}

/**
 * Loop principal del juego - se ejecuta continuamente
 */
function gameLoop() {
    // Solo actualizar la lógica del juego si no estamos en el modal inicial
    if (modalState.gameStarted || !modalState.modalVisible) {
        updateGame();
    }
    
    // Renderizar siempre (para que se vea el fondo)
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
    
    // Configurar event listeners del modal
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            console.log('Botón "Comenzar Juego" presionado');
            startGame();
        });
    }
    
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            console.log('Botón de ayuda presionado');
            showInstructions();
        });
    }
    
    // Event listener adicional para el ESC en el modal
    document.addEventListener('keydown', handleModalKeyDown);
    
    // Pausar el juego inicialmente hasta que se presione "Comenzar"
    pauseGame();
    
    // Renderizado inicial
    render();
    
    // Iniciar el loop del juego
    gameLoop();
    
    console.log('🎮 Dvdrg Farm inicializado con modal de instrucciones');
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', initializeGame);