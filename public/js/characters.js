/**
 * circles.js - Definición y lógica de los círculos
 * Contiene las propiedades y comportamientos de todos los círculos
 */

// Obtener canvas para las dimensiones
const canvas = document.getElementById('gameCanvas');

/**
 * Función para verificar si una posición está dentro del área permitida
 * @param {number} x - Coordenada X
 * @param {number} y - Coordenada Y
 * @param {number} radius - Radio del círculo
 * @returns {boolean} - True si está dentro del área
 */
function isWithinMovementArea(x, y, radius) {
    return (x - radius >= MOVEMENT_AREA.xMin &&
        x + radius <= MOVEMENT_AREA.xMax &&
        y - radius >= MOVEMENT_AREA.yMin &&
        y + radius <= MOVEMENT_AREA.yMax);
}

/**
 * Función para ajustar una posición al área permitida
 * @param {number} x - Coordenada X
 * @param {number} y - Coordenada Y
 * @param {number} radius - Radio del círculo
 * @returns {Object} - Posición ajustada {x, y}
 */
function constrainToMovementArea(x, y, radius) {
    const constrainedX = Math.max(MOVEMENT_AREA.xMin + radius,
        Math.min(MOVEMENT_AREA.xMax - radius, x));
    const constrainedY = Math.max(MOVEMENT_AREA.yMin + radius,
        Math.min(MOVEMENT_AREA.yMax - radius, y));
    return { x: constrainedX, y: constrainedY };
}

/**
 * Genera una posición aleatoria dentro del área de movimiento
 * @param {number} radius - Radio del círculo
 * @returns {Object} - Posición {x, y}
 */
function getRandomPositionInArea(radius) {
    const availableWidth = MOVEMENT_AREA.width - (radius * 2);
    const availableHeight = MOVEMENT_AREA.height - (radius * 2);

    return {
        x: MOVEMENT_AREA.xMin + radius + Math.random() * availableWidth,
        y: MOVEMENT_AREA.yMin + radius + Math.random() * availableHeight
    };
}

/**
 * Clase para círculos NPC con comportamiento automático
 */
class NPCCircle {
    constructor(config, personalityConfig, startX = null, startY = null) {
        // Si se especifica posición inicial, usarla; si no, generar una aleatoria en el área
        if (startX !== null && startY !== null) {
            if (config.restrictToArea) {
                const constrained = constrainToMovementArea(startX, startY, config.radius);
                this.x = constrained.x;
                this.y = constrained.y;
            } else {
                this.x = startX;
                this.y = startY;
            }
        } else {
            if (config.restrictToArea) {
                const randomPos = getRandomPositionInArea(config.radius);
                this.x = randomPos.x;
                this.y = randomPos.y;
            } else {
                this.x = Math.random() * (canvas.width - config.radius * 2) + config.radius;
                this.y = Math.random() * (canvas.height - config.radius * 2) + config.radius;
            }
        }

        this.radius = config.radius;
        this.color = config.color;
        this.strokeColor = config.strokeColor;
        this.speed = config.speed;
        this.waitInterval = config.waitInterval;
        this.minDistance = config.minDistance;
        this.maxDistance = config.maxDistance;
        this.movementVariability = config.movementVariability || 1.0;
        this.restrictToArea = config.restrictToArea || false;

        // Propiedades de personalidad
        this.name = personalityConfig.name;
        this.personality = personalityConfig.personality;
        this.chatColor = personalityConfig.chatColor;
        this.id = personalityConfig.id;

        // Estado de movimiento
        this.targetX = 0;
        this.targetY = 0;
        this.isMoving = false;
        this.waitTimer = 0;

        // Historial de movimientos para evitar patrones repetitivos
        this.lastTargets = [];
        this.maxHistorySize = 3;
    }

    /**
     * Genera una nueva posición objetivo aleatoria respetando el área restringida
     */
    generateNewTarget() {
        let newX, newY, distance;
        let attempts = 0;
        const maxAttempts = 150; // Aumentado porque el área es más pequeña

        // Aplicar variabilidad de movimiento según la personalidad
        let adjustedMinDistance = this.minDistance;
        let adjustedMaxDistance = this.maxDistance;

        // Si está restringido al área, ajustar las distancias máximas según el espacio disponible
        if (this.restrictToArea) {
            const maxPossibleDistance = Math.min(
                MOVEMENT_AREA.width,
                MOVEMENT_AREA.height
            ) * 0.8; // 80% del área como máximo

            adjustedMaxDistance = Math.min(adjustedMaxDistance, maxPossibleDistance);
        }

        // Movimientos ocasionales extremos para más variedad
        if (Math.random() < MOVEMENT_CONFIG.extremeMovementChance) {
            if (Math.random() < 0.5) {
                // Movimiento corto extremo
                adjustedMaxDistance = adjustedMinDistance * MOVEMENT_CONFIG.extremeMinMultiplier;
                adjustedMinDistance = Math.max(30, adjustedMinDistance * 0.3);
            } else {
                // Movimiento largo extremo
                adjustedMinDistance = adjustedMaxDistance * 0.8;
                adjustedMaxDistance = adjustedMaxDistance * MOVEMENT_CONFIG.extremeMaxMultiplier;

                // Asegurar que no exceda el área
                if (this.restrictToArea) {
                    const maxPossibleDistance = Math.min(
                        MOVEMENT_AREA.width,
                        MOVEMENT_AREA.height
                    ) * 0.9;
                    adjustedMaxDistance = Math.min(adjustedMaxDistance, maxPossibleDistance);
                }
            }
        }

        // Aplicar factor de variabilidad personal del NPC
        const variabilityFactor = 0.7 + (Math.random() * 0.6 * this.movementVariability);
        adjustedMaxDistance *= variabilityFactor;

        do {
            if (this.restrictToArea) {
                // Generar posición dentro del área restringida
                const randomPos = getRandomPositionInArea(this.radius);
                newX = randomPos.x;
                newY = randomPos.y;
            } else {
                // Generar posición en todo el canvas
                newX = Math.random() * (canvas.width - this.radius * 2) + this.radius;
                newY = Math.random() * (canvas.height - this.radius * 2) + this.radius;
            }

            const dx = newX - this.x;
            const dy = newY - this.y;
            distance = Math.sqrt(dx * dx + dy * dy);

            // Verificar que no sea muy similar a movimientos recientes
            const isTooSimilar = this.lastTargets.some(target => {
                const targetDx = newX - target.x;
                const targetDy = newY - target.y;
                const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
                return targetDistance < 50; // Distancia mínima entre objetivos
            });

            attempts++;

            // Verificar condiciones: distancia correcta y no muy similar a anteriores
            if (distance >= adjustedMinDistance &&
                distance <= adjustedMaxDistance &&
                !isTooSimilar) {
                break;
            }

        } while (attempts < maxAttempts);

        // Si no encontramos una posición óptima, generar usando ángulo aleatorio
        if (attempts >= maxAttempts) {
            const angle = Math.random() * 2 * Math.PI;
            const targetDistance = adjustedMinDistance + Math.random() * (adjustedMaxDistance - adjustedMinDistance);

            newX = this.x + Math.cos(angle) * targetDistance;
            newY = this.y + Math.sin(angle) * targetDistance;

            // Asegurar que esté dentro de los límites apropiados
            if (this.restrictToArea) {
                const constrained = constrainToMovementArea(newX, newY, this.radius);
                newX = constrained.x;
                newY = constrained.y;
            } else {
                newX = Math.max(this.radius + 10, Math.min(canvas.width - this.radius - 10, newX));
                newY = Math.max(this.radius + 10, Math.min(canvas.height - this.radius - 10, newY));
            }
        }

        this.targetX = newX;
        this.targetY = newY;

        // Guardar en historial
        this.lastTargets.push({ x: newX, y: newY });
        if (this.lastTargets.length > this.maxHistorySize) {
            this.lastTargets.shift();
        }
    }

    /**
     * Actualiza la posición del círculo NPC con velocidad variable
     */
    updatePosition() {
        // Si el juego está pausado, no actualizar
        if (gameState.isPaused) {
            return;
        }

        if (!this.isMoving) {
            // Círculo está esperando
            this.waitTimer++;

            // Añadir pequeña variabilidad al tiempo de espera
            const variableWaitTime = this.waitInterval + (Math.random() - 0.5) * 60; // ±1 segundo

            if (this.waitTimer >= variableWaitTime) {
                this.generateNewTarget();
                this.isMoving = true;
                this.waitTimer = 0;
            }
        } else {
            // Círculo está en movimiento hacia el objetivo
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Velocidad variable basada en la distancia (más lento cerca del objetivo)
            let currentSpeed = this.speed;
            if (distance < 50) {
                currentSpeed = this.speed * (0.3 + 0.7 * (distance / 50));
            }

            if (distance > currentSpeed) {
                const moveX = (dx / distance) * currentSpeed;
                const moveY = (dy / distance) * currentSpeed;

                this.x += moveX;
                this.y += moveY;

                // Verificar que siga dentro del área si está restringido
                if (this.restrictToArea && !isWithinMovementArea(this.x, this.y, this.radius)) {
                    const constrained = constrainToMovementArea(this.x, this.y, this.radius);
                    this.x = constrained.x;
                    this.y = constrained.y;
                }
            } else {
                // Llegó al objetivo
                this.x = this.targetX;
                this.y = this.targetY;
                this.isMoving = false;
                this.waitTimer = 0;
            }
        }
    }

    /**
     * Obtiene el estado actual del círculo para mostrar
     */
    getStatusText() {
        if (gameState.isPaused) {
            return "Paused (Dialog open)";
        }

        const areaStatus = this.restrictToArea ? " [Restricted]" : "";

        if (this.isMoving) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const remainingDistance = Math.sqrt(dx * dx + dy * dy);
            return `Moving (${Math.round(remainingDistance)}px to go)${areaStatus}`;
        } else {
            const timeRemaining = Math.ceil((this.waitInterval - this.waitTimer) / 60);
            return `Waiting (${timeRemaining}s)${areaStatus}`;
        }
    }

    /**
     * Obtiene estadísticas de movimiento del NPC
     */
    getMovementStats() {
        return {
            name: this.name,
            position: { x: Math.round(this.x), y: Math.round(this.y) },
            target: this.isMoving ? { x: Math.round(this.targetX), y: Math.round(this.targetY) } : null,
            speed: this.speed,
            movementRange: { min: this.minDistance, max: this.maxDistance },
            variability: this.movementVariability,
            isMoving: this.isMoving,
            recentTargets: this.lastTargets.length,
            restrictedToArea: this.restrictToArea,
            withinArea: this.restrictToArea ? isWithinMovementArea(this.x, this.y, this.radius) : true
        };
    }
}

// Configuraciones de personalidad con identificadores únicos
const BLUE_PERSONALITY = {
    id: "blue_circle",
    name: "Linda", // Cow
    chatColor: "#fffff",
    personality: "sabio y tranquilo, le gusta la filosofía y hablar de temas profundos. Es el más viejo del canvas y siempre da consejos reflexivos. Se mueve con propósito y contemplación dentro de su área designada."
};

const GREEN_PERSONALITY = {
    id: "green_circle",
    name: "Fannie", // Sheep
    chatColor: "#fffff",
    personality: "energético y aventurero, siempre está emocionado y habla de deportes, viajes y nuevas experiencias. Le encanta explorar su área asignada del canvas y moverse dinámicamente."
};

// Propiedades del círculo rojo (controlado por el jugador)
const redCircle = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: RED_CIRCLE_CONFIG.radius,
    color: RED_CIRCLE_CONFIG.color,
    strokeColor: RED_CIRCLE_CONFIG.strokeColor,
    speed: RED_CIRCLE_CONFIG.speed
};

// AGREGAR ESTAS LÍNEAS para el sprite del granjero:
redCircle.currentFrame = 0;
redCircle.frameCounter = 0;
redCircle.spriteImage = null;
redCircle.spriteLoaded = false;
redCircle.isMoving = false;
redCircle.facingDirection = 'down'; // CORREGIDO: dirección por defecto hacia abajo

// Crear círculos NPC con personalidades mejoradas
const blueCircle = new NPCCircle(BLUE_CIRCLE_CONFIG, BLUE_PERSONALITY);

blueCircle.currentFrame = 0;
blueCircle.frameCounter = 0;
blueCircle.spriteImage = null;
blueCircle.spriteLoaded = false;

const greenCircle = new NPCCircle(GREEN_CIRCLE_CONFIG, GREEN_PERSONALITY);

// AGREGAR ESTAS LÍNEAS para el NPC verde (oveja):
greenCircle.currentFrame = 0;
greenCircle.frameCounter = 0;
greenCircle.spriteImage = null;
greenCircle.spriteLoaded = false;

// Array de círculos NPC para facilitar operaciones en lote
const npcCircles = [blueCircle, greenCircle];

/**
 * Actualiza la posición del círculo rojo basándose en las teclas presionadas
 */
function updateRedCirclePosition() {
    // Detectar si hay movimiento para la animación
    let wasMoving = redCircle.isMoving;
    redCircle.isMoving = false;

    // Variables para detectar dirección
    let movingUp = false;
    let movingDown = false;
    let movingLeft = false;
    let movingRight = false;

    // Movimiento vertical
    if (keys.w || keys.ArrowUp) {
        redCircle.y -= redCircle.speed;
        redCircle.isMoving = true;
        movingUp = true;
    }
    if (keys.s || keys.ArrowDown) {
        redCircle.y += redCircle.speed;
        redCircle.isMoving = true;
        movingDown = true;
    }

    // Movimiento horizontal
    if (keys.a || keys.ArrowLeft) {
        redCircle.x -= redCircle.speed;
        redCircle.isMoving = true;
        movingLeft = true;
    }
    if (keys.d || keys.ArrowRight) {
        redCircle.x += redCircle.speed;
        redCircle.isMoving = true;
        movingRight = true;
    }

    // Establecer dirección: horizontal tiene prioridad (para diagonales)
    if (movingLeft) {
        redCircle.facingDirection = 'left';
    } else if (movingRight) {
        redCircle.facingDirection = 'right';
    } else if (movingUp) {
        redCircle.facingDirection = 'up';
    } else if (movingDown) {
        redCircle.facingDirection = 'down';
    }
    // Si no hay movimiento, mantener la dirección actual

    // Aplicar restricciones según la configuración
    if (RED_CIRCLE_CONFIG.restrictToArea) {
        const constrained = constrainToMovementArea(redCircle.x, redCircle.y, redCircle.radius);
        redCircle.x = constrained.x;
        redCircle.y = constrained.y;
    } else {
        applyBoundaryConstraints(redCircle);
    }
}

/**
 * Actualiza las posiciones de todos los círculos NPC
 */
function updateNPCCirclesPosition() {
    npcCircles.forEach(circle => circle.updatePosition());
}

/**
 * Obtiene estadísticas de movimiento de todos los NPCs (para debugging)
 */
function getAllMovementStats() {
    return npcCircles.map(circle => circle.getMovementStats());
}

/**
 * Fuerza a todos los NPCs a reposicionarse dentro del área (útil para testing)
 */
function forceNPCsToArea() {
    npcCircles.forEach(circle => {
        if (circle.restrictToArea) {
            const constrained = constrainToMovementArea(circle.x, circle.y, circle.radius);
            circle.x = constrained.x;
            circle.y = constrained.y;
            circle.isMoving = false; // Detener movimiento actual
            circle.waitTimer = 0;   // Reiniciar timer
        }
    });
}

// Mantener compatibilidad con funciones específicas existentes
function updateBlueCirclePosition() {
    blueCircle.updatePosition();
}

function generateNewTarget() {
    blueCircle.generateNewTarget();
}