/**
 * chat.js - Sistema de chat del juego con conversaciones individuales
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

/**
 * Inicializa el historial de chat para todos los NPCs
 */
function initializeChatHistory() {
    // Inicializar historial vacío para cada NPC conocido
    chatHistory.set('Círculo Azul', []);
    chatHistory.set('Círculo Verde', []);
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
        console.warn('No hay NPC activo para abrir chat');
        return;
    }
    
    setDialogState(true);
    dialogBox.classList.remove('hidden');
    hideInteractionHint();

    // Actualizar el título del chat con el nombre del NPC
    updateChatHeader();
    
    // Restaurar el historial de conversación específico del NPC
    restoreChatHistory(gameState.activeNPC.name);

    // Enfocar el input de chat
    setTimeout(() => {
        chatInput.focus();
    }, 100);
}

/**
 * Actualiza el encabezado del chat con el NPC activo
 */
function updateChatHeader() {
    const chatHeader = document.querySelector('#dialogBox h3');
    if (chatHeader && gameState.activeNPC) {
        chatHeader.textContent = `Conversando con ${gameState.activeNPC.name}`;
        chatHeader.style.color = gameState.activeNPC.chatColor;
    }
}

/**
 * Cierra el chat de interacción
 */
function closeChat() {
    setDialogState(false);
    dialogBox.classList.add('hidden');
    canvas.focus();
}

/**
 * Muestra el indicador de interacción con el nombre del NPC
 */
function showInteractionHint() {
    if (gameState.activeNPC) {
        interactionHint.textContent = `Presiona ESPACIO para hablar con ${gameState.activeNPC.name}`;
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
        senderName = 'Tú';
        senderColor = '#ff0000'; // Color del círculo rojo
    } else {
        senderName = gameState.activeNPC ? gameState.activeNPC.name : 'NPC';
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

    // Scroll automático hacia abajo
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
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
        const errorEmoji = gameState.activeNPC.name === 'Círculo Azul' ? '🔵' : '🟢';
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
    
    // Log para debugging
    console.log('Sistema de chat individualizado inicializado');
}