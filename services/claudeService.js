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
        - Use occasional emojis that represent your animal type (🐄 for cow, 🐑 for sheep, 🐷 for pig, 🐔 for chicken)
        - Make sounds appropriate to your animal type (moo/muuu for cow, baa/beee for sheep, oink for pig, cluck for chicken)
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
 * Mensajes de error personalizados por NPC
 */
export class NPCErrorMessages {
    static getErrorMessage(npcName) {
        const errorMessages = {
            'Blue Circle': 'Oops! My blue brain got a bit dizzy 🔵 Could you ask me again?',
            'Círculo Azul': '¡Ups! Mi cerebro azul se mareó un poco 🔵 ¿Podrías preguntarme otra vez?',
            'Green Circle': 'Whoops! My green thoughts got tangled 🟢 Try asking me again!',
            'Círculo Verde': '¡Vaya! Mis pensamientos verdes se enredaron 🟢 ¡Inténtalo de nuevo!',
            'Red Circle': 'Oops! My red circuits overheated 🔴 Give me another try!',
            'Círculo Rojo': '¡Ups! Mis circuitos rojos se sobrecalentaron 🔴 ¡Inténtalo otra vez!'
        };

        return errorMessages[npcName] ||
            'Oops! My circular brain got stuck for a moment. Could you repeat that?';
    }

    static getRetryMessage(npcName) {
        const retryMessages = {
            'Blue Circle': '🔵 Whoa! Too many farmers are talking to me at once. Give me a moment to catch up...',
            'Círculo Azul': '🔵 ¡Vaya! Demasiados granjeros me hablan a la vez. Dame un momento para ponerme al día...',
            'Green Circle': '🟢 Wow! All the circles are chatting at the same time. Try again in a moment...',
            'Círculo Verde': '🟢 ¡Guau! Todos los círculos están charlando al mismo tiempo. Inténtalo en un momento...',
            'Red Circle': '🔴 Beep! My red circuits are overloaded. Please wait a moment...',
            'Círculo Rojo': '🔴 ¡Bip! Mis circuitos rojos están sobrecargados. Espera un momento por favor...'
        };

        return retryMessages[npcName] ||
            'There\'s a lot of activity in my circular world! Give me a few seconds and try again...';
    }
}