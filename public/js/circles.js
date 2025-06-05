/**
 * circles.js - Definición y lógica de los círculos
 * Contiene las propiedades y comportamientos de todos los círculos
 */

// Obtener canvas para las dimensiones
const canvas = document.getElementById('gameCanvas');

/**
 * Clase para círculos NPC con comportamiento automático
 */
class NPCCircle {
    constructor(config, personalityConfig, startX = null, startY = null) {
        this.x = startX || Math.random() * (canvas.width - config.radius * 2) + config.radius;
        this.y = startY || Math.random() * (canvas.height - config.radius * 2) + config.radius;
        this.radius = config.radius;
        this.color = config.color;
        this.strokeColor = config.strokeColor;
        this.speed = config.speed;
        this.waitInterval = config.waitInterval;
        this.minDistance = config.minDistance;
        this.maxDistance = config.maxDistance;
        
        // Propiedades de personalidad
        this.name = personalityConfig.name;
        this.personality = personalityConfig.personality;
        this.chatColor = personalityConfig.chatColor;
        this.id = personalityConfig.id; // Identificador único para el chat
        
        // Estado de movimiento
        this.targetX = 0;
        this.targetY = 0;
        this.isMoving = false;
        this.waitTimer = 0;
    }

    /**
     * Genera una nueva posición objetivo aleatoria
     */
    generateNewTarget() {
        let newX, newY, distance;
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
            newX = Math.random() * (canvas.width - this.radius * 2) + this.radius;
            newY = Math.random() * (canvas.height - this.radius * 2) + this.radius;
            
            const dx = newX - this.x;
            const dy = newY - this.y;
            distance = Math.sqrt(dx * dx + dy * dy);
            
            attempts++;
        } while (distance < this.minDistance && attempts < maxAttempts);
        
        // Si no encontramos una posición suficientemente lejana, forzar una
        if (distance < this.minDistance) {
            const angle = Math.random() * 2 * Math.PI;
            const targetDistance = this.minDistance + Math.random() * (this.maxDistance - this.minDistance);
            
            newX = this.x + Math.cos(angle) * targetDistance;
            newY = this.y + Math.sin(angle) * targetDistance;
            
            // Asegurar que esté dentro del canvas
            newX = Math.max(this.radius, Math.min(canvas.width - this.radius, newX));
            newY = Math.max(this.radius, Math.min(canvas.height - this.radius, newY));
        }
        
        this.targetX = newX;
        this.targetY = newY;
    }

    /**
     * Actualiza la posición del círculo NPC
     */
    updatePosition() {
        // Si el juego está pausado, no actualizar
        if (gameState.isPaused) {
            return;
        }
        
        if (!this.isMoving) {
            // Círculo está esperando
            this.waitTimer++;
            
            if (this.waitTimer >= this.waitInterval) {
                this.generateNewTarget();
                this.isMoving = true;
                this.waitTimer = 0;
            }
        } else {
            // Círculo está en movimiento hacia el objetivo
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.speed) {
                const moveX = (dx / distance) * this.speed;
                const moveY = (dy / distance) * this.speed;
                
                this.x += moveX;
                this.y += moveY;
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
        
        if (this.isMoving) {
            return "Moving";
        } else {
            const timeRemaining = Math.ceil((this.waitInterval - this.waitTimer) / 60);
            return `Waiting (${timeRemaining}s)`;
        }
    }
}

// Configuraciones de personalidad con identificadores únicos
const BLUE_PERSONALITY = {
    id: "blue_circle",
    name: "Círculo Azul",
    chatColor: "#0066ff",
    personality: "sabio y tranquilo, le gusta la filosofía y hablar de temas profundos. Es el más viejo del canvas y siempre da consejos reflexivos."
};

const GREEN_PERSONALITY = {
    id: "green_circle",
    name: "Círculo Verde",
    chatColor: "#00cc44", 
    personality: "energético y aventurero, siempre está emocionado y habla de deportes, viajes y nuevas experiencias. Le encanta explorar el canvas."
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

// Crear círculos NPC con personalidades
const blueCircle = new NPCCircle(BLUE_CIRCLE_CONFIG, BLUE_PERSONALITY);
const greenCircle = new NPCCircle(GREEN_CIRCLE_CONFIG, GREEN_PERSONALITY);

// Array de círculos NPC para facilitar operaciones en lote
const npcCircles = [blueCircle, greenCircle];

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
 * Actualiza las posiciones de todos los círculos NPC
 */
function updateNPCCirclesPosition() {
    npcCircles.forEach(circle => circle.updatePosition());
}

// Mantener compatibilidad con funciones específicas existentes
function updateBlueCirclePosition() {
    blueCircle.updatePosition();
}

function generateNewTarget() {
    blueCircle.generateNewTarget();
}