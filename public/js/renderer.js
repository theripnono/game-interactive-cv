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

// Variables para sprites
let spriteImages = {};

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
 * Inicializa y carga los sprites
 */
function initializeSprites() {
    // Cargar sprite de la vaca para el NPC azul
    const cowSprite = new Image();

    cowSprite.onload = function () {
        console.log('Sprite de vaca cargado exitosamente');
        console.log(`Dimensiones del sprite: ${cowSprite.width}x${cowSprite.height}`);
        blueCircle.spriteImage = cowSprite;
        blueCircle.spriteLoaded = true;
        spriteImages.cow = cowSprite;

        // Configurar renderizado pixelado para sprites
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;

        // Renderizar después de cargar el sprite
        render();
    };

    cowSprite.onerror = function () {
        console.warn('No se pudo cargar el sprite de vaca desde assets/farm/sprites/BASIC_cow_walk.png');
        console.warn('El NPC azul se mostrará como círculo');
        blueCircle.spriteLoaded = false;
    };

    cowSprite.src = 'assets/farm/sprites/BASIC_cow_walk.png';

    // Cargar sprite de la oveja para el NPC verde
    const sheepSprite = new Image();

    sheepSprite.onload = function () {
        console.log('Sprite de oveja cargado exitosamente');
        console.log(`Dimensiones del sprite: ${sheepSprite.width}x${sheepSprite.height}`);
        greenCircle.spriteImage = sheepSprite;
        greenCircle.spriteLoaded = true;
        spriteImages.sheep = sheepSprite;

        // Renderizar después de cargar el sprite
        render();
    };

    sheepSprite.onerror = function () {
        console.warn('No se pudo cargar el sprite de oveja desde assets/farm/sprites/BASIC_sheep_walk.png');
        console.warn('El NPC verde se mostrará como círculo');
        greenCircle.spriteLoaded = false;
    };

    sheepSprite.src = 'assets/farm/sprites/BASIC_sheep_walk.png';
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
 * Dibuja un sprite animado
 * @param {Object} circle - El círculo/entidad a dibujar
 * @param {Object} spriteConfig - Configuración del sprite
 */
function drawSprite(circle, spriteConfig) {
    if (!circle.spriteImage || !circle.spriteLoaded) {
        // Fallback: dibujar círculo normal si no carga el sprite
        drawCircleOriginal(circle);
        return;
    }

    // Actualizar animación solo si está en movimiento
    if (circle.isMoving) {
        circle.frameCounter++;
    }

    // Calcular frame actual basado en la velocidad de animación
    const frameIndex = Math.floor(circle.frameCounter / SPRITE_CONFIG.animationSpeed) % spriteConfig.totalFrames;

    // Posición en el sprite sheet (horizontal)
    const sourceX = frameIndex * spriteConfig.frameWidth;
    const sourceY = 0; // Solo una fila

    // Tamaño final en canvas
    const drawWidth = spriteConfig.frameWidth * spriteConfig.scale;
    const drawHeight = spriteConfig.frameHeight * spriteConfig.scale;

    // Posición centrada en la posición del círculo
    const drawX = circle.x - drawWidth / 2;
    const drawY = circle.y - drawHeight / 2;

    // Guardar contexto para sombra
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Dibujar el sprite
    ctx.drawImage(
        circle.spriteImage,
        sourceX, sourceY, spriteConfig.frameWidth, spriteConfig.frameHeight,
        drawX, drawY, drawWidth, drawHeight
    );

    // Restaurar contexto
    ctx.restore();

    // Si es el NPC activo, añadir indicador visual
    if (gameState.activeNPC === circle) {
        // Calcular radio aproximado basado en el sprite
        const approximateRadius = Math.max(drawWidth, drawHeight) / 2;

        ctx.beginPath();
        ctx.arc(circle.x, circle.y, approximateRadius + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffff00'; // Borde amarillo para el NPC activo
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]); // Línea discontinua
        ctx.stroke();
        ctx.setLineDash([]); // Restablecer línea continua

        // Añadir un brillo pulsante
        const pulseAlpha = 0.3 + 0.3 * Math.sin(Date.now() * 0.01);
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, approximateRadius + 12, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(255, 255, 0, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

/**
 * Dibuja un círculo en el canvas (versión original para fallback)
 * @param {Object} circle - El círculo a dibujar
 */
function drawCircleOriginal(circle) {
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
 * Dibuja un círculo o sprite según corresponda
 * @param {Object} circle - El círculo a dibujar
 */
function drawCircle(circle) {
    // Si es el NPC azul y tiene sprite cargado, usar sprite de vaca
    if (circle === blueCircle && circle.spriteLoaded && SPRITE_CONFIG.sprites.blue) {
        drawSprite(circle, SPRITE_CONFIG.sprites.blue);
        return;
    }

    // Si es el NPC verde y tiene sprite cargado, usar sprite de oveja
    if (circle === greenCircle && circle.spriteLoaded && SPRITE_CONFIG.sprites.green) {
        drawSprite(circle, SPRITE_CONFIG.sprites.green);
        return;
    }

    // Si no, dibujar círculo normal (para red circle o si no cargan los sprites)
    drawCircleOriginal(circle);
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

    // Añadir información del NPC azul (vaca)
    displayText += `Blue Circle (Cow) - X: ${Math.round(blueCircle.x)}, Y: ${Math.round(blueCircle.y)} | Status: ${blueCircle.getStatusText()}`;
    if (blueCircle.spriteLoaded) {
        displayText += ` | Frame: ${Math.floor(blueCircle.frameCounter / SPRITE_CONFIG.animationSpeed) % SPRITE_CONFIG.sprites.blue.totalFrames}`;
    }
    displayText += `<br>`;

    // Añadir información del NPC verde (oveja)
    displayText += `Green Circle (Sheep) - X: ${Math.round(greenCircle.x)}, Y: ${Math.round(greenCircle.y)} | Status: ${greenCircle.getStatusText()}`;
    if (greenCircle.spriteLoaded) {
        displayText += ` | Frame: ${Math.floor(greenCircle.frameCounter / SPRITE_CONFIG.animationSpeed) % SPRITE_CONFIG.sprites.green.totalFrames}`;
    }

    displayText += interactionStatus;

    // Añadir información del fondo y sprites
    const backgroundStatus = backgroundLoaded ? 'Background: Loaded' : 'Background: Using fallback';
    const cowSpriteStatus = blueCircle.spriteLoaded ? 'Cow sprite: Loaded' : 'Cow sprite: Using fallback';
    const sheepSpriteStatus = greenCircle.spriteLoaded ? 'Sheep sprite: Loaded' : 'Sheep sprite: Using fallback';
    displayText += `<br>${backgroundStatus} | ${cowSpriteStatus} | ${sheepSpriteStatus}`;

    positionDisplay.innerHTML = displayText;
}

/**
 * Renderiza un frame completo del juego
 */
function render() {
    clearCanvas();
    drawAllCircles();
    // updatePositionDisplay(); // Descomentado para ver el estado de sprites
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

/**
 * Inicializa todos los sistemas de renderizado
 */
function initializeAll() {
    initializeBackground();
    initializeSprites();
}

// Inicializar el sistema cuando se carga el script
document.addEventListener('DOMContentLoaded', function () {
    initializeAll();
});

// Si el DOM ya está cargado, inicializar inmediatamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAll);
} else {
    initializeAll();
}