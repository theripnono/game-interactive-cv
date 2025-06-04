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

// Propiedades del círculo azul (movimiento por intervalos)
const blueCircle = {
    x: Math.random() * (canvas.width - 50) + 25, // Posición inicial aleatoria
    y: Math.random() * (canvas.height - 50) + 25,
    radius: 20,
    color: '#0066ff',
    strokeColor: '#0044cc',
    targetX: 0,
    targetY: 0,
    isMoving: false,
    speed: 5, // Velocidad alta para movimientos largos
    waitTimer: 0,
    waitInterval: 300, // 5 segundos a 60 FPS (5 * 60 = 300 frames)
    minDistance: 150, // Distancia mínima para los saltos
    maxDistance: 300  // Distancia máxima para los saltos
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
 * Genera una nueva posición objetivo aleatoria para el círculo azul
 * que esté a una distancia considerable de la posición actual
 */
function generateNewTarget() {
    let newX, newY, distance;
    let attempts = 0;
    const maxAttempts = 50;
    
    do {
        // Generar posición aleatoria dentro del canvas
        newX = Math.random() * (canvas.width - blueCircle.radius * 2) + blueCircle.radius;
        newY = Math.random() * (canvas.height - blueCircle.radius * 2) + blueCircle.radius;
        
        // Calcular distancia desde la posición actual
        const dx = newX - blueCircle.x;
        const dy = newY - blueCircle.y;
        distance = Math.sqrt(dx * dx + dy * dy);
        
        attempts++;
    } while (distance < blueCircle.minDistance && attempts < maxAttempts);
    
    // Si no encontramos una posición suficientemente lejana, forzar una
    if (distance < blueCircle.minDistance) {
        const angle = Math.random() * 2 * Math.PI;
        const targetDistance = blueCircle.minDistance + Math.random() * (blueCircle.maxDistance - blueCircle.minDistance);
        
        newX = blueCircle.x + Math.cos(angle) * targetDistance;
        newY = blueCircle.y + Math.sin(angle) * targetDistance;
        
        // Asegurar que esté dentro del canvas
        newX = Math.max(blueCircle.radius, Math.min(canvas.width - blueCircle.radius, newX));
        newY = Math.max(blueCircle.radius, Math.min(canvas.height - blueCircle.radius, newY));
    }
    
    blueCircle.targetX = newX;
    blueCircle.targetY = newY;
}

/**
 * Actualiza la posición del círculo azul con movimiento por intervalos
 */
function updateBlueCirclePosition() {
    if (!blueCircle.isMoving) {
        // Círculo está esperando - incrementar temporizador
        blueCircle.waitTimer++;
        
        if (blueCircle.waitTimer >= blueCircle.waitInterval) {
            // Han pasado 5 segundos, iniciar movimiento
            generateNewTarget();
            blueCircle.isMoving = true;
            blueCircle.waitTimer = 0;
        }
    } else {
        // Círculo está en movimiento hacia el objetivo
        const dx = blueCircle.targetX - blueCircle.x;
        const dy = blueCircle.targetY - blueCircle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > blueCircle.speed) {
            // Continuar movimiento hacia el objetivo
            const moveX = (dx / distance) * blueCircle.speed;
            const moveY = (dy / distance) * blueCircle.speed;
            
            blueCircle.x += moveX;
            blueCircle.y += moveY;
        } else {
            // Llegó al objetivo, parar y empezar a esperar
            blueCircle.x = blueCircle.targetX;
            blueCircle.y = blueCircle.targetY;
            blueCircle.isMoving = false;
            blueCircle.waitTimer = 0;
        }
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
 * Actualiza el texto que muestra la posición y estado de los círculos
 */
function updatePositionDisplay() {
    const timeRemaining = Math.ceil((blueCircle.waitInterval - blueCircle.waitTimer) / 60);
    const blueStatus = blueCircle.isMoving ? "Moving" : `Waiting (${timeRemaining}s)`;
    
    positionDisplay.innerHTML = `
        Red Circle - X: ${Math.round(redCircle.x)}, Y: ${Math.round(redCircle.y)}<br>
        Blue Circle - X: ${Math.round(blueCircle.x)}, Y: ${Math.round(blueCircle.y)} | Status: ${blueStatus}
    `;
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
        // Si el círculo azul está parado, forzar un nuevo movimiento inmediatamente
        if (!blueCircle.isMoving) {
            generateNewTarget();
            blueCircle.isMoving = true;
            blueCircle.waitTimer = 0;
        }
        
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