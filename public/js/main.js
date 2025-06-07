/**
 * main.js - Archivo principal del juego con soporte táctil completo
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

    startGameMusic();


    // Reanudar el juego si estaba pausado
    resumeGame();

    console.log('Juego iniciado - Modal cerrado');

    // Asegurar que los controles táctiles sean visibles si están habilitados
    if (typeof touchControls !== 'undefined' && touchControls.enabled) {
        updateTouchControlsVisibility();
    }
}

function showInstructions() {
    modalState.modalVisible = true;
    instructionsModal.style.display = 'flex';
    instructionsModal.classList.remove('hidden');

    // Pausar el juego cuando se muestran las instrucciones
    if (modalState.gameStarted) {
        pauseGame();
    }

    // Ocultar controles táctiles mientras se muestran instrucciones
    if (typeof touchControls !== 'undefined' && touchControls.enabled) {
        updateTouchControlsVisibility();
    }
}

function closeInstructions() {
    if (modalState.gameStarted) {
        modalState.modalVisible = false;
        instructionsModal.classList.add('hidden');
        instructionsModal.style.display = 'none';

        // Reanudar el juego
        resumeGame();

        // Mostrar controles táctiles nuevamente
        if (typeof touchControls !== 'undefined' && touchControls.enabled) {
            updateTouchControlsVisibility();
        }
    }
}

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

        // Actualizar controles táctiles si están habilitados
        if (typeof updateTouchControls === 'function') {
            updateTouchControls();
        }
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
 * Ajusta el tamaño del canvas y controles para dispositivos móviles
 */
function setupMobileLayout() {
    if (typeof isMobileDevice !== 'function' || !isMobileDevice()) return;

    const canvas = document.getElementById('gameCanvas');
    const container = canvas.parentElement;

    // Hacer el juego responsive
    canvas.style.maxWidth = '100vw';
    canvas.style.maxHeight = '70vh'; // Dejar espacio para controles
    canvas.style.width = 'auto';
    canvas.style.height = 'auto';

    // Ajustar el contenedor
    if (container) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'flex-start';
        container.style.padding = '10px';
        container.style.paddingBottom = '140px'; // Espacio para controles táctiles
    }

    // Prevenir zoom en dispositivos móviles
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    } else {
        const newViewport = document.createElement('meta');
        newViewport.name = 'viewport';
        newViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(newViewport);
    }

    console.log('📱 Layout móvil configurado');
}

/**
 * Actualiza las instrucciones del modal para mostrar controles apropiados
 */
function updateInstructionsForDevice() {
    const instructionsContent = document.querySelector('#instructionsModal .instructions-content');
    if (!instructionsContent) return;

    // Buscar la sección de controles
    let controlsSection = instructionsContent.querySelector('.controls-section');

    // Si no existe, crearla
    if (!controlsSection) {
        controlsSection = document.createElement('div');
        controlsSection.className = 'controls-section';

        // Insertar después del h3 "Controls:"
        const h3 = instructionsContent.querySelector('h3');
        if (h3) {
            h3.parentNode.insertBefore(controlsSection, h3.nextSibling);
            // Ocultar las instrucciones originales
            let nextSibling = controlsSection.nextSibling;
            while (nextSibling && nextSibling.tagName !== 'DIV') {
                const toHide = nextSibling;
                nextSibling = nextSibling.nextSibling;
                if (toHide.textContent.includes('Move the red circle') ||
                    toHide.textContent.includes('keys or arrow keys') ||
                    toHide.textContent.includes('press') ||
                    toHide.textContent.includes('Close dialogs')) {
                    toHide.style.display = 'none';
                }
            }
        }
    }

    if (typeof isMobileDevice === 'function' && isMobileDevice()) {
        // Instructions for mobile
        controlsSection.innerHTML = `
        <div class="mobile-instructions">
            <p><strong>Movement:</strong> Use the virtual joystick in the bottom left corner</p>
            <p><strong>Interaction:</strong> Tap the yellow button when it appears near an animal</p>
            <p><strong>Chat:</strong> Tap on the text field to write</p>
            <p><strong>Exit chat:</strong> Use the "Close" button or swipe down</p>
        </div>
    `;
    } else {
        // Instructions for desktop (original)
        controlsSection.innerHTML = `
        <div class="desktop-instructions">
            <p><strong>Movement:</strong> Use WASD keys or arrow keys</p>
            <p><strong>Interaction:</strong> Press SPACE when you see the indicator</p>
            <p><strong>Chat:</strong> Type your message and press ENTER to send</p>
            <p><strong>Exit chat:</strong> Press ESC or the "Close" button</p>
        </div>
    `;
    }

    // Añadir estilos específicos para las instrucciones si no existen
    if (!document.querySelector('#instructions-styles')) {
        const style = document.createElement('style');
        style.id = 'instructions-styles';
        style.textContent = `
            .mobile-instructions, .desktop-instructions {
                text-align: left;
                margin: 15px 0;
            }
            
            .mobile-instructions p, .desktop-instructions p {
                margin: 10px 0;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                border-left: 4px solid #4CAF50;
            }
            
            .controls-section {
                margin: 15px 0;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Inicializa el juego y configura todos los sistemas
 */
function initializeGame() {
    // Configurar layout para el dispositivo actual
    setupMobileLayout();

    // Actualizar instrucciones según el dispositivo
    updateInstructionsForDevice();

    // Configurar el canvas para recibir el foco del teclado
    canvas.setAttribute('tabindex', '0');
    canvas.focus();

    // Inicializar todos los sistemas
    initializeInputHandlers(); // Ahora incluye detección automática de dispositivo
    initializeChatHandlers();

    // Configurar event listeners del modal
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            console.log('Botón "Comenzar Juego" presionado');
            startGame();
        });

        // Añadir soporte táctil para el botón de inicio
        if (typeof isMobileDevice === 'function' && isMobileDevice()) {
            startGameBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                console.log('Botón "Comenzar Juego" tocado');
                startGame();
            });
        }
    }

    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            console.log('Botón de ayuda presionado');
            showInstructions();
        });

        // Añadir soporte táctil para el botón de ayuda
        if (typeof isMobileDevice === 'function' && isMobileDevice()) {
            helpBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                console.log('Botón de ayuda tocado');
                showInstructions();
            });
        }
    }

    // Event listener adicional para el ESC en el modal
    document.addEventListener('keydown', handleModalKeyDown);

    // Pausar el juego inicialmente hasta que se presione "Comenzar"
    pauseGame();

    // Renderizado inicial
    render();

    // Iniciar el loop del juego
    gameLoop();

    // Log de inicialización con información del dispositivo
    const deviceInfo = (typeof isMobileDevice === 'function' && isMobileDevice()) ? '📱 Móvil' : '🖥️ Escritorio';
    console.log(`🎮 Dvdrg Farm inicializado - ${deviceInfo}`);

    if (typeof getInputSystemInfo === 'function') {
        console.log('🎯 Sistema de input:', getInputSystemInfo());
    }
}

/**
 * Maneja cambios de orientación en dispositivos móviles
 */
function handleOrientationChange() {
    if (typeof isMobileDevice !== 'function' || !isMobileDevice()) return;

    setTimeout(() => {
        setupMobileLayout();

        // Recalcular posiciones de controles táctiles si es necesario
        if (typeof touchControls !== 'undefined' && touchControls.enabled) {
            updateTouchControlsVisibility();
        }

        console.log('📱 Orientación cambiada, layout actualizado');
    }, 100);
}

/**
 * Maneja cambios de tamaño de ventana
 */
function handleResize() {
    handleOrientationChange();
}

// Event listeners para cambios de orientación y tamaño
window.addEventListener('orientationchange', handleOrientationChange);
window.addEventListener('resize', handleResize);

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', initializeGame);