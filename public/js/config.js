/**
 * config.js - Configuración global del juego
 * Contiene todas las constantes y configuraciones centralizadas
 */

// Configuración del canvas
const CANVAS_CONFIG = {
    width: 800,
    height: 800
};

// Configuración del fondo
const BACKGROUND_CONFIG = {
    imagePath: 'assets/farm/farm_background.png',
    fallbackColor: '#4a5d23', // Verde campo
    patternColor: '#3a4d13',  // Verde más oscuro para el patrón
    patternSize: 30,          // Tamaño de los cuadros del patrón
    // scaleMode: 'cover',        // 'cover', 'contain', 'stretch'
};

// NUEVA: Configuración del área de movimiento restringida
const MOVEMENT_AREA = {
    xMin: 170,
    xMax: 640,
    yMin: 200,    // Nota: yMin es el valor más pequeño (parte superior)
    yMax: 420,    // yMax es el valor más grande (parte inferior)
    // Propiedades calculadas automáticamente
    get width() { return this.xMax - this.xMin; },
    get height() { return this.yMax - this.yMin; },
    get centerX() { return this.xMin + this.width / 2; },
    get centerY() { return this.yMin + this.height / 2; }
};

const SPRITE_CONFIG = {
    animationSpeed: 4, // Frames del juego entre cada frame de sprite

    sprites: {
        red: { // Círculo rojo = granjero (jugador)
            src: 'assets/farm/sprites/farmer_walk.png',
            frameWidth: 32,    // Cada frame mide 32px (asumiendo proporción similar)
            frameHeight: 32,   // Cada frame mide 32px 
            totalFrames: 6,    // (6 frames)
            rows: 3,
            layout: 'horizontal',
            scale: 4.0         // Tamaño apropiado para el jugador

        },
        blue: { // NPC azul = vaca
            src: 'assets/farm/sprites/BASIC_cow_walk.png',
            frameWidth: 32,    // 128 ÷ 4 = 32 píxeles por frame
            frameHeight: 35,   // La altura completa
            totalFrames: 4,
            layout: 'horizontal',
            scale: 4         // Empezar con escala 1:1, ajustar si es necesario
        },
        green: { // NPC verde = oveja
            src: 'assets/farm/sprites/BASIC_sheep_walk.png',
            frameWidth: 32,    // Asumo las mismas dimensiones, ajustar si es diferente
            frameHeight: 35,   // Asumo las mismas dimensiones, ajustar si es diferente
            totalFrames: 4,    // Asumo 4 frames, ajustar si es diferente
            layout: 'horizontal',
            scale: 3        // Un poco más pequeña que la vaca
        }
    }
};

// Configuración del círculo rojo (jugador)
const RED_CIRCLE_CONFIG = {
    radius: 25,
    color: '#ff0000',
    strokeColor: '#cc0000',
    speed: 5,
    restrictToArea: true  // NUEVA: Si el jugador también debe respetar el área
};

// Configuración del círculo azul (NPC) - Movimiento más contemplativo y amplio
const BLUE_CIRCLE_CONFIG = {
    radius: 20,
    color: '#0066ff',
    strokeColor: '#0044cc',
    speed: 6,
    waitInterval: 420,        // 7 segundos - más tiempo de reflexión
    minDistance: 80,          // Ajustado para el área más pequeña
    maxDistance: 200,         // Ajustado para el área restringida
    movementVariability: 0.8,
    restrictToArea: true      // NUEVA: Restringir a área específica
};

// Configuración del círculo verde (NPC) - Movimiento más enérgico y exploratorio
const GREEN_CIRCLE_CONFIG = {
    radius: 18,
    color: '#00cc44',
    strokeColor: '#009933',
    speed: 9,
    waitInterval: 120,        // 3 segundos - menos tiempo de espera
    minDistance: 60,          // Ajustado para el área más pequeña
    maxDistance: 180,         // Ajustado para el área restringida
    movementVariability: 1.2,
    restrictToArea: true      // NUEVA: Restringir a área específica
};

// Configuración de física
const PHYSICS_CONFIG = {
    proximityThreshold: 10 // píxeles de separación para interacción
};

// Configuración del chat
const CHAT_CONFIG = {
    maxMessageLength: 200,
    botResponseDelay: 500 // milisegundos
};

// Configuración de renderizado
const RENDER_CONFIG = {
    pixelArt: true,           // Activar renderizado pixelado
    shadowBlur: 6,            // Desenfoque de sombras
    shadowOffset: 3,          // Offset de sombras
    shadowAlpha: 0.4,         // Transparencia de sombras
    interactionGlowSize: 8,   // Tamaño del brillo de interacción
    pulseSpeed: 0.01,         // Velocidad del efecto de pulso
    showMovementArea: true    // Mostrar el área de movimiento visualmente
};

// Configuración avanzada de movimiento (modificada para área restringida)
const MOVEMENT_CONFIG = {
    // Permite movimientos ocasionales más largos o más cortos
    extremeMovementChance: 0.15, // 15% de probabilidad de movimiento extremo
    extremeMinMultiplier: 0.5,   // Multiplicador para movimientos cortos extremos
    extremeMaxMultiplier: 1.2    // Reducido para que no se salga del área
};