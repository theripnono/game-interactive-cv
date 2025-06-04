/**
 * circles.js - Definición y lógica de los círculos
 * Contiene las propiedades y comportamientos de ambos círculos
 */

// Obtener canvas para las dimensiones
const canvas = document.getElementById('gameCanvas');

// Propiedades del círculo rojo (controlado por el jugador)
const redCircle = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: RED_CIRCLE_CONFIG.radius,
    color: RED_CIRCLE_CONFIG.color,
    strokeColor: RED_CIRCLE_CONFIG.strokeColor,
    speed: RED_CIRCLE_CONFIG.speed
};

// Propiedades del círculo azul (movimiento por intervalos)
const blueCircle = {
    x: Math.random() * (canvas.width - 50) + 25,
    y: Math.random() * (canvas.height - 50) + 25,
    radius: BLUE_CIRCLE_CONFIG.radius,
    color: BLUE_CIRCLE_CONFIG.color,
    strokeColor: BLUE_CIRCLE_CONFIG.strokeColor,
    targetX: 0,
    targetY: 0,
    isMoving: false,
    speed: BLUE_CIRCLE_CONFIG.speed,
    waitTimer: 0,
    waitInterval: BLUE_CIRCLE_CONFIG.waitInterval,
    minDistance: BLUE_CIRCLE_CONFIG.minDistance,
    maxDistance: BLUE_CIRCLE_CONFIG.maxDistance
};

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

    // Restricciones de límites del canvas
    applyBoundaryConstraints(redCircle);
}

/**
 * Genera una nueva posición objetivo aleatoria para el círculo azul
 */
function generateNewTarget() {
    let newX, newY, distance;
    let attempts = 0;
    const maxAttempts = 50;
    
    do {
        newX = Math.random() * (canvas.width - blueCircle.radius * 2) + blueCircle.radius;
        newY = Math.random() * (canvas.height - blueCircle.radius * 2) + blueCircle.radius;
        
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
    // Si el juego está pausado, no actualizar
    if (gameState.isPaused) {
        return;
    }
    
    if (!blueCircle.isMoving) {
        // Círculo está esperando
        blueCircle.waitTimer++;
        
        if (blueCircle.waitTimer >= blueCircle.waitInterval) {
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
            const moveX = (dx / distance) * blueCircle.speed;
            const moveY = (dy / distance) * blueCircle.speed;
            
            blueCircle.x += moveX;
            blueCircle.y += moveY;
        } else {
            // Llegó al objetivo
            blueCircle.x = blueCircle.targetX;
            blueCircle.y = blueCircle.targetY;
            blueCircle.isMoving = false;
            blueCircle.waitTimer = 0;
        }
    }
}