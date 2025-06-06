/**
 * renderer.js - Sistema de renderizado del juego
 * Maneja todo el dibujado en canvas y actualización de UI
 */

// Contexto del canvas
const ctx = canvas.getContext('2d');
const positionDisplay = document.getElementById('position');

// Variables para el fondo
let backgroundImage = null;
let backgroundLoaded = false;

/**
 * Inicializa y carga la imagen de fondo
 */
function initializeBackground() {
    backgroundImage = new Image();

    backgroundImage.onload = function () {
        backgroundLoaded = true;
        console.log('Fondo cargado exitosamente');
        console.log(`Dimensiones del fondo: ${backgroundImage.width}x${backgroundImage.height}`);

        // Configurar renderizado pixelado para la imagen
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;

        // Renderizar inmediatamente después de cargar
        render();
    };

    backgroundImage.onerror = function () {
        console.warn('No se pudo cargar el fondo desde assets/farm/farm_background.png');
        console.warn('Usando fondo de color sólido como respaldo');
        backgroundLoaded = false;
    };

    // Cargar la imagen
    backgroundImage.src = 'assets/farm/farm_background.png';
}

/**
 * Dibuja el fondo en el canvas
 */
function drawBackground() {
    if (backgroundLoaded && backgroundImage) {
        // Calcular la escala para que el fondo cubra todo el canvas
        const scaleX = canvas.width / backgroundImage.width;
        const scaleY = canvas.height / backgroundImage.height;

        // Usar la escala mayor para cubrir completamente (efecto "cover")
        const scale = Math.max(scaleX, scaleY);

        // Calcular dimensiones escaladas
        const scaledWidth = backgroundImage.width * scale;
        const scaledHeight = backgroundImage.height * scale;

        // Calcular offset para centrar la imagen
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;

        // Dibujar el fondo escalado y centrado
        ctx.drawImage(
            backgroundImage,
            offsetX,
            offsetY,
            scaledWidth,
            scaledHeight
        );
    } else {
        // Fondo de respaldo con color sólido
        ctx.fillStyle = '#4a5d23'; // Verde campo
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Añadir un patrón simple si no hay imagen
        ctx.fillStyle = '#3a4d13';
        for (let x = 0; x < canvas.width; x += 40) {
            for (let y = 0; y < canvas.height; y += 40) {
                if ((x / 40 + y / 40) % 2 === 0) {
                    ctx.fillRect(x, y, 40, 40);
                }
            }
        }
    }
}

/**
 * Limpia completamente el canvas y dibuja el fondo
 */
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
}

/**
 * Dibuja un círculo en el canvas
 * @param {Object} circle - El círculo a dibujar
 */
function drawCircle(circle) {
    // Sombra para dar profundidad
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    ctx.fillStyle = circle.color;
    ctx.fill();

    // Quitar sombra para el borde
    ctx.restore();

    // Añadir borde al círculo
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    ctx.strokeStyle = circle.strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Si es el NPC activo, añadir un indicador visual
    if (gameState.activeNPC === circle) {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffff00'; // Borde amarillo para el NPC activo
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]); // Línea discontinua
        ctx.stroke();
        ctx.setLineDash([]); // Restablecer línea continua

        // Añadir un brillo pulsante
        const pulseAlpha = 0.3 + 0.3 * Math.sin(Date.now() * 0.01);
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius + 12, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(255, 255, 0, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
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

    // Añadir información del fondo
    const backgroundStatus = backgroundLoaded ? 'Background: Loaded' : 'Background: Using fallback';
    displayText += `<br>${backgroundStatus}`;

    positionDisplay.innerHTML = displayText;
}

/**
 * Renderiza un frame completo del juego
 */
function render() {
    clearCanvas();
    drawAllCircles();
    // updatePositionDisplay();
}

/**
 * Redimensiona el canvas y recalcula el fondo si es necesario
 */
function resizeCanvas(newWidth, newHeight) {
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Reconfigurar el contexto después del redimensionado
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    // Renderizar inmediatamente
    render();
}

// Inicializar el sistema de fondo cuando se carga el script
document.addEventListener('DOMContentLoaded', function () {
    initializeBackground();
});

// Si el DOM ya está cargado, inicializar inmediatamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBackground);
} else {
    initializeBackground();
}