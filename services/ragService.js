/**
 * Servicio RAG (Retrieval-Augmented Generation) para gestionar búsquedas semánticas
 * Integra OpenAI para embeddings y Qdrant para búsqueda vectorial
 */

export class RAGService {
    constructor(openaiApiKey, qdrantConfig) {
        this.openaiApiKey = openaiApiKey;
        this.qdrantConfig = {
            url: qdrantConfig.url || process.env.QDRANT_URL || 'https://f18c8e30-d541-451a-8397-252eee5256ed.europe-west3-0.gcp.cloud.qdrant.io:6333',
            apiKey: qdrantConfig.apiKey,
            collectionName: qdrantConfig.collectionName || 'cv_embeddings'
        };
        this.embeddingModel = 'text-embedding-3-small';
    }

    /**
     * Verificar si una consulta es sobre CV/información personal
     */
    isAboutCV(message) {
        if (!message || typeof message !== 'string') {
            return false;
        }

        const messageLower = message.toLowerCase();
        const cvKeywords = [
            'david', 'farmer', 'granjero',
            'experience', 'experiencia',
            'skill', 'habilidad', 'habilidades',
            'education', 'educación',
            'background', 'trasfondo',
            'work', 'trabajo',
            'career', 'carrera',
            'qualification', 'cualificación'
        ];

        console.log(`🔍 DEBUG: Analizando mensaje: "${message}"`);
        console.log(`🔍 DEBUG: Mensaje en minúsculas: "${messageLower}"`);

        const matches = cvKeywords.filter(keyword => messageLower.includes(keyword));
        const isAbout = matches.length > 0;

        console.log(`🔍 DEBUG: Palabras clave encontradas: [${matches.join(', ')}]`);
        console.log(`🔍 DEBUG: ¿Es sobre CV? ${isAbout}`);

        return isAbout;
    }

    /**
     * Buscar información relevante del CV
     */
    async searchCVInformation(query, limit = 4) {
        console.log('🔧 DEBUG: Iniciando búsqueda RAG');
        console.log(`🔧 DEBUG: Query: "${query}"`);
        console.log(`🔧 DEBUG: Limit: ${limit}`);

        try {
            // Validar configuración
            if (!this.validateConfiguration()) {
                throw new RAGError('RAG service not properly configured', 'CONFIG_ERROR');
            }

            // Crear embedding de la consulta
            console.log('🔍 Creando embedding para la consulta...');
            const embedding = await this.createEmbedding(query);

            if (!embedding) {
                throw new RAGError('Failed to create embedding', 'EMBEDDING_ERROR');
            }

            // Buscar en Qdrant
            console.log('🔍 Buscando en Qdrant...');
            const searchResults = await this.searchInQdrant(embedding, limit);

            console.log(`📊 Encontrados ${searchResults.length} resultados`);

            if (searchResults.length === 0) {
                console.log('⚠️ No se encontraron resultados, intentando búsqueda sin threshold...');
                const fallbackResults = await this.searchWithoutThreshold(embedding, limit);
                return this.formatSearchResults(fallbackResults, query, true);
            }

            return this.formatSearchResults(searchResults, query, false);

        } catch (error) {
            console.error('❌ Error en búsqueda RAG:', error);
            return {
                success: false,
                error: error.message,
                contexts: [],
                query
            };
        }
    }

    /**
     * Crear embedding usando OpenAI
     */
    async createEmbedding(text) {
        console.log('🔧 DEBUG: Iniciando createEmbedding');
        console.log(`🔧 DEBUG: Texto: "${text}" (${text?.length || 0} caracteres)`);

        try {
            // Validar y limpiar texto
            const cleanText = this.preprocessText(text);
            if (!cleanText) {
                throw new RAGError('Empty or invalid text for embedding', 'INVALID_TEXT');
            }

            const requestBody = {
                model: this.embeddingModel,
                input: cleanText,
                encoding_format: 'float'
            };

            console.log('🔧 DEBUG: Enviando solicitud a OpenAI...');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

            try {
                const response = await fetch('https://api.openai.com/v1/embeddings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.openaiApiKey.trim()}`
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                console.log(`🔧 DEBUG: OpenAI response status: ${response.status}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ OpenAI API error:', errorText);
                    throw this.handleOpenAIError(response.status, errorText);
                }

                const data = await response.json();

                if (!this.validateEmbeddingResponse(data)) {
                    throw new RAGError('Invalid embedding response structure', 'INVALID_RESPONSE');
                }

                const embedding = data.data[0].embedding;
                console.log(`✅ Embedding creado (dimensiones: ${embedding.length})`);

                return embedding;
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }

        } catch (error) {
            console.error('❌ Error creando embedding:', error);
            throw error instanceof RAGError ? error : new RAGError(error.message, 'EMBEDDING_ERROR');
        }
    }

    /**
     * Buscar en Qdrant con threshold
     */
    async searchInQdrant(embedding, limit, scoreThreshold = 0.3) {
        const searchPayload = {
            vector: embedding,
            limit: limit,
            score_threshold: scoreThreshold,
            with_payload: true,
            with_vector: false
        };

        console.log('🔧 DEBUG: Búsqueda en Qdrant con threshold:', scoreThreshold);

        const response = await this.executeQdrantSearch(searchPayload);
        const results = response.result || [];

        if (results.length > 0) {
            this.logSearchResults(results);
        }

        return results;
    }

    /**
     * Búsqueda en Qdrant sin threshold como fallback
     */
    async searchWithoutThreshold(embedding, limit) {
        console.log('🔄 Ejecutando búsqueda sin threshold...');

        const searchPayload = {
            vector: embedding,
            limit: limit,
            with_payload: true,
            with_vector: false
            // Sin score_threshold
        };

        const response = await this.executeQdrantSearch(searchPayload);
        const results = response.result || [];

        console.log(`🔄 Búsqueda sin threshold: ${results.length} resultados`);

        if (results.length > 0) {
            this.logSearchResults(results);
        }

        return results;
    }

    /**
     * Ejecutar búsqueda en Qdrant
     */
    async executeQdrantSearch(searchPayload) {
        const searchUrl = `${this.qdrantConfig.url}/collections/${this.qdrantConfig.collectionName}/points/search`;

        console.log('🔧 DEBUG: URL de búsqueda:', searchUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

        try {
            const response = await fetch(searchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.qdrantConfig.apiKey
                },
                body: JSON.stringify(searchPayload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log(`🔧 DEBUG: Qdrant response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Qdrant error:', errorText);
                throw new RAGError(`Qdrant search failed: ${response.status} - ${errorText}`, 'QDRANT_ERROR');
            }

            const data = await response.json();
            console.log('🔧 DEBUG: Respuesta de Qdrant recibida');

            return data;
        } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
        }
    }

    /**
     * Formatear contexto para Claude
     */
    formatContextForClaude(searchResults) {
        if (!searchResults || searchResults.length === 0) {
            return '';
        }

        return searchResults
            .map((doc, index) => {
                const content = doc.payload?.content || '';
                const score = doc.score ? ` (relevancia: ${(doc.score * 100).toFixed(1)}%)` : '';
                return `[Info CV ${index + 1}${score}]: ${content.trim()}`;
            })
            .join('\n');
    }

    /**
     * Formatear resultados de búsqueda
     */
    formatSearchResults(results, query, isFallback = false) {
        const contexts = results.filter(result => result.payload?.content);

        return {
            success: true,
            contexts: contexts,
            query: query,
            isFallback: isFallback,
            metadata: {
                totalResults: results.length,
                validContexts: contexts.length,
                avgScore: contexts.length > 0 ?
                    contexts.reduce((sum, doc) => sum + (doc.score || 0), 0) / contexts.length : 0
            }
        };
    }

    /**
     * Validar configuración del servicio
     */
    validateConfiguration() {
        const hasOpenAI = this.openaiApiKey && this.openaiApiKey.trim() !== '';
        const hasQdrant = this.qdrantConfig.apiKey && this.qdrantConfig.url;

        console.log(`🔧 DEBUG: OpenAI configurado: ${hasOpenAI}`);
        console.log(`🔧 DEBUG: Qdrant configurado: ${hasQdrant}`);

        if (!hasOpenAI) {
            console.warn('⚠️ OpenAI API key not configured');
        }
        if (!hasQdrant) {
            console.warn('⚠️ Qdrant configuration incomplete');
        }

        return hasOpenAI && hasQdrant;
    }

    /**
     * Preprocesar texto para embedding
     */
    preprocessText(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }

        // Limpiar y limitar texto
        const cleaned = text.trim().substring(0, 8000);

        console.log(`🔧 DEBUG: Texto limpio: "${cleaned}" (${cleaned.length} caracteres)`);

        return cleaned.length > 0 ? cleaned : null;
    }

    /**
     * Validar respuesta de embedding
     */
    validateEmbeddingResponse(data) {
        return data &&
            data.data &&
            Array.isArray(data.data) &&
            data.data[0] &&
            Array.isArray(data.data[0].embedding) &&
            data.data[0].embedding.length > 0;
    }

    /**
     * Manejar errores de OpenAI API
     */
    handleOpenAIError(status, errorText) {
        switch (status) {
            case 401:
                return new RAGError('Invalid or expired OpenAI API Key', 'OPENAI_AUTH_ERROR');
            case 429:
                return new RAGError('OpenAI rate limit exceeded', 'OPENAI_RATE_LIMIT');
            case 400:
                return new RAGError('Invalid request to OpenAI API', 'OPENAI_BAD_REQUEST');
            default:
                return new RAGError(`OpenAI API error: ${status} - ${errorText}`, 'OPENAI_ERROR');
        }
    }

    /**
     * Logging de resultados de búsqueda
     */
    logSearchResults(results) {
        const scores = results.map(r => r.score?.toFixed(3) || 'N/A').join(', ');
        console.log(`📈 Scores de relevancia: [${scores}]`);

        results.forEach((result, index) => {
            console.log(`🔧 DEBUG: Resultado ${index + 1}:`, {
                score: result.score,
                hasPayload: !!result.payload,
                contentPreview: result.payload?.content?.substring(0, 100) || 'No content'
            });
        });
    }

    /**
     * Obtener estadísticas de uso
     */
    getUsageStats() {
        return {
            service: 'RAG',
            embeddingModel: this.embeddingModel,
            qdrantCollection: this.qdrantConfig.collectionName,
            configured: this.validateConfiguration(),
            qdrantUrl: this.qdrantConfig.url
        };
    }
}

/**
 * Clase de error personalizada para RAG
 */
export class RAGError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'RAGError';
        this.code = code;
    }
}

/**
 * Factory para crear instancia de RAGService
 */
export function createRAGService(openaiApiKey, qdrantConfig) {
    if (!openaiApiKey || !qdrantConfig.apiKey) {
        console.warn('⚠️ RAG Service creation skipped - missing required API keys');
        return null;
    }
    return new RAGService(openaiApiKey, qdrantConfig);
}