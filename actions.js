// Obtener elementos del DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const positionDisplay = document.getElementById('position');

// Propiedades del círculo
const circle = {
    x: canvas.width / 2,  // Posición inicial en el centro
    y: canvas.height / 2,
    radius: 25,
    color: '#ff0000',
    speed: 5
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
    ArrowRight: false
};

/**
 * Maneja el evento de tecla presionada
 * @param {KeyboardEvent} event - Evento del teclado
 */
function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    
    if (keys.hasOwnProperty(key) || keys.hasOwnProperty(event.key)) {
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
            keys[key] = true;
        } else {
            keys[event.key] = true;
        }
        event.preventDefault(); // Previene el comportamiento por defecto del navegador
    }
}

/**
 * Maneja el evento de tecla liberada
 * @param {KeyboardEvent} event - Evento del teclado
 */
function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    
    if (keys.hasOwnProperty(key) || keys.hasOwnProperty(event.key)) {
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
            keys[key] = false;
        } else {
            keys[event.key] = false;
        }
    }
}

/**
 * Actualiza la posición del círculo basándose en las teclas presionadas
 */
function updatePosition() {
    // Movimiento vertical
    if (keys.w || keys.ArrowUp) {
        circle.y -= circle.speed;
    }
    if (keys.s || keys.ArrowDown) {
        circle.y += circle.speed;
    }
    
    // Movimiento horizontal
    if (keys.a || keys.ArrowLeft) {
        circle.x -= circle.speed;
    }
    if (keys.d || keys.ArrowRight) {
        circle.x += circle.speed;
    }

    // Restricciones de límites del canvas
    // Límite izquierdo
    if (circle.x - circle.radius < 0) {
        circle.x = circle.radius;
    }
    // Límite derecho
    if (circle.x + circle.radius > canvas.width) {
        circle.x = canvas.width - circle.radius;
    }
    // Límite superior
    if (circle.y - circle.radius < 0) {
        circle.y = circle.radius;
    }
    // Límite inferior
    if (circle.y + circle.radius > canvas.height) {
        circle.y = canvas.height - circle.radius;
    }

    // Actualizar la visualización de posición
    updatePositionDisplay();
}

/**
 * Actualiza el texto que muestra la posición actual del círculo
 */
function updatePositionDisplay() {
    positionDisplay.textContent = `X: ${Math.round(circle.x)}, Y: ${Math.round(circle.y)}`;
}

/**
 * Dibuja el círculo en el canvas
 */
function drawCircle() {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    ctx.fillStyle = circle.color;
    ctx.fill();
    
    // Añadir borde al círculo
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * Limpia completamente el canvas
 */
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Loop principal del juego - se ejecuta continuamente
 */
function gameLoop() {
    clearCanvas();
    updatePosition();
    drawCircle();
    requestAnimationFrame(gameLoop);
}

/**
 * Inicializa el juego y configura los event listeners
 */
function initializeGame() {
    // Configurar event listeners para el teclado
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Configurar el canvas para recibir el foco del teclado
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
    
    // Inicializar la visualización de posición
    updatePositionDisplay();
    
    // Iniciar el loop del juego
    gameLoop();
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', initializeGame);