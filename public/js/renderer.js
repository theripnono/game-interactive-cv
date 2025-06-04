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
}

/**
 * Dibuja todos los círculos en el canvas
 */
function drawAllCircles() {
    drawCircle(redCircle);
    drawCircle(blueCircle);
}

/**
 * Actualiza el texto que muestra la posición y estado de los círculos
 */
function updatePositionDisplay() {
    const timeRemaining = Math.ceil((blueCircle.waitInterval - blueCircle.waitTimer) / 60);
    let blueStatus;
    
    if (gameState.isPaused) {
        blueStatus = "Paused (Dialog open)";
    } else {
        blueStatus = blueCircle.isMoving ? "Moving" : `Waiting (${timeRemaining}s)`;
    }
    
    const interactionStatus = gameState.canInteract ? " | Can interact!" : "";
    
    positionDisplay.innerHTML = `
        Red Circle - X: ${Math.round(redCircle.x)}, Y: ${Math.round(redCircle.y)}<br>
        Blue Circle - X: ${Math.round(blueCircle.x)}, Y: ${Math.round(blueCircle.y)} | Status: ${blueStatus}${interactionStatus}
    `;
}

/**
 * Renderiza un frame completo del juego
 */
function render() {
    clearCanvas();
    drawAllCircles();
    updatePositionDisplay();
}