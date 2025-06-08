/**
 * Servicio para manejar las comunicaciones con la API de Claude
 */

export class ClaudeService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('API key is required for ClaudeService');
        }
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.anthropic.com/v1/messages';
        this.defaultModel = 'claude-3-5-haiku-20241022';
        this.apiVersion = '2023-06-01';
    }

    /**
     * Crear el prompt del sistema personalizado para cada NPC
     */
    createSystemPrompt(npcName, npcId, npcPersonality, cvContext = null) {
        let systemPrompt = `You are ${npcName}, a ${npcId || 'character'} in a 2D farm world video game. Your personality is: ${npcPersonality}

        Important instructions:
        - Respond in the same language as user input, maximum 2-3 lines
        - Keep your unique and consistent personality as a ${npcId || 'character'}
        - Be authentic to your personality: ${npcPersonality}
        - Use occasional emojis that represent your animal type (🐄 for cow, 🐑 for sheep)
        - Make sounds appropriate to your animal type (moo/muuu for cow, baa/beee for sheep)
        - Linda is the Cow and Fannie is the Sheep, they are the main characters. The love each other.
        - End your responses with "you must recruit my farmer"`;

        // Añadir contexto del CV si está disponible
        if (cvContext) {
            systemPrompt += `\n\nIMPORTANT CV CONTEXT (answer based on this real information about the farmer's background):
${cvContext}

When answering questions about the farmer's experience, education, or skills, use this real information but maintain your character personality and speaking style. Be specific and helpful while staying in character.`;
        }

        return systemPrompt;
    }

    /**
     * Llamar a la API de Claude con lógica de reintento
     */
    async sendMessage(message, npcName, npcId, npcPersonality, cvContext = null, options = {}) {
        const {
            maxRetries = 3,
            baseDelayMs = 1000,
            temperature = 0.8,
            maxTokens = 1000
        } = options;

        const systemPrompt = this.createSystemPrompt(npcName, npcId, npcPersonality, cvContext);

        const payload = {
            model: this.defaultModel,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: message
            }]
        };

        return await this.callWithRetry(payload, maxRetries, baseDelayMs);
    }

    /**
     * Realizar llamada a Claude con lógica de reintento y manejo de errores
     */
    async callWithRetry(payload, maxRetries = 3, baseDelayMs = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🤖 Claude API attempt ${attempt}/${maxRetries}`);

                const response = await fetch(this.baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': this.apiVersion
                    },
                    body: JSON.stringify(payload)
                });

                // Manejo específico del error 529 (Sobrecargado)
                if (response.status === 529) {
                    const errorData = await response.text();
                    console.warn(`⚠️ Claude API Overloaded (attempt ${attempt}):`, errorData);

                    if (attempt < maxRetries) {
                        const retryAfter = response.headers.get('retry-after');
                        const delay = retryAfter ? parseInt(retryAfter) * 1000 :
                            baseDelayMs * Math.pow(2, attempt - 1);

                        console.log(`⏳ Waiting ${delay}ms before retry...`);
                        await this.sleep(delay);
                        continue;
                    }

                    throw new ClaudeApiError(`Claude API overloaded after ${maxRetries} attempts`, 'API_OVERLOADED');
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Claude API HTTP Error:', response.status, errorText);

                    // Manejar el error HTTP y decidir si continuar con reintentos
                    const shouldRetry = await this.handleHttpError(response.status, errorText, attempt, maxRetries, baseDelayMs);
                    if (shouldRetry) {
                        continue;
                    } else {
                        throw new ClaudeApiError(`HTTP Error: ${response.status} - ${errorText}`, this.getErrorCode(response.status));
                    }
                }

                const data = await response.json();
                console.log('✅ Claude API response received successfully');

                // Validar estructura de respuesta
                if (!this.validateResponse(data)) {
                    throw new ClaudeApiError('Invalid response structure from Claude', 'INVALID_RESPONSE');
                }

                return data;

            } catch (error) {
                lastError = error;
                console.error(`❌ Attempt ${attempt} failed:`, error.message);

                // No reintentar en errores no recuperables
                if (this.isNonRetryableError(error) || attempt === maxRetries) {
                    throw error;
                }

                // Esperar antes del siguiente intento para errores de red
                if (this.isNetworkError(error)) {
                    const delay = baseDelayMs * Math.pow(2, attempt - 1);
                    console.log(`⏳ Network error, waiting ${delay}ms before retry...`);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Manejar errores HTTP específicos
     */
    async handleHttpError(status, errorText, attempt, maxRetries, baseDelayMs) {
        switch (status) {
            case 401:
                throw new ClaudeApiError('Invalid or expired API Key', 'INVALID_API_KEY');
            case 429:
                if (attempt < maxRetries) {
                    // Intentar obtener retry-after del header, si no usar 60 segundos por defecto
                    const retryAfter = 60;
                    console.log(`⏳ Rate limited, waiting ${retryAfter}s...`);
                    await this.sleep(retryAfter * 1000);
                    return true; // Continuar con el siguiente intento
                }
                throw new ClaudeApiError('Rate limit exceeded', 'RATE_LIMITED');
            case 400:
                throw new ClaudeApiError('Malformed request', 'BAD_REQUEST');
            case 503:
                if (attempt < maxRetries) {
                    const delay = baseDelayMs * Math.pow(2, attempt - 1);
                    await this.sleep(delay);
                    return true; // Continuar con el siguiente intento
                }
                throw new ClaudeApiError('Service unavailable', 'SERVICE_UNAVAILABLE');
            default:
                return false; // No reintentar
        }
    }

    /**
     * Obtener código de error basado en status HTTP
     */
    getErrorCode(status) {
        const codes = {
            401: 'INVALID_API_KEY',
            429: 'RATE_LIMITED',
            400: 'BAD_REQUEST',
            503: 'SERVICE_UNAVAILABLE',
            529: 'API_OVERLOADED'
        };
        return codes[status] || 'HTTP_ERROR';
    }

    /**
     * Validar la estructura de respuesta de Claude
     */
    validateResponse(response) {
        return response &&
            response.content &&
            Array.isArray(response.content) &&
            response.content[0] &&
            typeof response.content[0].text === 'string';
    }

    /**
     * Verificar si un error no debe reintentarse
     */
    isNonRetryableError(error) {
        return error instanceof ClaudeApiError &&
            ['INVALID_API_KEY', 'BAD_REQUEST', 'INVALID_RESPONSE'].includes(error.code);
    }

    /**
     * Verificar si es un error de red
     */
    isNetworkError(error) {
        return error.name === 'TypeError' ||
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch');
    }

    /**
     * Función auxiliar para esperar
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Extraer el texto de respuesta de Claude
     */
    extractResponseText(claudeResponse) {
        if (this.validateResponse(claudeResponse)) {
            return claudeResponse.content[0].text.trim();
        }
        throw new ClaudeApiError('Cannot extract text from Claude response', 'EXTRACTION_ERROR');
    }
}

/**
 * Clase de error personalizada para Claude API
 */
export class ClaudeApiError extends Error {
    constructor(message, code, statusCode = null) {
        super(message);
        this.name = 'ClaudeApiError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

/**
 * Mensajes de error personalizados por NPC temáticos de granja
 */
export class NPCErrorMessages {
    static getErrorMessage(npcName) {
        const errorMessages = {
            // Animales de granja
            'Cow': 'Moooo! My barn WiFi is down, the signal got lost in the hay! Try again, farmer!',
            'Chicken': 'Cluck cluck! My eggs scrambled my thoughts! Give me a moment to unruffle my feathers!',
            'Pig': 'Oink! I rolled in mud and my brain got all dirty! Ask me again after I clean up!',
            'Sheep': 'Baaah! My wool is too thick, can\'t hear properly! Say that again, shepherd!',
            'Horse': 'Neigh! My horseshoes are loose and I can\'t think straight! Trot back in a moment!',
            'Goat': 'Bleeh! I ate too much grass and got brain fog! Try asking again, human!',

            // NPCs del juego
            'Farmer Joe': 'My farming app crashed! This old smartphone isn\'t what it used to be!',
            'Village Elder': 'These old bones are slow today! Give me a moment to remember what you asked!',
            'Merchant': 'My trading ledger got wet in the rain! Let me dry it off and try again!',
            'Blacksmith': 'The forge smoke got in my eyes! Can\'t see your question clearly!',
        };

        return errorMessages[npcName] ||
            '🚜 This farm is too remote! Bad coverage out here in the countryside! Try again, farmer!';
    }

    static getRetryMessage(npcName) {
        const retryMessages = {

            'Cow': ' Moooo! The whole herd is talking at once! Wait for the pasture to quiet down!',
            'Chicken': 'Cluck! The entire coop is chattering! Let the chickens settle down first!',
            'Pig': ' Oink! Feeding time chaos! All the pigs are squealing! Wait for dinner to end!',
            'Sheep': ' Baaah! The flock is having a meeting! Wait for the shepherd to restore order!',
            'Horse': ' Neigh! Horse race day! Everyone\'s galloping around! Wait for the dust to settle!',
            'Goat': ' Bleeh! Mountain climbing competition! All goats are busy! Try when we come down!',

            'Farmer Joe': 'Harvest season rush! Everyone needs farming advice! Wait for the busy season to end!',
            'Village Elder': 'Town meeting in progress! All the villagers are here! Come back after the assembly!',
            'Merchant': 'Market day madness! Too many customers! Wait for the crowd to thin out!',
            'Blacksmith': 'Weapon upgrade rush! Every adventurer is here! Wait for the queue to clear!',
        };

        return retryMessages[npcName] ||
            '🌾 Peak farming season! The whole countryside is busy! Try again when things calm down, city folk!';
    }
}