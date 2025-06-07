/**
 * input.js - Sistema de entrada híbrido del juego
 * Maneja eventos de teclado, táctiles y detecta el tipo de dispositivo
 */

// Variables para control táctil
let touchControls = {
    enabled: false,
    joystick: {
        active: false,
        centerX: 0,
        centerY: 0,
        currentX: 0,
        currentY: 0,
        maxDistance: 50,
        touchId: null
    },
    interactionButton: {
        active: false,
        touchId: null
    }
};

// Detectar si es un dispositivo móvil
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);
}

// Detectar si es una tablet (para usar controles híbridos)
function isTablet() {
    return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 2 && window.innerWidth > 768);
}

/**
 * Inicializa los controles táctiles
 */
function initializeTouchControls() {
    if (!isMobileDevice()) {
        return;
    }

    touchControls.enabled = true;
    createTouchUI();
    addTouchEventListeners();

}

/**
 * Crea la interfaz de usuario táctil
 */
function createTouchUI() {
    // Crear contenedor de controles táctiles
    const touchUI = document.createElement('div');
    touchUI.id = 'touchControls';
    touchUI.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        user-select: none;
    `;

    // Crear joystick virtual
    const joystickArea = document.createElement('div');
    joystickArea.id = 'joystickArea';
    joystickArea.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 20px;
        width: 120px;
        height: 120px;
        background: rgba(0, 0, 0, 0.3);
        border: 3px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        pointer-events: auto;
        touch-action: none;
    `;

    const joystickKnob = document.createElement('div');
    joystickKnob.id = 'joystickKnob';
    joystickKnob.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.8);
        border: 2px solid rgba(0, 0, 0, 0.3);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: all 0.1s ease;
        pointer-events: none;
    `;

    joystickArea.appendChild(joystickKnob);

    // Crear botón de interacción
    const interactionBtn = document.createElement('div');
    interactionBtn.id = 'interactionButton';
    interactionBtn.style.cssText = `
        position: absolute;
        bottom: 40px;
        right: 40px;
        width: 80px;
        height: 80px;
        background: rgba(255, 255, 0, 0.8);
        border: 3px solid rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        pointer-events: auto;
        touch-action: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: bold;
        color: #333;
        transition: all 0.2s ease;
    `;
    interactionBtn.innerHTML = '💬';

    // Crear indicador de estado del botón de interacción
    const interactionIndicator = document.createElement('div');
    interactionIndicator.id = 'interactionIndicator';
    interactionIndicator.style.cssText = `
        position: absolute;
        bottom: 130px;
        right: 30px;
        padding: 8px 15px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 20px;
        font-size: 14px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        max-width: 200px;
        text-align: center;
    `;

    // Añadir elementos al DOM
    touchUI.appendChild(joystickArea);
    touchUI.appendChild(interactionBtn);
    touchUI.appendChild(interactionIndicator);
    document.body.appendChild(touchUI);

    // Guardar referencias
    touchControls.joystickArea = joystickArea;
    touchControls.joystickKnob = joystickKnob;
    touchControls.interactionButton = interactionBtn;
    touchControls.interactionIndicator = interactionIndicator;
}

/**
 * Añade event listeners para eventos táctiles
 */
function addTouchEventListeners() {
    if (!touchControls.enabled) return;

    // Prevenir zoom en dispositivos móviles
    document.addEventListener('touchstart', function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevenir scroll en el canvas
    canvas.addEventListener('touchmove', function (e) {
        e.preventDefault();
    }, { passive: false });

    // Event listeners del joystick
    touchControls.joystickArea.addEventListener('touchstart', handleJoystickStart, { passive: false });
    touchControls.joystickArea.addEventListener('touchmove', handleJoystickMove, { passive: false });
    touchControls.joystickArea.addEventListener('touchend', handleJoystickEnd, { passive: false });

    // Event listeners del botón de interacción
    touchControls.interactionButton.addEventListener('touchstart', handleInteractionStart, { passive: false });
    touchControls.interactionButton.addEventListener('touchend', handleInteractionEnd, { passive: false });

    // Event listeners globales para manejar múltiples toques
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
}

/**
 * Maneja el inicio del toque en el joystick
 */
function handleJoystickStart(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = touchControls.joystickArea.getBoundingClientRect();

    touchControls.joystick.active = true;
    touchControls.joystick.touchId = touch.identifier;
    touchControls.joystick.centerX = rect.left + rect.width / 2;
    touchControls.joystick.centerY = rect.top + rect.height / 2;

    updateJoystickPosition(touch.clientX, touch.clientY);
}

/**
 * Maneja el movimiento del joystick
 */
function handleJoystickMove(e) {
    e.preventDefault();
    if (!touchControls.joystick.active) return;

    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchControls.joystick.touchId);
    if (touch) {
        updateJoystickPosition(touch.clientX, touch.clientY);
    }
}

/**
 * Maneja el final del toque en el joystick
 */
function handleJoystickEnd(e) {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchControls.joystick.touchId);
    if (touch) {
        resetJoystick();
    }
}

/**
 * Actualiza la posición del joystick y mapea a teclas
 */
function updateJoystickPosition(clientX, clientY) {
    const deltaX = clientX - touchControls.joystick.centerX;
    const deltaY = clientY - touchControls.joystick.centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Limitar al radio máximo
    const clampedDistance = Math.min(distance, touchControls.joystick.maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    touchControls.joystick.currentX = Math.cos(angle) * clampedDistance;
    touchControls.joystick.currentY = Math.sin(angle) * clampedDistance;

    // Actualizar posición visual del knob
    const knobX = touchControls.joystick.currentX;
    const knobY = touchControls.joystick.currentY;
    touchControls.joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

    // Mapear a teclas virtuales
    mapJoystickToKeys(touchControls.joystick.currentX, touchControls.joystick.currentY);
}

/**
 * Mapea la posición del joystick a teclas virtuales
 */
function mapJoystickToKeys(x, y) {
    const threshold = 20; // Umbral mínimo para activar dirección

    // Resetear todas las teclas de movimiento
    keys.w = keys.ArrowUp = false;
    keys.s = keys.ArrowDown = false;
    keys.a = keys.ArrowLeft = false;
    keys.d = keys.ArrowRight = false;

    // Activar teclas según la posición
    if (Math.abs(y) > threshold) {
        if (y < 0) keys.w = keys.ArrowUp = true;    // Arriba
        if (y > 0) keys.s = keys.ArrowDown = true;  // Abajo
    }

    if (Math.abs(x) > threshold) {
        if (x < 0) keys.a = keys.ArrowLeft = true;  // Izquierda
        if (x > 0) keys.d = keys.ArrowRight = true; // Derecha
    }
}

/**
 * Resetea el joystick a su posición central
 */
function resetJoystick() {
    touchControls.joystick.active = false;
    touchControls.joystick.touchId = null;
    touchControls.joystick.currentX = 0;
    touchControls.joystick.currentY = 0;

    // Resetear posición visual
    touchControls.joystickKnob.style.transform = 'translate(-50%, -50%)';

    // Resetear todas las teclas de movimiento
    keys.w = keys.ArrowUp = false;
    keys.s = keys.ArrowDown = false;
    keys.a = keys.ArrowLeft = false;
    keys.d = keys.ArrowRight = false;
}

/**
 * Maneja el inicio del toque en el botón de interacción
 */
function handleInteractionStart(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];

    touchControls.interactionButton.active = true;
    touchControls.interactionButton.touchId = touch.identifier;

    // Efecto visual
    touchControls.interactionButton.style.background = 'rgba(255, 255, 0, 1)';
    touchControls.interactionButton.style.transform = 'scale(0.9)';

    // Simular tecla espacio presionada
    if (!keys.space && gameState.canInteract && !gameState.dialogOpen) {
        keys.space = true;
        openChat();
    }
}

/**
 * Maneja el final del toque en el botón de interacción
 */
function handleInteractionEnd(e) {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchControls.interactionButton.touchId);
    if (touch) {
        touchControls.interactionButton.active = false;
        touchControls.interactionButton.touchId = null;

        // Resetear efecto visual
        touchControls.interactionButton.style.background = 'rgba(255, 255, 0, 0.8)';
        touchControls.interactionButton.style.transform = 'scale(1)';

        // Simular tecla espacio liberada
        keys.space = false;
    }
}

/**
 * Maneja movimientos táctiles globales
 */
function handleGlobalTouchMove(e) {
    if (!touchControls.enabled) return;

    // Manejar joystick si está activo
    if (touchControls.joystick.active) {
        const touch = Array.from(e.touches).find(t => t.identifier === touchControls.joystick.touchId);
        if (touch) {
            updateJoystickPosition(touch.clientX, touch.clientY);
        }
    }
}

/**
 * Maneja finales de toque globales
 */
function handleGlobalTouchEnd(e) {
    if (!touchControls.enabled) return;

    // Verificar si se terminó el toque del joystick
    if (touchControls.joystick.active) {
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchControls.joystick.touchId);
        if (touch) {
            resetJoystick();
        }
    }

    // Verificar si se terminó el toque del botón de interacción
    if (touchControls.interactionButton.active) {
        const touch = Array.from(e.changedTouches).find(t => t.identifier === touchControls.interactionButton.touchId);
        if (touch) {
            handleInteractionEnd(e);
        }
    }
}

/**
 * Actualiza la visibilidad y estado del botón de interacción
 */
function updateTouchInteractionButton() {
    if (!touchControls.enabled) return;

    const button = touchControls.interactionButton;
    const indicator = touchControls.interactionIndicator;

    if (gameState.canInteract && gameState.activeNPC && !gameState.dialogOpen) {
        // Hacer visible y destacar el botón
        button.style.background = 'rgba(255, 255, 0, 0.9)';
        button.style.borderColor = 'rgba(255, 255, 255, 1)';
        button.innerHTML = '💬';

        // Mostrar indicador
        indicator.textContent = `Touch to talk to ${gameState.activeNPC.name}`;
        indicator.style.opacity = '1';

        // Efecto de pulso
        button.style.animation = 'pulse 1.5s infinite';
    } else {
        // Hacer menos visible
        button.style.background = 'rgba(255, 255, 0, 0.5)';
        button.style.borderColor = 'rgba(255, 255, 255, 0.6)';
        button.innerHTML = '💬';
        button.style.animation = 'none';

        // Ocultar indicador
        indicator.style.opacity = '0';
    }
}

/**
 * Oculta/muestra controles táctiles según el contexto
 */
function updateTouchControlsVisibility() {
    if (!touchControls.enabled) return;

    const touchUI = document.getElementById('touchControls');
    if (!touchUI) return;

    if (gameState.dialogOpen) {
        // Ocultar controles cuando el chat está abierto
        touchUI.style.opacity = '0.3';
        touchUI.style.pointerEvents = 'none';
    } else {
        // Mostrar controles normalmente
        touchUI.style.opacity = '1';
        touchUI.style.pointerEvents = 'none';
        touchControls.joystickArea.style.pointerEvents = 'auto';
        touchControls.interactionButton.style.pointerEvents = 'auto';
    }
}

/**
 * Añade estilos CSS para animaciones
 */
function addTouchControlStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        #touchControls * {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
        }
        
        /* Estilos responsivos para diferentes tamaños */
        @media (max-width: 480px) {
            #joystickArea {
                width: 100px !important;
                height: 100px !important;
                bottom: 15px !important;
                left: 15px !important;
            }
            
            #interactionButton {
                width: 70px !important;
                height: 70px !important;
                bottom: 30px !important;
                right: 30px !important;
                font-size: 20px !important;
            }
            
            #interactionIndicator {
                bottom: 110px !important;
                right: 20px !important;
                font-size: 12px !important;
            }
        }
        
        @media (orientation: landscape) and (max-height: 500px) {
            #joystickArea {
                bottom: 10px !important;
                left: 10px !important;
            }
            
            #interactionButton {
                bottom: 20px !important;
                right: 20px !important;
            }
            
            #interactionIndicator {
                bottom: 80px !important;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Maneja el evento de tecla presionada (versión original + mejoras)
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
        // Si el foco está en el input del chat, no procesar teclas de movimiento
        if (event.target === chatInput) {
            return; // Permitir comportamiento normal del input
        }
        // Si no está en el input, procesar normalmente las teclas de movimiento
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
 * Maneja el evento de tecla liberada (sin cambios)
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
 * Inicializa los event listeners de entrada (híbrido)
 */
function initializeInputHandlers() {
    // Event listeners de teclado (siempre activos)
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Detectar y configurar controles táctiles si es necesario
    if (isMobileDevice()) {

        addTouchControlStyles();
        initializeTouchControls();
    } else {

    }
}

/**
 * Función pública para actualizar controles táctiles (llamar desde el loop principal)
 */
function updateTouchControls() {
    if (touchControls.enabled) {
        updateTouchInteractionButton();
        updateTouchControlsVisibility();
    }
}

/**
 * Obtiene información del sistema de input actual
 */
function getInputSystemInfo() {
    return {
        isMobile: isMobileDevice(),
        isTablet: isTablet(),
        touchEnabled: touchControls.enabled,
        joystickActive: touchControls.joystick.active,
        interactionButtonActive: touchControls.interactionButton.active,
        currentKeys: { ...keys }
    };
}