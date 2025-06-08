import { ClaudeService, ClaudeApiError, NPCErrorMessages } from '../services/claudeService.js';
import { RAGService, createRAGService } from '../services/ragService.js';

/**
 * Handler mejorado para el endpoint de Claude con RAG optimizado
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

        // ✅ CAMBIO: Crear RAG service con colección mejorada
        let ragService = null;
        if (process.env.OPENAI_API_KEY && process.env.QDRANT_API_KEY2) {
            ragService = await createRAGService(process.env.OPENAI_API_KEY, {
                url: process.env.QDRANT_URL,
                apiKey: process.env.QDRANT_API_KEY2,
                collectionName: process.env.QDRANT_COLLECTION_NAME
            });
        } else {
            console.log('⚠️ RAG services not configured - missing OpenAI or Qdrant API keys');
        }

        // ✅ MEJORADO: Procesar RAG con búsqueda inteligente
        const ragResult = ragService ? await processEnhancedRAG(ragService, message) : {
            success: false,
            contexts: [],
            metadata: { searchType: 'disabled' }
        };

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

        // ✅ MEJORADO: Respuesta con metadatos enriquecidos
        const response = {
            success: true,
            message: responseText,
            usedRAG: ragResult.success && ragResult.contexts.length > 0,
            cvContextFound: cvContext !== null,
            ragMetadata: {
                searchType: ragResult.metadata?.searchType || 'none',
                chunkTypes: ragResult.metadata?.chunkTypes || [],
                avgScore: ragResult.metadata?.avgScore || 0,
                isFallback: ragResult.isFallback || false
            }
        };

        // Añadir información de debug en desarrollo
        if (process.env.NODE_ENV === 'development' && ragResult.success) {
            response.ragDebug = {
                query: message,
                contextsFound: ragResult.contexts.length,
                avgScore: ragResult.metadata?.avgScore || 0,
                isFallback: ragResult.isFallback || false,
                chunkTypes: ragResult.metadata?.chunkTypes || [],
                searchMethod: ragResult.metadata?.searchType || 'standard'
            };
        }

        console.log(`✅ Response sent successfully for ${npcName}`);
        res.json(response);

    } catch (error) {
        console.error('❌ Handler error:', error.message);
        console.error('❌ Stack trace:', error.stack);

        const errorResponse = handleError(error, req.body?.npcName || 'Unknown NPC');
        res.status(errorResponse.statusCode).json(errorResponse.body);
    }
}

/**
 * ✅ NUEVO: Procesamiento RAG mejorado con búsqueda inteligente
 */
async function processEnhancedRAG(ragService, message) {
    console.log(`🔍 Analyzing message for enhanced RAG: "${message}"`);

    try {
        // Verificar si la consulta es sobre CV
        if (!ragService.isAboutCV(message)) {
            console.log('ℹ️ Message is not about CV, skipping RAG');
            return {
                success: false,
                contexts: [],
                metadata: { searchType: 'not_cv_related' }
            };
        }

        console.log('🔍 CV-related query detected, activating enhanced RAG...');

        // ✅ NUEVO: Usar búsqueda inteligente por intención
        const ragResult = await ragService.searchByIntent(message);

        if (ragResult.success) {
            console.log(`✅ Enhanced RAG completed: ${ragResult.contexts.length} contexts found`);

            if (ragResult.contexts.length > 0) {
                const avgScore = ragResult.metadata?.avgScore || 0;
                const chunkTypes = ragResult.metadata?.chunkTypes || [];

                console.log(`📊 Average relevance score: ${(avgScore * 100).toFixed(1)}%`);
                console.log(`🎯 Chunk types found: [${chunkTypes.join(', ')}]`);

                // ✅ NUEVO: Añadir metadata de búsqueda
                ragResult.metadata.searchType = 'intent_based';
            }
        } else {
            console.log('ℹ️ Enhanced RAG search returned no results');
        }

        return ragResult;

    } catch (error) {
        console.warn('⚠️ Enhanced RAG error, continuing without CV context:', error.message);
        return {
            success: false,
            contexts: [],
            error: error.message,
            metadata: { searchType: 'error' }
        };
    }
}

/**
 * Validar la estructura de la petición (función existente mantenida)
 */
function validateRequest(body) {
    if (!body) {
        return {
            isValid: false,
            error: 'Request body is required'
        };
    }

    const { message, npcName, npcPersonality } = body;

    if (!message || typeof message !== 'string') {
        return {
            isValid: false,
            error: 'Message is required and must be a string'
        };
    }

    if (!npcName || typeof npcName !== 'string') {
        return {
            isValid: false,
            error: 'NPC name is required and must be a string'
        };
    }

    if (!npcPersonality || typeof npcPersonality !== 'string') {
        return {
            isValid: false,
            error: 'NPC personality is required and must be a string'
        };
    }

    return { isValid: true };
}

/**
 * Manejar errores y generar respuestas apropiadas (función existente mantenida)
 */
function handleError(error, npcName) {
    console.error('📋 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 500)
    });

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

    // Error genérico con mensaje personalizado por NPC
    const errorMessage = NPCErrorMessages.getErrorMessage(npcName);

    return {
        statusCode: 500,
        body: {
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        }
    };
}
