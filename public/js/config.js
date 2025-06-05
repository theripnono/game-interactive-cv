/**
 * config.js - Configuración global del juego
 * Contiene todas las constantes y configuraciones centralizadas
 */

// Configuración del canvas
const CANVAS_CONFIG = {
    width: 800,
    height: 600
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