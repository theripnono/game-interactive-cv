/**
 * chat.js - Sistema de chat del juego con soporte táctil mejorado
 * Maneja toda la funcionalidad del chat y diálogos individualizados por NPC
 */

// Elementos del DOM del chat
const dialogBox = document.getElementById('dialogBox');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessage');
const closeChatBtn = document.getElementById('closeChatBtn');
const closeChatFooterBtn = document.getElementById('closeChat');
const interactionHint = document.getElementById('interactionHint');

// Sistema de almacenamiento de conversaciones por NPC
const chatHistory = new Map();

// Variables para mejorar la experiencia móvil del chat
let mobileKeyboardOpen = false;
let originalViewportHeight = window.innerHeight;

/**
 * Detecta si el teclado virtual está abierto (móviles)
 */
function detectVirtualKeyboard() {
    if (!isMobileDevice()) return;

    const currentHeight = window.innerHeight;
    const heightDifference = originalViewportHeight - currentHeight;

    // Si la altura se redujo significativamente, probablemente el teclado está abierto
    mobileKeyboardOpen = heightDifference > 150;

    if (mobileKeyboardOpen) {
        adjustChatForKeyboard(true);
    } else {
        adjustChatForKeyboard(false);
    }
}

/**
 * Ajusta el chat cuando se abre/cierra el teclado virtual
 */
function adjustChatForKeyboard(keyboardOpen) {
    if (!isMobileDevice()) return;

    const dialogBox = document.getElementById('dialogBox');
    if (!dialogBox) return;

    if (keyboardOpen) {
        // Reducir altura del chat y mover hacia arriba
        dialogBox.style.maxHeight = '60vh';
        dialogBox.style.transform = 'translateY(-20px)';

        // Hacer el área de mensajes más pequeña
        if (chatMessages) {
            chatMessages.style.maxHeight = '200px';
        }
    } else {
        // Restaurar tamaño normal
        dialogBox.style.maxHeight = '';
        dialogBox.style.transform = '';

        if (chatMessages) {
            chatMessages.style.maxHeight = '';
        }
    }
}

/**
 * Mejora el input del chat para móviles
 */
function enhanceChatInputForMobile() {
    if (!isMobileDevice() || !chatInput) return;

    // Hacer el input más grande en móviles
    chatInput.style.fontSize = '16px'; // Previene zoom automático en iOS
    chatInput.style.padding = '12px';
    chatInput.style.minHeight = '20px';

    // Mejorar el botón de envío para móviles
    if (sendMessageBtn) {
        sendMessageBtn.style.padding = '12px 20px';
        sendMessageBtn.style.fontSize = '16px';
        sendMessageBtn.style.minWidth = '80px';
        sendMessageBtn.style.touchAction = 'manipulation'; // Mejora la respuesta táctil
    }

    // Añadir eventos táctiles específicos
    chatInput.addEventListener('focus', () => {
        setTimeout(detectVirtualKeyboard, 300);

        // Scroll automático para mantener el input visible
        setTimeout(() => {
            if (chatInput) {
                chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 500);
    });

    chatInput.addEventListener('blur', () => {
        setTimeout(detectVirtualKeyboard, 300);
    });

    // Manejar el evento input para auto-resize
    chatInput.addEventListener('input', () => {
        // Auto-expandir el textarea si es necesario
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
}

/**
 * Añade controles táctiles mejorados para el chat
 */
function addMobileChatControls() {
    if (!isMobileDevice()) return;

    // Hacer que el botón de cerrar sea más grande y táctil
    const closeButtons = [closeChatBtn, closeChatFooterBtn];
    closeButtons.forEach(btn => {
        if (btn) {
            btn.style.minWidth = '44px';
            btn.style.minHeight = '44px';
            btn.style.touchAction = 'manipulation';

            // Añadir evento táctil
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                closeChat();
            }, { passive: false });
        }
    });

    // Mejorar el botón de envío
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            sendMessage();
        }, { passive: false });
    }

    // Añadir gesto de swipe hacia abajo para cerrar el chat
    let startY = 0;
    let currentY = 0;

    if (dialogBox) {
        dialogBox.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });

        dialogBox.addEventListener('touchmove', (e) => {
            if (!startY) return;
            currentY = e.touches[0].clientY;

            const diff = currentY - startY;

            // Si arrastra hacia abajo más de 50px, mostrar indicador visual
            if (diff > 50) {
                dialogBox.style.transform = `translateY(${Math.min(diff * 0.3, 30)}px)`;
                dialogBox.style.opacity = Math.max(1 - (diff / 200), 0.7);
            }
        }, { passive: true });

        dialogBox.addEventListener('touchend', (e) => {
            if (!startY) return;

            const diff = currentY - startY;

            // Si arrastró hacia abajo más de 100px, cerrar el chat
            if (diff > 100) {
                closeChat();
            } else {
                // Restaurar posición original
                dialogBox.style.transform = '';
                dialogBox.style.opacity = '';
            }

            startY = 0;
            currentY = 0;
        }, { passive: true });
    }
}

/**
 * Inicializa el historial de chat para todos los NPCs
 */
function initializeChatHistory() {
    // Inicializar historial vacío para cada NPC conocido
    chatHistory.set('Blue NPC', []);
    chatHistory.set('Green NPC', []);
}

/**
 * Obtiene el historial de chat de un NPC específico
 * @param {string} npcName - Nombre del NPC
 * @returns {Array} - Array de mensajes del NPC
 */
function getChatHistory(npcName) {
    if (!chatHistory.has(npcName)) {
        chatHistory.set(npcName, []);
    }
    return chatHistory.get(npcName);
}

/**
 * Guarda un mensaje en el historial de un NPC específico
 * @param {string} npcName - Nombre del NPC
 * @param {Object} message - Objeto mensaje con text, sender, timestamp
 */
function saveMessageToHistory(npcName, message) {
    const history = getChatHistory(npcName);
    history.push({
        text: message.text,
        sender: message.sender,
        timestamp: new Date().toISOString()
    });
}

/**
 * Limpia completamente el contenedor de mensajes del chat
 */
function clearChatDisplay() {
    chatMessages.innerHTML = '';
}

/**
 * Restaura el historial de chat de un NPC específico en la UI
 * @param {string} npcName - Nombre del NPC
 */
function restoreChatHistory(npcName) {
    clearChatDisplay();

    const history = getChatHistory(npcName);
    history.forEach(message => {
        displayMessage(message.text, message.sender, false); // false = no guardar en historial otra vez
    });

    // Scroll automático hacia abajo
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Abre el chat de interacción con el NPC activo
 */
function openChat() {
    if (!gameState.activeNPC) {
        console.warn('No NPC active to open chat');
        return;
    }

    setDialogState(true);
    dialogBox.classList.remove('hidden');
    hideInteractionHint();

    // Actualizar el título del chat con el nombre del NPC
    updateChatHeader();

    // Restaurar el historial de conversación específico del NPC
    restoreChatHistory(gameState.activeNPC.name);

    // Configuración específica para móviles
    if (isMobileDevice()) {
        // Pequeño delay para asegurar que el DOM esté actualizado
        setTimeout(() => {
            enhanceChatInputForMobile();

            // En móviles, hacer scroll hacia el chat y enfocarlo
            if (dialogBox) {
                dialogBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Enfocar el input después de un momento
            setTimeout(() => {
                if (chatInput) {
                    chatInput.focus();
                }
            }, 300);
        }, 100);
    } else {
        // Enfocar inmediatamente en escritorio
        setTimeout(() => {
            chatInput.focus();
        }, 100);
    }

    // Actualizar visibilidad de controles táctiles
    if (typeof updateTouchControlsVisibility === 'function') {
        updateTouchControlsVisibility();
    }
}

/**
 * Actualiza el encabezado del chat con el NPC activo
 */
function updateChatHeader() {
    const chatHeader = document.querySelector('#dialogBox h3');
    if (chatHeader && gameState.activeNPC) {
        chatHeader.textContent = `Chatting with ${gameState.activeNPC.name}`;
        chatHeader.style.color = gameState.activeNPC.chatColor;

        // Añadir emoji según el NPC para mejor identificación visual
        const npcEmoji = gameState.activeNPC.name.includes('Blue') ? '🐄' : '🐑';
        chatHeader.textContent = `${npcEmoji} ${chatHeader.textContent}`;
    }
}

/**
 * Cierra el chat de interacción
 */
function closeChat() {
    setDialogState(false);
    dialogBox.classList.add('hidden');

    // Restaurar estilos modificados para móviles
    if (isMobileDevice()) {
        dialogBox.style.transform = '';
        dialogBox.style.opacity = '';
        dialogBox.style.maxHeight = '';

        if (chatMessages) {
            chatMessages.style.maxHeight = '';
        }

        // Blur del input para cerrar el teclado virtual
        if (chatInput) {
            chatInput.blur();
        }
    }

    // Devolver foco al canvas
    canvas.focus();

    // Actualizar visibilidad de controles táctiles
    if (typeof updateTouchControlsVisibility === 'function') {
        updateTouchControlsVisibility();
    }
}

/**
 * Muestra el indicador de interacción con el nombre del NPC
 */
function showInteractionHint() {
    if (gameState.activeNPC) {
        const npcEmoji = gameState.activeNPC.name.includes('Blue') ? '🐄' : '🐑';

        if (isMobileDevice()) {
            interactionHint.textContent = `${npcEmoji} Touch the yellow button to talk to ${gameState.activeNPC.name}`;
        } else {
            interactionHint.textContent = `${npcEmoji} Press SPACE to talk to ${gameState.activeNPC.name}`;
        }

        interactionHint.style.color = gameState.activeNPC.chatColor;
    }
    interactionHint.classList.remove('hidden');
}

/**
 * Oculta el indicador de interacción
 */
function hideInteractionHint() {
    interactionHint.classList.add('hidden');
}

/**
 * Muestra un mensaje en la UI del chat
 * @param {string} text - Texto del mensaje
 * @param {string} sender - 'user' o 'bot'
 * @param {boolean} saveToHistory - Si guardar en el historial (default: true)
 * @returns {HTMLElement} - Elemento del mensaje creado
 */
function displayMessage(text, sender = 'user', saveToHistory = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    let senderName, senderColor;

    if (sender === 'user') {
        senderName = '🧑🏼‍🌾 My';
        senderColor = '#ff0000'; // Color del círculo rojo
    } else {
        const npcEmoji = gameState.activeNPC?.name.includes('Blue') ? '🐄' : '🐑';
        senderName = gameState.activeNPC ? `${npcEmoji} ${gameState.activeNPC.name}` : 'NPC';
        senderColor = gameState.activeNPC ? gameState.activeNPC.chatColor : '#666';
    }

    messageDiv.innerHTML = `
        <span class="message-sender" style="color: ${senderColor};">${senderName}:</span>
        <span class="message-text">${text}</span>
    `;

    chatMessages.appendChild(messageDiv);

    // Guardar en el historial del NPC activo si es necesario
    if (saveToHistory && gameState.activeNPC) {
        saveMessageToHistory(gameState.activeNPC.name, {
            text: text,
            sender: sender
        });
    }

    // Scroll automático hacia abajo con comportamiento suave
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);

    return messageDiv;
}

/**
 * Función de compatibilidad - redirige a displayMessage
 * @param {string} text - Texto del mensaje
 * @param {string} sender - 'user' o 'bot'
 */
function addMessage(text, sender = 'user') {
    return displayMessage(text, sender, true);
}

/**
 * Simula la respuesta del NPC activo
 * @param {string} userMessage - Mensaje del usuario
 */
async function generateBotResponse(userMessage) {
    if (!gameState.activeNPC) {
        console.error('No hay NPC activo para generar respuesta');
        return;
    }

    try {
        // Mostrar indicador de carga (no guardar en historial)
        const loadingMessage = displayMessage("Pensando... 🤔", "bot", false);

        const response = await fetch('/api/claude', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                npcName: gameState.activeNPC.name,
                npcPersonality: gameState.activeNPC.personality
            })
        });

        const data = await response.json();

        // Remover mensaje de carga
        loadingMessage.remove();

        if (data.success) {
            displayMessage(data.message, "bot", true);
        } else {
            displayMessage("¡Oops! Algo salió mal. Intenta de nuevo.", "bot", true);
        }

    } catch (error) {
        console.error('Error al comunicarse con Claude:', error);
        const errorEmoji = gameState.activeNPC.name.includes('Blue') ? '🐄' : '🐑';
        displayMessage(`No puedo conectarme ahora. ¿Intentamos más tarde? ${errorEmoji}`, "bot", true);
    }
}

/**
 * Envía un mensaje en el chat
 */
function sendMessage() {
    const message = chatInput.value.trim();

    if (message === '') {
        return;
    }

    if (!gameState.activeNPC) {
        console.error('No hay NPC activo para enviar mensaje');
        return;
    }

    // Añadir mensaje del usuario
    displayMessage(message, 'user', true);

    // Limpiar input
    chatInput.value = '';

    // Resetear altura del input en móviles
    if (isMobileDevice()) {
        chatInput.style.height = 'auto';
    }

    // Generar respuesta del bot
    generateBotResponse(message);
}

/**
 * Obtiene estadísticas del chat para debugging
 * @returns {Object} - Estadísticas de todos los chats
 */
function getChatStats() {
    const stats = {};
    chatHistory.forEach((messages, npcName) => {
        stats[npcName] = {
            totalMessages: messages.length,
            userMessages: messages.filter(m => m.sender === 'user').length,
            botMessages: messages.filter(m => m.sender === 'bot').length,
            lastMessage: messages.length > 0 ? messages[messages.length - 1] : null
        };
    });
    return stats;
}

/**
 * Reinicia todos los historiales de chat (para testing)
 */
function resetAllChatHistory() {
    chatHistory.clear();
    initializeChatHistory();
    clearChatDisplay();
    console.log('Todos los historiales de chat han sido reiniciados');
}

/**
 * Inicializa los event listeners del chat y el sistema de historial
 */
function initializeChatHandlers() {
    // Inicializar el sistema de historial
    initializeChatHistory();

    // Event listeners existentes
    sendMessageBtn.addEventListener('click', sendMessage);
    closeChatBtn.addEventListener('click', closeChat);
    closeChatFooterBtn.addEventListener('click', closeChat);
    chatInput.addEventListener('keydown', handleKeyDown);

    // Configuraciones específicas para móviles
    if (isMobileDevice()) {
        // Guardar altura original del viewport
        originalViewportHeight = window.innerHeight;

        // Añadir controles táctiles mejorados
        addMobileChatControls();

        // Event listeners para detectar cambios en el teclado virtual
        window.addEventListener('resize', detectVirtualKeyboard);

        // Mejorar los estilos del chat para móviles
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                
                
                #chatMessages {
                    max-height: 300px;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                #chatInput {
                    font-size: 16px !important;
                    padding: 12px !important;
                    border-radius: 8px;
                    border: 2px solid #ddd;
                }
                
                .message {
                    margin: 8px 0;
                    padding: 10px;
                    border-radius: 12px;
                    word-wrap: break-word;
                }
                
                .message-sender {
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .message-text {
                    font-size: 15px;
                    line-height: 1.4;
                }
                
                button {
                    min-height: 44px;
                    padding: 12px 16px;
                    font-size: 16px;
                    touch-action: manipulation;
                }
            }
        `;
        document.head.appendChild(style);

        console.log('📱 Chat móvil configurado');
    }

    // Log para debugging
    console.log('Sistema de chat individualizado inicializado');
}