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

// Configuración del círculo rojo (jugador)
const RED_CIRCLE_CONFIG = {
    radius: 25,
    color: '#ff0000',
    strokeColor: '#cc0000',
    speed: 5
};

// Configuración del círculo azul (NPC)
const BLUE_CIRCLE_CONFIG = {
    radius: 20,
    color: '#0066ff',
    strokeColor: '#0044cc',
    speed: 8,
    waitInterval: 300, // 5 segundos a 60 FPS
    minDistance: 150,
    maxDistance: 300
};

// Configuración del círculo verde (NPC)
const GREEN_CIRCLE_CONFIG = {
    radius: 18,
    color: '#00cc44',
    strokeColor: '#009933',
    speed: 6,
    waitInterval: 240, // 4 segundos a 60 FPS
    minDistance: 120,
    maxDistance: 250
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
    pulseSpeed: 0.01          // Velocidad del efecto de pulso
};