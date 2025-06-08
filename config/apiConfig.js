import { ClaudeService, ClaudeApiError, NPCErrorMessages } from '../services/claudeService.js';
import { RAGService, createRAGService } from '../services/ragService.js';

/**
 * Handler principal para el endpoint de Claude
 * Orquesta las llamadas a los servicios de Claude y RAG
 */
export default async function handler(req, res) {
    // Configurar CORS
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
        // Validar entrada
        const validationResult = validateRequest(req.body);
        if (!validationResult.isValid) {
            return res.status(400).json({
                success: false,
                error: validationResult.error
            });
        }

        const { message, npcName, npcPersonality, npcId } = req.body;

        // Validar API key de Claude
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('ANTHROPIC_API_KEY not found in environment variables');
            return res.status(500).json({
                success: false,
                message: 'Cannot find Claude API key'
            });
        }

        console.log(`🎮 Processing request for NPC: ${npcName}`);

        // Inicializar servicios
        const claudeService = new ClaudeService(process.env.ANTHROPIC_API_KEY);

        const ragService = createRAGService(process.env.OPENAI_API_KEY, {
            url: procces.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY2,
            collectionName: process.env.QDRANT_COLLECTION_NAME
        });

        // Procesar RAG si es necesario
        const ragResult = await processRAG(ragService, message);

        // Formatear contexto para Claude
        const cvContext = ragResult.success && ragResult.contexts.length > 0 ?
            ragService.formatContextForClaude(ragResult.contexts) : null;

        console.log(`🤖 Sending request to Claude API for ${npcName}...`);

        // Llamar a Claude
        const claudeResponse = await claudeService.sendMessage(
            message,
            npcName,
            npcId,
            npcPersonality,
            cvContext
        );

        // Extraer respuesta
        const responseText = claudeService.extractResponseText(claudeResponse);

        // Preparar respuesta final
        const response = {
            success: true,
            message: responseText,
            usedRAG: ragResult.success && ragResult.contexts.length > 0,
            cvContextFound: cvContext !== null
        };

        // Añadir información de debug en desarrollo
        if (process.env.NODE_ENV === 'development' && ragResult.success) {
            response.ragDebug = {
                query: message,
                contextsFound: ragResult.contexts.length,
                avgScore: ragResult.metadata?.avgScore || 0,
                isFallback: ragResult.isFallback || false
            };
        }

        console.log(`✅ Response sent successfully for ${npcName}`);
        res.json(response);

    } catch (error) {
        console.error('❌ Handler error:', error.message);
        console.error('❌ Stack trace:', error.stack);

        const errorResponse = handleError(error, req.body.npcName);
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
}

/**
 * Validar la estructura de la petición
 */
function validateRequest(body) {
    const { message, npcName, npcPersonality } = body;

    if (!message) {
        return {
            isValid: false,
            error: 'Message is required'
        };
    }

    if (!npcName || !npcPersonality) {
        return {
            isValid: false,
            error: 'NPC information is required'
        };
    }

    return { isValid: true };
}

/**
 * Procesar RAG si la consulta es relevante
 */
async function processRAG(ragService, message) {
    console.log(`🔍 Analyzing message for RAG: "${message}"`);

    // Verificar si la consulta es sobre CV
    if (!ragService.isAboutCV(message)) {
        console.log('ℹ️ Message is not about CV, skipping RAG');
        return { success: false, contexts: [] };
    }

    console.log('🔍 CV-related query detected, activating RAG...');

    try {
        const ragResult = await ragService.searchCVInformation(message);

        if (ragResult.success) {
            console.log(`✅ RAG completed: ${ragResult.contexts.length} contexts found`);
            if (ragResult.contexts.length > 0) {
                const avgScore = ragResult.metadata?.avgScore || 0;
                console.log(`📊 Average relevance score: ${(avgScore * 100).toFixed(1)}%`);
            }
        } else {
            console.log('ℹ️ RAG search returned no results');
        }

        return ragResult;

    } catch (error) {
        console.warn('⚠️ RAG error, continuing without CV context:', error.message);
        return {
            success: false,
            contexts: [],
            error: error.message
        };
    }
}

/**
 * Manejar errores y generar respuestas apropiadas
 */
function handleError(error, npcName) {
    // Error específico de Claude API sobrecargada
    if (error instanceof ClaudeApiError && error.code === 'API_OVERLOADED') {
        return {
            statusCode: 503,
            body: {
                success: false,
                message: NPCErrorMessages.getRetryMessage(npcName),
                error: 'API_OVERLOADED',
                retryAfter: 30
            }
        };
    }

    // Error de rate limit
    if (error instanceof ClaudeApiError && error.code === 'RATE_LIMITED') {
        return {
            statusCode: 429,
            body: {
                success: false,
                message: NPCErrorMessages.getRetryMessage(npcName),
                error: 'RATE_LIMITED',
                retryAfter: 60
            }
        };
    }

    // Error de API key inválida
    if (error instanceof ClaudeApiError && error.code === 'INVALID_API_KEY') {
        return {
            statusCode: 401,
            body: {
                success: false,
                message: 'API configuration error',
                error: 'INVALID_API_KEY'
            }
        };
    }

    // Error genérico
    const errorMessage = NPCErrorMessages.getErrorMessage(npcName);

    return {
        statusCode: 500,
        body: {
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
    };
}

/**
 * Middleware para rate limiting (opcional)
 */
export function createRateLimiter() {
    const requests = new Map();
    const WINDOW_MS = 60 * 1000; // 1 minuto
    const MAX_REQUESTS = 30; // máximo 30 requests por minuto por IP

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
 * Circuit breaker para mayor resiliencia
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