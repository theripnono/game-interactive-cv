/**
 * chat.js - Sistema de chat del juego
 * Maneja toda la funcionalidad del chat y diálogos
 */

// Elementos del DOM del chat
const dialogBox = document.getElementById('dialogBox');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessage');
const closeChatBtn = document.getElementById('closeChatBtn');
const closeChatFooterBtn = document.getElementById('closeChat');
const interactionHint = document.getElementById('interactionHint');

/**
 * Abre el chat de interacción
 */
function openChat() {
    setDialogState(true);
    dialogBox.classList.remove('hidden');
    hideInteractionHint();

    // Enfocar el input de chat
    setTimeout(() => {
        chatInput.focus();
    }, 100);
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
 * Muestra el indicador de interacción
 */
function showInteractionHint() {
    interactionHint.classList.remove('hidden');
}

/**
 * Oculta el indicador de interacción
 */
function hideInteractionHint() {
    interactionHint.classList.add('hidden');
}

/**
 * Añade un mensaje al chat
 * @param {string} text - Texto del mensaje
 * @param {string} sender - 'user' o 'bot'
 */
function addMessage(text, sender = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const senderName = sender === 'user' ? 'Tú' : 'Círculo Azul';

    messageDiv.innerHTML = `
        <span class="message-sender">${senderName}:</span>
        <span class="message-text">${text}</span>
    `;

    chatMessages.appendChild(messageDiv);

    // Scroll automático hacia abajo
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Simula la respuesta del círculo azul
 * @param {string} userMessage - Mensaje del usuario
 */
async function generateBotResponse(userMessage) {
    try {
        // Mostrar indicador de carga
        const loadingMessage = addMessage("Pensando... 🤔", "bot");

        const response = await fetch('/api/claude', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage
            })
        });

        const data = await response.json();

        // Remover mensaje de carga
        //loadingMessage.remove();

        if (data.success) {
            addMessage(data.message, "bot");
        } else {
            addMessage("¡Oops! Algo salió mal. Intenta de nuevo.", "bot");
        }

    } catch (error) {
        console.error('Error al comunicarse con Claude:', error);
        addMessage("No puedo conectarme ahora. ¿Intentamos más tarde? 🔵", "bot");
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

    // Añadir mensaje del usuario
    addMessage(message, 'user');

    // Limpiar input
    chatInput.value = '';

    // Generar respuesta del bot
    generateBotResponse(message);
}

/**
 * Inicializa los event listeners del chat
 */
function initializeChatHandlers() {
    sendMessageBtn.addEventListener('click', sendMessage);
    closeChatBtn.addEventListener('click', closeChat);
    closeChatFooterBtn.addEventListener('click', closeChat);
    chatInput.addEventListener('keydown', handleKeyDown);
}