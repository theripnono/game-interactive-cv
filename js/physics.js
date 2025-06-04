/**
 * physics.js - Sistema de física del juego
 * Maneja colisiones, límites y detección de proximidad
 */

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
 * Detecta si dos círculos están en proximidad para interactuar
 * @param {Object} circle1 - Primer círculo
 * @param {Object} circle2 - Segundo círculo
 * @param {number} threshold - Distancia máxima para considerar proximidad
 * @returns {boolean} - True si están en proximidad
 */
function detectProximity(circle1, circle2, threshold = PHYSICS_CONFIG.proximityThreshold) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = circle1.radius + circle2.radius;
    
    return (distance - minDistance) <= threshold;
}

/**
 * Detecta colisión entre dos círculos
 * @param {Object} circle1 - Primer círculo
 * @param {Object} circle2 - Segundo círculo
 * @returns {boolean} - True si hay colisión
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
        // Solo afecta al círculo rojo
        const dx = redCircle.x - blueCircle.x;
        const dy = redCircle.y - blueCircle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const overlap = (redCircle.radius + blueCircle.radius) - distance;
            const separationX = (dx / distance) * overlap;
            const separationY = (dy / distance) * overlap;
            
            // Solo mover el círculo rojo
            redCircle.x += separationX;
            redCircle.y += separationY;
            
            applyBoundaryConstraints(redCircle);
        }
    }
}

/**
 * Actualiza el estado de interacción entre círculos
 */
function updateInteractionState() {
    const proximity = detectProximity(redCircle, blueCircle);
    
    if (proximity && !gameState.dialogOpen) {
        setCanInteract(true);
        showInteractionHint();
    } else if (!proximity) {
        setCanInteract(false);
        hideInteractionHint();
    }
}