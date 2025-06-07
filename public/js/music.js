/**
 * music.js - Sistema de música dinámico MULTI-PISTA para el juego
 * Maneja música de fondo principal CONTINUA + música específica por NPC SIMULTÁNEA
 */

// Variables para el sistema multi-pista
let backgroundMusic = null;      // Música principal (SIEMPRE sonando)
let npcMusic = null;            // Música específica del NPC actual
let musicInitialized = false;
let musicEnabled = true;

// Configuración de archivos de música
const MUSIC_FILES = {
    main: 'assets/music/main_theme.mp3',
    cow: 'assets/music/cow.mp3',     // Música para Linda (vaca)
    sheep: 'assets/music/sheep.mp3'  // Música para Fannie (oveja)
};

/**
 * Inicializa y reproduce la música principal
 * Esta música NUNCA se para una vez iniciada
 */
function startMainMusic() {
    if (backgroundMusic && !backgroundMusic.paused) {
        console.log('🎵 Música principal ya está sonando');
        return;
    }

    try {
        console.log('🎵 Iniciando música principal...');

        backgroundMusic = new Audio(MUSIC_FILES.main);
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.3;
        backgroundMusic.preload = 'auto';

        // Event listeners para la música principal
        backgroundMusic.addEventListener('error', (e) => {
            console.warn('⚠️ Error cargando música principal:', e);
        });

        backgroundMusic.addEventListener('canplaythrough', () => {
            console.log('🎵 Música principal lista para reproducir');
        });

        // Reproducir música principal
        const playPromise = backgroundMusic.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('🎵 ✅ Música principal iniciada y sonando continuamente');
                })
                .catch(error => {
                    console.warn('⚠️ Error reproduciendo música principal:', error);
                });
        }

    } catch (error) {
        console.warn('⚠️ Error iniciando música principal:', error);
    }
}

/**
 * Reproduce música específica de NPC ADEMÁS de la música principal
 * @param {string} trackKey - Clave de la pista ('cow', 'sheep')
 */
function playNPCMusic(trackKey) {
    if (!musicEnabled || !MUSIC_FILES[trackKey]) {
        console.warn(`⚠️ Pista NPC no válida o música deshabilitada: ${trackKey}`);
        return;
    }

    // Si ya hay música de NPC sonando, pararla primero
    if (npcMusic) {
        npcMusic.pause();
        npcMusic.currentTime = 0;
        console.log('🎵 Parando música NPC anterior');
    }

    try {
        console.log(`🎵 Iniciando música NPC: ${trackKey}`);

        // Crear nueva instancia para la música del NPC
        npcMusic = new Audio(MUSIC_FILES[trackKey]);
        npcMusic.loop = true;
        npcMusic.volume = 0.25; // Volumen ligeramente menor para no competir con la principal
        npcMusic.preload = 'auto';

        // Event listeners para música NPC
        npcMusic.addEventListener('error', (e) => {
            console.warn(`⚠️ Error cargando música NPC ${trackKey}:`, e);
        });

        npcMusic.addEventListener('canplaythrough', () => {
            console.log(`🎵 Música NPC ${trackKey} lista para reproducir`);
        });

        // Reproducir música NPC
        const playPromise = npcMusic.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log(`🎵 ✅ Música NPC ${trackKey} reproduciendo junto con la principal`);
                    updateMusicButton();
                })
                .catch(error => {
                    console.warn(`⚠️ Error reproduciendo música NPC ${trackKey}:`, error);
                });
        }

    } catch (error) {
        console.warn(`⚠️ Error iniciando música NPC ${trackKey}:`, error);
    }
}

/**
 * Para la música específica del NPC (mantiene la principal sonando)
 */
function stopNPCMusic() {
    if (npcMusic) {
        npcMusic.pause();
        npcMusic.currentTime = 0;
        npcMusic = null;
        console.log('🎵 Música NPC detenida, música principal continúa');
        updateMusicButton();
    }
}

/**
 * Reproduce la música de la vaca (Linda) ADEMÁS de la principal
 */
function playCowMusic() {
    playNPCMusic('cow');
}

/**
 * Reproduce la música de la oveja (Fannie) ADEMÁS de la principal
 */
function playSheepMusic() {
    playNPCMusic('sheep');
}

/**
 * Cambia automáticamente la música según el NPC activo
 * NUEVA LÓGICA: Añade música de NPC sin parar la principal
 * @param {Object} npc - El NPC activo
 */
function switchMusicForNPC(npc) {
    // La música principal SIEMPRE debe estar sonando
    if (!backgroundMusic || backgroundMusic.paused) {
        startMainMusic();
    }

    if (!npc) {
        // Si no hay NPC, solo parar música de NPC
        stopNPCMusic();
        return;
    }

    // Añadir música específica según el NPC
    if (npc.name === 'Linda') {
        playCowMusic();
    } else if (npc.name === 'Fannie') {
        playSheepMusic();
    } else {
        // Para otros NPCs, solo música principal
        stopNPCMusic();
    }
}

/**
 * Reproduce SOLO la música principal (para compatibilidad)
 */
function playMainMusic() {
    startMainMusic();
    // No parar música NPC si está sonando
}

/**
 * Inicializa el sistema de música multi-pista
 */
function initializeMusic() {
    if (musicInitialized || !musicEnabled) {
        console.log('🎵 Sistema de música ya inicializado o deshabilitado');
        return;
    }

    console.log('🎵 Inicializando sistema de música multi-pista...');

    try {
        musicInitialized = true;
        startMainMusic(); // Iniciar música principal inmediatamente

        console.log('🎵 ✅ Sistema de música multi-pista inicializado exitosamente');

    } catch (error) {
        console.warn('⚠️ Error inicializando música:', error);
        musicEnabled = false;
        musicInitialized = false;
    }
}

/**
 * Pausa TODA la música (principal + NPC)
 */
function pauseMusic() {
    let pausedSomething = false;

    if (backgroundMusic && !backgroundMusic.paused) {
        backgroundMusic.pause();
        console.log('⏸️ Música principal pausada');
        pausedSomething = true;
    }

    if (npcMusic && !npcMusic.paused) {
        npcMusic.pause();
        console.log('⏸️ Música NPC pausada');
        pausedSomething = true;
    }

    if (pausedSomething) {
        updateMusicButton();
    }
}

/**
 * Reanuda TODA la música (principal + NPC)
 */
function resumeMusic() {
    let resumedSomething = false;

    if (backgroundMusic && backgroundMusic.paused) {
        backgroundMusic.play().catch(error => {
            console.warn('⚠️ Error reanudando música principal:', error);
        });
        console.log('▶️ Música principal reanudada');
        resumedSomething = true;
    }

    if (npcMusic && npcMusic.paused) {
        npcMusic.play().catch(error => {
            console.warn('⚠️ Error reanudando música NPC:', error);
        });
        console.log('▶️ Música NPC reanudada');
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
        console.log(newMutedState ? '🔇 Música principal silenciada' : '🔊 Música principal activada');
    }

    // Aplicar el mismo estado a la música NPC
    if (npcMusic) {
        npcMusic.muted = newMutedState;
        console.log(newMutedState ? '🔇 Música NPC silenciada' : '🔊 Música NPC activada');
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
        console.log(`🎵 Volumen música principal ajustado a: ${Math.round(clampedVolume * 100)}%`);
    }

    if (npcMusic) {
        // Música NPC ligeramente más baja
        npcMusic.volume = clampedVolume * 0.8;
        console.log(`🎵 Volumen música NPC ajustado a: ${Math.round(clampedVolume * 80)}%`);
    }
}

/**
 * Obtiene el estado actual del sistema de música multi-pista
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
        npcMusic: npcStatus,
        hasNPCMusic: npcMusic !== null
    };
}

/**
 * Actualiza la apariencia del botón según el estado multi-pista
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
        // Mostrar estado según si hay música NPC
        let emoji = '🎵';
        let trackInfo = 'Principal';

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
        console.log('🎵 Iniciando sistema de música multi-pista...');
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

// Crear el botón cuando se carga el script (función existente sin cambios)
function createMusicToggleButton() {
    // Verificar si ya existe el botón
    if (document.getElementById('musicToggle')) {
        return;
    }

    const button = document.createElement('button');
    button.id = 'musicToggle';
    button.innerHTML = '🎵';
    button.title = 'Activar/Silenciar música';

    // Estilos del botón (sin cambios)
    button.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        width: 50px;
        height: 50px;
        border: none;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.7);
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

    // Efectos hover y active (sin cambios)
    button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(0, 0, 0, 0.9)';
        button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.background = 'rgba(0, 0, 0, 0.7)';
        button.style.transform = 'scale(1)';
    });

    button.addEventListener('mousedown', () => {
        button.style.transform = 'scale(0.95)';
    });

    button.addEventListener('mouseup', () => {
        button.style.transform = 'scale(1.1)';
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

    // Soporte táctil para móviles (sin cambios)
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