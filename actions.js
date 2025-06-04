// Obtener elementos del DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const positionDisplay = document.getElementById('position');

// Propiedades del círculo rojo (controlado por el jugador)
const redCircle = {
    x: canvas.width / 2,  // Posición inicial en el centro
    y: canvas.height / 2,
    radius: 25,
    color: '#ff0000',
    strokeColor: '#cc0000',
    speed: 5
};

// Propiedades del círculo azul (movimiento aleatorio)
const blueCircle = {
    x: Math.random() * (canvas.width - 50) + 25, // Posición inicial aleatoria
    y: Math.random() * (canvas.height - 50) + 25,
    radius: 20,
    color: '#0066ff',
    strokeColor: '#0044cc',
    speed: 2,
    direction: {
        x: (Math.random() - 0.5) * 2, // Dirección aleatoria entre -1 y 1
        y: (Math.random() - 0.5) * 2
    },
    changeDirectionTimer: 0,
    changeDirectionInterval: Math.random() * 120 + 60 // Cambiar dirección cada 1-3 segundos aprox
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
 * Actualiza la posición del círculo rojo basándose en las teclas presionadas
 */
function updateRedCirclePosition() {
    // Movimiento vertical
    if (keys.w || keys.ArrowUp) {
        redCircle.y -= redCircle.speed;
    }
    if (keys.s || keys.ArrowDown) {
        redCircle.y += redCircle.speed;
    }
    
    // Movimiento horizontal
    if (keys.a || keys.ArrowLeft) {
        redCircle.x -= redCircle.speed;
    }
    if (keys.d || keys.ArrowRight) {
        redCircle.x += redCircle.speed;
    }

    // Restricciones de límites del canvas para el círculo rojo
    applyBoundaryConstraints(redCircle);

    // Actualizar la visualización de posición
    updatePositionDisplay();
}

/**
 * Actualiza la posición del círculo azul con movimiento aleatorio
 */
function updateBlueCirclePosition() {
    // Incrementar el temporizador
    blueCircle.changeDirectionTimer++;
    
    // Cambiar dirección aleatoriamente en intervalos
    if (blueCircle.changeDirectionTimer >= blueCircle.changeDirectionInterval) {
        blueCircle.direction.x = (Math.random() - 0.5) * 2;
        blueCircle.direction.y = (Math.random() - 0.5) * 2;
        blueCircle.changeDirectionTimer = 0;
        blueCircle.changeDirectionInterval = Math.random() * 120 + 60; // Nuevo intervalo aleatorio
    }
    
    // Mover el círculo azul
    blueCircle.x += blueCircle.direction.x * blueCircle.speed;
    blueCircle.y += blueCircle.direction.y * blueCircle.speed;
    
    // Rebotar en los bordes del canvas
    if (blueCircle.x - blueCircle.radius <= 0 || blueCircle.x + blueCircle.radius >= canvas.width) {
        blueCircle.direction.x *= -1; // Invertir dirección horizontal
        blueCircle.x = Math.max(blueCircle.radius, Math.min(canvas.width - blueCircle.radius, blueCircle.x));
    }
    
    if (blueCircle.y - blueCircle.radius <= 0 || blueCircle.y + blueCircle.radius >= canvas.height) {
        blueCircle.direction.y *= -1; // Invertir dirección vertical
        blueCircle.y = Math.max(blueCircle.radius, Math.min(canvas.height - blueCircle.radius, blueCircle.y));
    }
}

/**
 * Aplica restricciones de límites del canvas a un círculo
 * @param {Object} circle - El círculo al que aplicar las restricciones
 */
function applyBoundaryConstraints(circle) {
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
}

/**
 * Actualiza el texto que muestra la posición actual del círculo rojo
 */
function updatePositionDisplay() {
    positionDisplay.textContent = `Red Circle - X: ${Math.round(redCircle.x)}, Y: ${Math.round(redCircle.y)}`;
}

/**
 * Dibuja un círculo en el canvas
 * @param {Object} circle - El círculo a dibujar
 */
function drawCircle(circle) {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    ctx.fillStyle = circle.color;
    ctx.fill();
    
    // Añadir borde al círculo
    ctx.strokeStyle = circle.strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * Dibuja todos los círculos en el canvas
 */
function drawAllCircles() {
    drawCircle(redCircle);
    drawCircle(blueCircle);
}

/**
 * Limpia completamente el canvas
 */
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Detecta colisión entre dos círculos
 * @param {Object} circle1 - Primer círculo
 * @param {Object} circle2 - Segundo círculo
 * @returns {boolean} - True si hay colisión, false si no
 */
function detectCollision(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (circle1.radius + circle2.radius);
}

/**
 * Maneja la colisión entre círculos
 */
function handleCollisions() {
    if (detectCollision(redCircle, blueCircle)) {
        // Cambiar la dirección del círculo azul aleatoriamente cuando colisiona
        blueCircle.direction.x = (Math.random() - 0.5) * 2;
        blueCircle.direction.y = (Math.random() - 0.5) * 2;
        
        // Separar los círculos para evitar que se queden pegados
        const dx = redCircle.x - blueCircle.x;
        const dy = redCircle.y - blueCircle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const overlap = (redCircle.radius + blueCircle.radius) - distance;
            const separationX = (dx / distance) * (overlap / 2);
            const separationY = (dy / distance) * (overlap / 2);
            
            blueCircle.x -= separationX;
            blueCircle.y -= separationY;
            redCircle.x += separationX;
            redCircle.y += separationY;
            
            // Aplicar restricciones de límites después de la separación
            applyBoundaryConstraints(redCircle);
            applyBoundaryConstraints(blueCircle);
        }
    }
}

/**
 * Actualiza todas las posiciones y lógica del juego
 */
function updateGame() {
    updateRedCirclePosition();
    updateBlueCirclePosition();
    handleCollisions();
}

/**
 * Loop principal del juego - se ejecuta continuamente
 */
function gameLoop() {
    clearCanvas();
    updateGame();
    drawAllCircles();
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