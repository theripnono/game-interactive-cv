/**
 * music.js - Sistema de música dinámico MULTI-PISTA para el juego
 * Música principal CONTINUA + sonidos de NPC DE UNA SOLA VEZ
 */

// Variables para el sistema multi-pista
let backgroundMusic = null;      // Música principal (SIEMPRE sonando)
let npcMusic = null;            // Sonido específico del NPC actual (una vez)
let musicInitialized = false;
let musicEnabled = true;

// Configuración de archivos de música
const MUSIC_FILES = {
    main: 'assets/music/main_theme.mp3',
    cow: 'assets/music/cow.mp3',     // Sonido para Linda (vaca)
    sheep: 'assets/music/sheep.mp3'  // Sonido para Fannie (oveja)
};

/**
 * Inicializa y reproduce la música principal
 * Esta música NUNCA se para una vez iniciada
 */
function startMainMusic() {
    if (backgroundMusic && !backgroundMusic.paused) {
        return;
    }

    try {

        backgroundMusic = new Audio(MUSIC_FILES.main);
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.1;
        backgroundMusic.preload = 'auto';

        // Event listeners para la música principal
        backgroundMusic.addEventListener('error', (e) => {
        });

        backgroundMusic.addEventListener('canplaythrough', () => {
        });

        // Reproducir música principal
        const playPromise = backgroundMusic.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                })
                .catch(error => {
                });
        }

    } catch (error) {
    }
}

/**
 * Reproduce sonido específico de NPC UNA SOLA VEZ
 * @param {string} trackKey - Clave de la pista ('cow', 'sheep')
 */
function playNPCSound(trackKey) {
    if (!musicEnabled || !MUSIC_FILES[trackKey]) {
        return;
    }

    // Si ya hay sonido de NPC reproduciéndose, pararlo primero
    if (npcMusic) {
        npcMusic.pause();
        npcMusic.currentTime = 0;
    }

    try {

        // Crear nueva instancia para el sonido del NPC
        npcMusic = new Audio(MUSIC_FILES[trackKey]);
        npcMusic.loop = false; // ⭐ CLAVE: NO loop, solo una vez
        npcMusic.volume = 0.1; // Volumen del sonido del animal
        npcMusic.preload = 'auto';

        // Event listeners para sonido NPC
        npcMusic.addEventListener('error', (e) => {
        });

        npcMusic.addEventListener('canplaythrough', () => {
        });

        // ⭐ IMPORTANTE: Limpiar la referencia cuando termine
        npcMusic.addEventListener('ended', () => {
            npcMusic = null;
            updateMusicButton();
        });

        // Reproducir sonido NPC
        const playPromise = npcMusic.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    updateMusicButton();
                })
                .catch(error => {
                });
        }

    } catch (error) {
    }
}

/**
 * Para el sonido específico del NPC inmediatamente
 */
function stopNPCSound() {
    if (npcMusic) {
        npcMusic.pause();
        npcMusic.currentTime = 0;
        npcMusic = null;
        updateMusicButton();
    }
}

/**
 * Reproduce el sonido de la vaca (Linda) UNA VEZ
 */
function playCowSound() {
    playNPCSound('cow');
}

/**
 * Reproduce el sonido de la oveja (Fannie) UNA VEZ
 */
function playSheepSound() {
    playNPCSound('sheep');
}

/**
 * Reproduce sonido según el NPC activo cuando se abre el chat
 * @param {Object} npc - El NPC activo
 */
function playNPCIntroSound(npc) {
    // La música principal SIEMPRE debe estar sonando
    if (!backgroundMusic || backgroundMusic.paused) {
        startMainMusic();
    }

    if (!npc) {
        return;
    }

    // Reproducir sonido específico UNA VEZ según el NPC
    if (npc.name === 'Linda') {
        playCowSound();
    } else if (npc.name === 'Fannie') {
        playSheepSound();
    }
    // Para otros NPCs, no reproducir sonido adicional
}

/**
 * Función de compatibilidad con el código existente
 */
function switchMusicForNPC(npc) {
    playNPCIntroSound(npc);
}

/**
 * Función de compatibilidad - alias para stopNPCSound
 */
function stopNPCMusic() {
    stopNPCSound();
}

/**
 * Reproduce SOLO la música principal (para compatibilidad)
 */
function playMainMusic() {
    startMainMusic();
}

/**
 * Inicializa el sistema de música
 */
function initializeMusic() {
    if (musicInitialized || !musicEnabled) {
        return;
    }


    try {
        musicInitialized = true;
        startMainMusic(); // Iniciar música principal inmediatamente


    } catch (error) {
        musicEnabled = false;
        musicInitialized = false;
    }
}

/**
 * Pausa TODA la música (principal + cualquier sonido NPC)
 */
function pauseMusic() {
    let pausedSomething = false;

    if (backgroundMusic && !backgroundMusic.paused) {
        backgroundMusic.pause();
        pausedSomething = true;
    }

    if (npcMusic && !npcMusic.paused) {
        npcMusic.pause();
        pausedSomething = true;
    }

    if (pausedSomething) {
        updateMusicButton();
    }
}

/**
 * Reanuda TODA la música (principal + cualquier sonido NPC)
 */
function resumeMusic() {
    let resumedSomething = false;

    if (backgroundMusic && backgroundMusic.paused) {
        backgroundMusic.play().catch(error => {
        });
        resumedSomething = true;
    }

    if (npcMusic && npcMusic.paused) {
        npcMusic.play().catch(error => {
        });
        resumedSomething = true;
    }

    if (resumedSomething) {
        updateMusicButton();
    }
}

/**
 * Activa/desactiva TODA la música (mute/unmute)
 */
function toggleMusic() {
    let newMutedState = false;

    // Determinar el nuevo estado basado en la música principal
    if (backgroundMusic) {
        newMutedState = !backgroundMusic.muted;

        backgroundMusic.muted = newMutedState;
    }

    // Aplicar el mismo estado al sonido NPC si existe
    if (npcMusic) {
        npcMusic.muted = newMutedState;
    }

    updateMusicButton();
    return !newMutedState; // Retorna true si está activada
}

/**
 * Cambia el volumen de TODA la música
 * @param {number} volume - Volumen entre 0.0 y 1.0
 */
function setMusicVolume(volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (backgroundMusic) {
        backgroundMusic.volume = clampedVolume;
    }

    if (npcMusic) {
        npcMusic.volume = clampedVolume;
    }
}

/**
 * Obtiene el estado actual del sistema de música
 */
function getMusicStatus() {
    const mainStatus = backgroundMusic ? {
        playing: !backgroundMusic.paused,
        muted: backgroundMusic.muted,
        volume: backgroundMusic.volume,
        currentTime: backgroundMusic.currentTime,
        duration: backgroundMusic.duration || 0
    } : null;

    const npcStatus = npcMusic ? {
        playing: !npcMusic.paused,
        muted: npcMusic.muted,
        volume: npcMusic.volume,
        currentTime: npcMusic.currentTime,
        duration: npcMusic.duration || 0
    } : null;

    return {
        initialized: musicInitialized,
        mainMusic: mainStatus,
        npcSound: npcStatus,
        hasNPCSound: npcMusic !== null
    };
}

/**
 * Actualiza la apariencia del botón según el estado
 */
function updateMusicButton() {
    const button = document.getElementById('musicToggle');
    if (!button) return;

    const status = getMusicStatus();

    if (!status.initialized) {
        button.innerHTML = '🎵';
        button.title = 'Iniciar música';
        button.style.opacity = '0.7';
    } else if ((status.mainMusic && status.mainMusic.muted) ||
        (status.mainMusic && !status.mainMusic.playing)) {
        button.innerHTML = '🔇';
        button.title = 'Música silenciada - Clic para activar';
        button.style.opacity = '0.7';
    } else {
        // Mostrar estado según si hay sonido NPC reproduciéndose
        let emoji = '🎵';
        let trackInfo = 'Principal';

        if (status.hasNPCSound && status.npcSound && status.npcSound.playing) {
            emoji = '🎵+🔊';
            trackInfo = 'Principal + Sonido Animal';
        }

        button.innerHTML = emoji;
        button.title = `Música activada: ${trackInfo} - Clic para silenciar`;
        button.style.opacity = '1';
    }
}

/**
 * Función para usar en el main.js - inicia música cuando el juego comienza
 */
function startGameMusic() {
    if (!musicInitialized) {
        initializeMusic();
    } else {
        // Asegurar que la música principal esté sonando
        startMainMusic();
    }
}

/**
 * Función para pausar música cuando el juego está en pausa (solo para modal de instrucciones)
 */
function pauseGameMusic() {
    // Solo pausar si estamos en el modal de instrucciones, NO en chat
    if (typeof modalState !== 'undefined' && modalState.modalVisible) {
        pauseMusic();
    }
}

/**
 * Función para reanudar música cuando el juego continúa (solo para modal de instrucciones)
 */
function resumeGameMusic() {
    // Solo reanudar si salimos del modal de instrucciones, NO del chat
    if (typeof modalState !== 'undefined' && !modalState.modalVisible) {
        resumeMusic();
    }
}

// Crear el botón cuando se carga el script
function createMusicToggleButton() {
    // Verificar si ya existe el botón
    if (document.getElementById('musicToggle')) {
        return;
    }

    const button = document.createElement('button');
    button.id = 'musicToggle';
    button.innerHTML = '🎵';
    button.title = 'Activar/Silenciar música';

    // Estilos del botón
    button.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        width: 50px;
        height: 50px;
        border: none;
        border-radius: 50%;
        background: yellowgreen;
        color: white;
        font-size: 20px;
        cursor: pointer;
        z-index: 1003;
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Efectos hover y active
    button.addEventListener('mouseenter', () => {
        // Mantener el verde pero más brillante/saturado
        button.style.background = 'rgba(154, 205, 50, 0.9)'; // yellowgreen con transparencia
        // O usar un verde más brillante:
        // button.style.background = '#9ACD32'; // yellowgreen más brillante
        button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
        // Volver al color original
        button.style.background = 'yellowgreen';
        button.style.transform = 'scale(1)';
    });

    // Alternativa usando colores HSL para mejor control
    button.addEventListener('mouseenter', () => {
        button.style.background = 'hsl(83, 60%, 55%)'; // Verde más brillante
        button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.background = 'hsl(83, 60%, 50%)'; // Verde original
        button.style.transform = 'scale(1)';
    });

    // Funcionalidad del botón
    button.addEventListener('click', () => {
        if (!musicInitialized) {
            initializeMusic();
            updateMusicButton();
        } else {
            toggleMusic();
            updateMusicButton();
        }
    });

    // Soporte táctil para móviles
    if (typeof isMobileDevice === 'function' && isMobileDevice()) {
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.click();
        });

        button.style.top = '70px';
        button.style.left = '15px';
        button.style.width = '45px';
        button.style.height = '45px';
        button.style.fontSize = '18px';
    }

    document.body.appendChild(button);
    updateMusicButton();
}

// Auto-crear el botón cuando se carga el script
document.addEventListener('DOMContentLoaded', () => {
    createMusicToggleButton();
});