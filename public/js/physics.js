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
 * Calcula la distancia exacta entre dos círculos
 * @param {Object} circle1 - Primer círculo
 * @param {Object} circle2 - Segundo círculo
 * @returns {number} - Distancia entre los bordes de los círculos
 */
function calculateDistance(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = circle1.radius + circle2.radius;
    
    return distance - minDistance;
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
 * Encuentra el NPC más cercano al círculo rojo que esté en proximidad
 * @returns {Object|null} - El NPC más cercano o null si ninguno está cerca
 */
function findClosestNPCInProximity() {
    let closestNPC = null;
    let closestDistance = Infinity;
    
    npcCircles.forEach(npc => {
        if (detectProximity(redCircle, npc)) {
            const distance = calculateDistance(redCircle, npc);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNPC = npc;
            }
        }
    });
    
    return closestNPC;
}

/**
 * Resuelve la colisión entre el círculo rojo y un círculo NPC
 * @param {Object} npcCircle - El círculo NPC que colisiona
 */
function resolveCollisionWithRed(npcCircle) {
    const dx = redCircle.x - npcCircle.x;
    const dy = redCircle.y - npcCircle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        const overlap = (redCircle.radius + npcCircle.radius) - distance;
        const separationX = (dx / distance) * overlap;
        const separationY = (dy / distance) * overlap;
        
        // Solo mover el círculo rojo
        redCircle.x += separationX;
        redCircle.y += separationY;
        
        applyBoundaryConstraints(redCircle);
    }
}

/**
 * Maneja todas las colisiones del juego
 */
function handleCollisions() {
    // Verificar colisiones entre el círculo rojo y cada círculo NPC
    npcCircles.forEach(npcCircle => {
        if (detectCollision(redCircle, npcCircle)) {
            resolveCollisionWithRed(npcCircle);
        }
    });
}

/**
 * Actualiza el estado de interacción con prioridad por proximidad
 */
function updateInteractionState() {
    // Encontrar el NPC más cercano en proximidad
    const closestNPC = findClosestNPCInProximity();
    
    if (closestNPC && !gameState.dialogOpen) {
        setCanInteract(true);
        setActiveNPC(closestNPC);
        showInteractionHint();
    } else if (!closestNPC) {
        setCanInteract(false);
        setActiveNPC(null);
        hideInteractionHint();
    }
    // Si hay diálogo abierto, mantener el estado actual
}