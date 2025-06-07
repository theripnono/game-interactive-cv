export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, npcName, npcPersonality, npcId } = req.body;

        // Validate message exists
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Validate NPC information exists
        if (!npcName || !npcPersonality) {
            return res.status(400).json({
                success: false,
                error: 'NPC information is required'
            });
        }

        // Validate API key exists
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('ANTHROPIC_API_KEY not found in environment variables');
            return res.status(500).json({
                success: false,
                message: 'Cannot find API key'
            });
        }

        console.log(`Sending request to Claude API for ${npcName}...`);

        // ===== INTEGRACIÓN RAG =====
        let cvContext = '';
        let usedRAG = false;
        let ragDebugInfo = null;

        console.log(`🔍 DEBUG: Mensaje recibido: "${message}"`);

        // Detección SIMPLE: solo buscar David, farmer o granjero
        const messageLower = message.toLowerCase();
        console.log(`🔍 DEBUG: Mensaje en minúsculas: "${messageLower}"`);

        const isAboutCV = messageLower.includes('david') ||
            messageLower.includes('farmer') ||
            messageLower.includes('granjero');

        console.log(`🔍 DEBUG: Contiene 'david': ${messageLower.includes('david')}`);
        console.log(`🔍 DEBUG: Contiene 'farmer': ${messageLower.includes('farmer')}`);
        console.log(`🔍 DEBUG: Contiene 'granjero': ${messageLower.includes('granjero')}`);
        console.log(`🔍 DEBUG: ¿Es sobre CV? ${isAboutCV}`);

        if (isAboutCV) {
            console.log('🔍 Detectada pregunta sobre CV, activando RAG...');
            console.log(`🔧 DEBUG: OPENAI_API_KEY existe: ${!!process.env.OPENAI_API_KEY}`);
            console.log(`🔧 DEBUG: QDRANT_API_KEY2 existe: ${!!process.env.QDRANT_API_KEY2}`);

            try {
                // Buscar información relevante en Qdrant
                console.log('🔍 DEBUG: Iniciando searchCVInformation...');
                const ragResult = await searchCVInformation(message);
                console.log('🔍 DEBUG: searchCVInformation completado:', JSON.stringify(ragResult, null, 2));

                if (ragResult.success && ragResult.contexts.length > 0) {
                    console.log(`🔍 DEBUG: Procesando ${ragResult.contexts.length} contextos...`);

                    cvContext = ragResult.contexts
                        .map((doc, index) => {
                            const content = doc.payload?.content || '';
                            const score = doc.score ? ` (relevancia: ${(doc.score * 100).toFixed(1)}%)` : '';
                            console.log(`🔍 DEBUG: Contexto ${index + 1}: "${content.substring(0, 100)}..." Score: ${doc.score}`);
                            return `[Info CV ${index + 1}${score}]: ${content.trim()}`;
                        })
                        .join('\n');

                    usedRAG = true;
                    ragDebugInfo = {
                        query: message,
                        contextsFound: ragResult.contexts.length,
                        avgScore: ragResult.contexts.reduce((sum, doc) => sum + (doc.score || 0), 0) / ragResult.contexts.length
                    };
                    console.log(`✅ RAG activado: ${ragResult.contexts.length} contextos encontrados`);
                    console.log(`✅ DEBUG: cvContext length: ${cvContext.length}`);
                    console.log(`✅ DEBUG: cvContext preview: "${cvContext.substring(0, 200)}..."`);
                } else {
                    console.log('ℹ️ No se encontró información relevante en el CV');
                    console.log(`ℹ️ DEBUG: ragResult.success: ${ragResult.success}, contexts.length: ${ragResult.contexts?.length || 'undefined'}`);
                    ragDebugInfo = { query: message, contextsFound: 0 };
                }
            } catch (ragError) {
                console.warn('⚠️ Error en RAG, continuando sin contexto del CV:', ragError.message);
                console.warn('⚠️ DEBUG: Stack trace:', ragError.stack);
                ragDebugInfo = { error: ragError.message };
            }
        } else {
            console.log('ℹ️ Pregunta NO es sobre CV, saltando RAG');
        }

        console.log(`🔍 FINAL DEBUG: cvContextFound: ${cvContext.length > 0}, usedRAG: ${usedRAG}`);

        // Create custom system prompt based on NPC + RAG context
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

        // Call Claude with retry logic
        const claudeResponse = await callClaudeWithRetry({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1000,
            temperature: 0.8,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: message
            }]
        });

        console.log(`Claude API Response for ${npcName}:`, JSON.stringify(claudeResponse, null, 2));

        // Verify response structure
        if (claudeResponse.content && Array.isArray(claudeResponse.content) &&
            claudeResponse.content[0] && claudeResponse.content[0].text) {

            const response = {
                success: true,
                message: claudeResponse.content[0].text.trim(),
                usedRAG: usedRAG,
                cvContextFound: cvContext.length > 0
            };

            // Añadir información de debug en desarrollo
            if (process.env.NODE_ENV === 'development' && ragDebugInfo) {
                response.ragDebug = ragDebugInfo;
            }

            res.json(response);
        } else {
            console.error('Invalid Claude response structure:', claudeResponse);
            throw new Error('Invalid response structure from Claude');
        }

    } catch (error) {
        console.error('Claude API error:', error.message);
        console.error('Error stack:', error.stack);

        // Specific handling for overload errors
        if (error.message.includes('overloaded') || error.message.includes('529')) {
            const retryMessage = getNPCRetryMessage(req.body.npcName);
            return res.status(503).json({
                success: false,
                message: retryMessage,
                error: 'API_OVERLOADED',
                retryAfter: 30 // seconds
            });
        }

        // Custom error message based on NPC
        const errorMessage = getNPCErrorMessage(req.body.npcName);

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Función para buscar información del CV en Qdrant
 */
async function searchCVInformation(query, limit = 4) {
    const QDRANT_CONFIG = {
        url: 'https://f18c8e30-d541-451a-8397-252eee5256ed.europe-west3-0.gcp.cloud.qdrant.io:6333',
        apiKey: process.env.QDRANT_API_KEY2,
        collectionName: 'cv_embeddings'
    };

    console.log('🔧 DEBUG: Iniciando searchCVInformation');
    console.log(`🔧 DEBUG: Query: "${query}"`);
    console.log(`🔧 DEBUG: Limit: ${limit}`);
    console.log(`🔧 DEBUG: Qdrant URL: ${QDRANT_CONFIG.url}`);
    console.log(`🔧 DEBUG: Collection: ${QDRANT_CONFIG.collectionName}`);
    console.log(`🔧 DEBUG: API Key definida: ${!!QDRANT_CONFIG.apiKey}`);

    try {
        console.log('🔍 Creando embedding para la consulta:', query);

        // Crear embedding de la consulta
        const embedding = await createEmbedding(query);
        console.log(`🔧 DEBUG: Embedding creado: ${!!embedding}`);
        if (embedding) {
            console.log(`🔧 DEBUG: Embedding dimensions: ${embedding.length}`);
        }

        if (!embedding) {
            throw new Error('No se pudo crear el embedding');
        }

        console.log('🔍 Buscando en Qdrant...');

        // Buscar en Qdrant
        const searchPayload = {
            vector: embedding,
            limit: limit,
            // score_threshold: 0.3, // Umbral más bajo para mayor flexibilidad
            with_payload: true,
            with_vector: false // No necesitamos el vector de vuelta
        };

        console.log('🔧 DEBUG: Search payload:', JSON.stringify({
            vectorLength: embedding.length,
            limit: searchPayload.limit,
            score_threshold: searchPayload.score_threshold,
            with_payload: searchPayload.with_payload
        }, null, 2));

        const searchUrl = `${QDRANT_CONFIG.url}/collections/${QDRANT_CONFIG.collectionName}/points/search`;
        console.log('🔧 DEBUG: Search URL:', searchUrl);

        const response = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': QDRANT_CONFIG.apiKey
            },
            body: JSON.stringify(searchPayload)
        });

        console.log(`🔧 DEBUG: Qdrant response status: ${response.status}`);
        console.log(`🔧 DEBUG: Qdrant response headers:`, Object.fromEntries(response.headers));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Qdrant response error:', errorText);
            throw new Error(`Qdrant error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('🔧 DEBUG: Qdrant raw response:', JSON.stringify(data, null, 2));

        const results = data.result || [];

        console.log(`📊 Encontrados ${results.length} resultados en Qdrant`);
        if (results.length === 0) {
            console.log('⚠️ No se encontraron resultados, intentando búsqueda de respaldo...');
            return await searchWithoutThreshold(QDRANT_CONFIG, embedding, limit);
        }
        // Log de scores para debugging
        if (results.length > 0) {
            const scores = results.map(r => r.score?.toFixed(3) || 'N/A').join(', ');
            console.log(`📈 Scores de relevancia: [${scores}]`);

            // Log de payloads
            results.forEach((result, index) => {
                console.log(`🔧 DEBUG: Resultado ${index + 1}:`, {
                    score: result.score,
                    hasPayload: !!result.payload,
                    payloadKeys: result.payload ? Object.keys(result.payload) : [],
                    payloadContent: result.payload?.content?.substring(0, 100) || 'No content field'
                });
            });
        } else {
            console.log('⚠️ No se encontraron resultados en Qdrant');
        }

        return {
            success: true,
            contexts: results,
            query: query
        };

    } catch (error) {
        console.error('❌ Error en searchCVInformation:', error);
        console.error('❌ Stack trace:', error.stack);
        return {
            success: false,
            error: error.message,
            contexts: []
        };
    }
}

/**
 * Búsqueda sin threshold cuando la búsqueda principal falla
 */
async function searchWithoutThreshold(config, embedding, limit) {
    try {
        console.log('🔄 Ejecutando búsqueda sin threshold...');

        const searchPayload = {
            vector: embedding,
            limit: limit,
            with_payload: true,
            with_vector: false
            // Sin score_threshold
        };

        const response = await fetch(`${config.url}/collections/${config.collectionName}/points/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': config.apiKey
            },
            body: JSON.stringify(searchPayload)
        });

        if (!response.ok) {
            throw new Error(`Search without threshold failed: ${response.status}`);
        }

        const data = await response.json();
        const results = data.result || [];

        console.log(`🔄 Búsqueda sin threshold: ${results.length} resultados`);

        return {
            success: true,
            contexts: results,
            query: 'fallback search'
        };

    } catch (error) {
        console.error('❌ Error en búsqueda sin threshold:', error);
        return {
            success: false,
            error: error.message,
            contexts: []
        };
    }
}
/**
 * Función para crear embeddings usando OpenAI
 */
async function createEmbedding(text) {
    console.log('🔧 DEBUG: Iniciando createEmbedding');
    console.log(`🔧 DEBUG: Texto para embedding: "${text}"`);
    console.log(`🔧 DEBUG: OPENAI_API_KEY existe: ${!!process.env.OPENAI_API_KEY}`);

    if (process.env.OPENAI_API_KEY) {
        console.log(`🔧 DEBUG: API Key length: ${process.env.OPENAI_API_KEY.length}`);
        console.log(`🔧 DEBUG: API Key starts with: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
    }

    try {
        // Verificación más robusta de la clave API
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
            console.warn('⚠️ OPENAI_API_KEY no configurada o vacía, saltando RAG');
            return null;
        }

        // Limpiar y preparar el texto
        const cleanText = text.trim().substring(0, 8000); // Límite más conservador
        console.log(`🔧 DEBUG: Texto limpio: "${cleanText}" (${cleanText.length} caracteres)`);

        if (cleanText.length === 0) {
            throw new Error('Texto vacío para embedding');
        }

        const requestBody = {
            model: 'text-embedding-3-small',
            input: cleanText,
            encoding_format: 'float' // Formato explícito
        };

        console.log('🔧 DEBUG: Request body:', JSON.stringify({
            model: requestBody.model,
            inputLength: requestBody.input.length,
            encoding_format: requestBody.encoding_format
        }));

        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY.trim()}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`🔧 DEBUG: OpenAI response status: ${response.status}`);
        console.log(`🔧 DEBUG: OpenAI response headers:`, Object.fromEntries(response.headers));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenAI API error response:', errorText);

            // Manejo específico de errores comunes
            if (response.status === 401) {
                throw new Error('API Key de OpenAI inválida o expirada');
            } else if (response.status === 429) {
                throw new Error('Límite de rate de OpenAI excedido');
            } else {
                throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
            }
        }

        const data = await response.json();
        console.log('🔧 DEBUG: OpenAI response data structure:', {
            hasData: !!data.data,
            dataLength: data.data?.length || 0,
            firstEmbeddingLength: data.data?.[0]?.embedding?.length || 0,
            usage: data.usage
        });

        if (!data.data || !data.data[0] || !data.data[0].embedding) {
            console.error('❌ Respuesta inválida de OpenAI:', JSON.stringify(data, null, 2));
            throw new Error('Respuesta inválida de OpenAI API');
        }

        console.log(`✅ Embedding creado exitosamente (dimensiones: ${data.data[0].embedding.length})`);
        return data.data[0].embedding;

    } catch (error) {
        console.error('❌ Error creando embedding:', error);
        console.error('❌ Stack trace:', error.stack);
        throw error;
    }
}

/**
 * Function to call Claude API with retry logic and overload handling
 */
async function callClaudeWithRetry(payload, maxRetries = 3, baseDelayMs = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🤖 Claude API attempt ${attempt}/${maxRetries}`);

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(payload)
            });

            // Specific handling for 529 error (Overloaded)
            if (response.status === 529) {
                const errorData = await response.text();
                console.warn(`⚠️ Claude API Overloaded (attempt ${attempt}):`, errorData);

                if (attempt < maxRetries) {
                    const retryAfter = response.headers.get('retry-after');
                    const delay = retryAfter ? parseInt(retryAfter) * 1000 :
                        baseDelayMs * Math.pow(2, attempt - 1);

                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await sleep(delay);
                    continue;
                }

                throw new Error(`Claude API overloaded after ${maxRetries} attempts`);
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Claude API HTTP Error:', response.status, errorText);

                switch (response.status) {
                    case 401:
                        throw new Error('Invalid or expired API Key');
                    case 429:
                        if (attempt < maxRetries) {
                            const retryAfter = response.headers.get('retry-after') || 60;
                            console.log(`⏳ Rate limited, waiting ${retryAfter}s...`);
                            await sleep(parseInt(retryAfter) * 1000);
                            continue;
                        }
                        throw new Error('Rate limit exceeded');
                    case 400:
                        throw new Error('Malformed request');
                    case 503:
                        if (attempt < maxRetries) {
                            const delay = baseDelayMs * Math.pow(2, attempt - 1);
                            await sleep(delay);
                            continue;
                        }
                        throw new Error('Service unavailable');
                    default:
                        throw new Error(`HTTP Error: ${response.status}`);
                }
            }

            const data = await response.json();
            console.log('✅ Claude API response received successfully');
            return data;

        } catch (error) {
            lastError = error;
            console.error(`❌ Attempt ${attempt} failed:`, error.message);

            if (attempt === maxRetries ||
                error.message.includes('Invalid or expired API Key') ||
                error.message.includes('Malformed request')) {
                throw error;
            }

            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                console.log(`⏳ Network error, waiting ${delay}ms before retry...`);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Helper function to wait for a specific amount of time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Custom error messages per NPC
 */
function getNPCErrorMessage(npcName) {
    const errorMessages = {
        'Blue Circle': 'Oops! My blue brain got a bit dizzy 🔵 Could you ask me again?',
        'Círculo Azul': '¡Ups! Mi cerebro azul se mareó un poco 🔵 ¿Podrías preguntarme otra vez?',
        'Green Circle': 'Whoops! My green thoughts got tangled 🟢 Try asking me again!',
        'Círculo Verde': '¡Vaya! Mis pensamientos verdes se enredaron 🟢 ¡Inténtalo de nuevo!',
        'Red Circle': 'Oops! My red circuits overheated 🔴 Give me another try!',
        'Círculo Rojo': '¡Ups! Mis circuitos rojos se sobrecalentaron 🔴 ¡Inténtalo otra vez!'
    };

    return errorMessages[npcName] || 'Oops! My circular brain got stuck for a moment. Could you repeat that?';
}

/**
 * Specific messages for when the API is overloaded
 */
function getNPCRetryMessage(npcName) {
    const retryMessages = {
        'Blue Circle': '🔵 Whoa! Too many farmers are talking to me at once. Give me a moment to catch up...',
        'Círculo Azul': '🔵 ¡Vaya! Demasiados granjeros me hablan a la vez. Dame un momento para ponerme al día...',
        'Green Circle': '🟢 Wow! All the circles are chatting at the same time. Try again in a moment...',
        'Círculo Verde': '🟢 ¡Guau! Todos los círculos están charlando al mismo tiempo. Inténtalo en un momento...',
        'Red Circle': '🔴 Beep! My red circuits are overloaded. Please wait a moment...',
        'Círculo Rojo': '🔴 ¡Bip! Mis circuitos rojos están sobrecargados. Espera un momento por favor...'
    };

    return retryMessages[npcName] || 'There\'s a lot of activity in my circular world! Give me a few seconds and try again...';
}

/**
 * Middleware for rate limiting (optional - implement if using Express)
 */
export function createRateLimiter() {
    const requests = new Map();
    const WINDOW_MS = 60 * 1000; // 1 minute
    const MAX_REQUESTS = 30; // maximum 30 requests per minute per IP

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!requests.has(ip)) {
            requests.set(ip, []);
        }

        const userRequests = requests.get(ip);
        const validRequests = userRequests.filter(time => now - time < WINDOW_MS);

        if (validRequests.length >= MAX_REQUESTS) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Try again later.',
                retryAfter: Math.ceil(WINDOW_MS / 1000)
            });
        }

        validRequests.push(now);
        requests.set(ip, validRequests);

        next();
    };
}

/**
 * Circuit breaker pattern for additional resilience
 */
export class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureThreshold = threshold;
        this.timeout = timeout;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }

    async call(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN - too many recent failures');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
}