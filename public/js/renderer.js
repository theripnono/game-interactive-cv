/**
 * renderer.js - Sistema de renderizado del juego
 * Maneja todo el dibujado en canvas y actualización de UI
 */

// Contexto del canvas
const ctx = canvas.getContext('2d');
const positionDisplay = document.getElementById('position');

/**
 * Limpia completamente el canvas
 */
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    
    // Si es el NPC activo, añadir un indicador visual
    if (gameState.activeNPC === circle) {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffff00'; // Borde amarillo para el NPC activo
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]); // Línea discontinua
        ctx.stroke();
        ctx.setLineDash([]); // Restablecer línea continua
    }
}

/**
 * Dibuja todos los círculos en el canvas
 */
function drawAllCircles() {
    // Dibujar círculo rojo (jugador)
    drawCircle(redCircle);
    
    // Dibujar todos los círculos NPC
    npcCircles.forEach(circle => drawCircle(circle));
}

/**
 * Actualiza el texto que muestra la posición y estado de los círculos
 */
function updatePositionDisplay() {
    let interactionStatus = "";
    
    if (gameState.canInteract && gameState.activeNPC) {
        interactionStatus = ` | Can interact with ${gameState.activeNPC.name}!`;
    }
    
    let displayText = `Red Circle - X: ${Math.round(redCircle.x)}, Y: ${Math.round(redCircle.y)}<br>`;
    
    // Añadir información de cada círculo NPC
    displayText += `Blue Circle - X: ${Math.round(blueCircle.x)}, Y: ${Math.round(blueCircle.y)} | Status: ${blueCircle.getStatusText()}<br>`;
    displayText += `Green Circle - X: ${Math.round(greenCircle.x)}, Y: ${Math.round(greenCircle.y)} | Status: ${greenCircle.getStatusText()}`;
    
    displayText += interactionStatus;
    
    positionDisplay.innerHTML = displayText;
}

/**
 * Renderiza un frame completo del juego
 */
function render() {
    clearCanvas();
    drawAllCircles();
    updatePositionDisplay();
}