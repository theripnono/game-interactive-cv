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
    imagePath: 'assets/farm_background.png',
    fallbackColor: '#4a5d23', // Verde campo
    patternColor: '#3a4d13',  // Verde más oscuro para el patrón
    patternSize: 40,          // Tamaño de los cuadros del patrón
    scaleMode: 'cover'        // 'cover', 'contain', 'stretch'
};

// NUEVA: Configuración del área de movimiento restringida
const MOVEMENT_AREA = {
    xMin: 170,
    xMax: 640,
    yMin: 265,    // Nota: yMin es el valor más pequeño (parte superior)
    yMax: 510,    // yMax es el valor más grande (parte inferior)
    // Propiedades calculadas automáticamente
    get width() { return this.xMax - this.xMin; },
    get height() { return this.yMax - this.yMin; },
    get centerX() { return this.xMin + this.width / 2; },
    get centerY() { return this.yMin + this.height / 2; }
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
    waitInterval: 180,        // 3 segundos - menos tiempo de espera
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
    showMovementArea: true    // NUEVA: Mostrar el área de movimiento visualmente
};

// Configuración avanzada de movimiento (modificada para área restringida)
const MOVEMENT_CONFIG = {
    // Permite movimientos ocasionales más largos o más cortos
    extremeMovementChance: 0.15, // 15% de probabilidad de movimiento extremo
    extremeMinMultiplier: 0.5,   // Multiplicador para movimientos cortos extremos
    extremeMaxMultiplier: 1.2    // Reducido para que no se salga del área
};