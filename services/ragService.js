/**
 * Servicio RAG mejorado para trabajar con chunks semánticamente optimizados
 * Integra OpenAI para embeddings y Qdrant para búsqueda vectorial con metadatos enriquecidos
 */

export class RAGService {
    constructor(openaiApiKey, qdrantConfig) {
        this.openaiApiKey = openaiApiKey;
        this.qdrantConfig = {
            url: qdrantConfig.url || process.env.QDRANT_URL || 'https://f18c8e30-d541-451a-8397-252eee5256ed.europe-west3-0.gcp.cloud.qdrant.io:6333',
            apiKey: qdrantConfig.apiKey,
            collectionName: qdrantConfig.collectionName || 'cv_embeddings'
        };
        this.embeddingModel = 'text-embedding-ada-002';

        this.searchConfig = {
            defaultLimit: 3,
            scoreThreshold: 0.5,
            fallbackThreshold: 0.3,
            maxContextLength: 2000
        };
    }

    // ==========================================
    // MÉTODOS DE DETECCIÓN Y VALIDACIÓN
    // ==========================================

    /**
     * ✅ Verificación más inteligente de consultas CV
     */
    isAboutCV(message) {
        if (!message || typeof message !== 'string') {
            return false;
        }

        const messageLower = message.toLowerCase();

        const cvKeywords = {
            personal: ['david', 'farmer', 'granjero', 'rosset', 'gomez'],
            professional: [
                'experience', 'experiencia', 'trabajo', 'work', 'career', 'carrera',
                'job', 'position', 'puesto', 'role', 'empresa', 'company'
            ],
            technical: [
                'skill', 'skills', 'habilidad', 'habilidades', 'technology', 'tecnologia',
                'python', 'javascript', 'aws', 'data', 'ai', 'ml', 'langchain',
                'programming', 'programacion', 'desarrollo', 'development', 'technical', 'soft'
            ],
            educational: [
                'education', 'educacion', 'master', 'degree', 'university', 'universidad',
                'study', 'estudios', 'qualification', 'cualificacion', 'course', 'curso',
                'courses', 'cursos', 'training', 'formacion'
            ],
            projects: [
                'project', 'proyecto', 'projects', 'proyectos', 'github', 'portfolio',
                'build', 'create', 'develop', 'desarrollar'
            ],
            languages: [
                'language', 'languages', 'idioma', 'idiomas', 'speak', 'habla',
                'english', 'spanish', 'french', 'ingles', 'español', 'frances'
            ],
            contact: [
                'contact', 'contacto', 'email', 'phone', 'telefono', 'reach',
                'communicate', 'comunicar', 'call', 'llamar'
            ],
            interests: [
                'interests', 'intereses', 'hobbies', 'personal', 'like', 'gusta',
                'enjoy', 'disfruta', 'passion', 'pasion'
            ]
        };

        console.log(`🔍 DEBUG: Analizando mensaje: "${message}"`);

        // Calcular matches por categoría
        const matches = {};
        let totalMatches = 0;

        Object.entries(cvKeywords).forEach(([category, keywords]) => {
            const categoryMatches = keywords.filter(keyword => messageLower.includes(keyword));
            matches[category] = categoryMatches;
            totalMatches += categoryMatches.length;
        });

        const isAbout = totalMatches >= 1 ||
            matches.personal.length > 0 ||
            (matches.professional.length > 0 && matches.technical.length > 0);

        console.log(`🔍 DEBUG: Matches por categoría:`, matches);
        console.log(`🔍 DEBUG: Total matches: ${totalMatches}`);
        console.log(`🔍 DEBUG: ¿Es sobre CV? ${isAbout}`);

        return isAbout;
    }

    /**
     * ✅ Detectar intención de la consulta
     */
    detectQueryIntent(query) {
        const queryLower = query.toLowerCase();

        const intentPatterns = {
            experience: {
                keywords: ['experience', 'experiencia', 'trabajo', 'work', 'career', 'carrera', 'empresa', 'company', 'position', 'puesto', 'job'],
                chunkTypes: ['work_experience', 'other_experience'],
                limit: 3
            },
            skills: {
                keywords: ['skill', 'skills', 'habilidad', 'habilidades', 'technology', 'tecnologia', 'python', 'javascript', 'aws', 'programming', 'programacion', 'technical'],
                chunkTypes: ['technical_skills', 'soft_skills'],
                limit: 3
            },
            projects: {
                keywords: ['project', 'proyecto', 'projects', 'github', 'build', 'develop', 'desarrollar', 'portfolio'],
                chunkTypes: ['projects'],
                limit: 2
            },
            education: {
                keywords: ['education', 'educacion', 'master', 'university', 'universidad', 'study', 'estudios', 'degree', 'titulo', 'course', 'curso'],
                chunkTypes: ['education', 'courses'],
                limit: 3
            },
            personal: {
                keywords: ['who', 'quien', 'background', 'about', 'personal', 'interests', 'hobbies', 'contact', 'contacto'],
                chunkTypes: ['profile', 'personal_interests', 'contact'],
                limit: 3
            },
            languages: {
                keywords: ['language', 'languages', 'idioma', 'idiomas', 'speak', 'habla', 'english', 'spanish', 'frances'],
                chunkTypes: ['languages'],
                limit: 2
            },
            courses: {
                keywords: ['course', 'courses', 'curso', 'cursos', 'training', 'formacion', 'certification', 'certificacion'],
                chunkTypes: ['courses'],
                limit: 2
            },
            contact: {
                keywords: ['contact', 'contacto', 'email', 'phone', 'telefono', 'reach', 'communicate'],
                chunkTypes: ['contact'],
                limit: 1
            }
        };

        // Detectar intención con mayor peso
        let bestIntent = { type: 'general', chunkTypes: null, limit: 3 };
        let maxScore = 0;

        Object.entries(intentPatterns).forEach(([intentType, config]) => {
            const score = config.keywords.reduce((acc, keyword) => {
                return acc + (queryLower.includes(keyword) ? 1 : 0);
            }, 0);

            if (score > maxScore) {
                maxScore = score;
                bestIntent = { type: intentType, ...config };
            }
        });

        console.log(`🎯 Intent: ${bestIntent.type} (score: ${maxScore})`);
        console.log(`🏷️ Chunk types a filtrar: ${bestIntent.chunkTypes || 'ninguno'}`);

        return bestIntent;
    }

    /**
     * ✅ Validar chunk_types
     */
    async validateChunkTypes(chunkTypes) {
        const validChunkTypes = [
            'courses', 'other_experience', 'work_experience', 'languages',
            'profile', 'personal_interests', 'technical_skills', 'education',
            'projects', 'soft_skills', 'contact'
        ];

        if (!chunkTypes || !Array.isArray(chunkTypes)) {
            return null;
        }

        const validTypes = chunkTypes.filter(type => validChunkTypes.includes(type));

        if (validTypes.length !== chunkTypes.length) {
            const invalidTypes = chunkTypes.filter(type => !validChunkTypes.includes(type));
            console.warn(`⚠️ Chunk types inválidos ignorados: ${invalidTypes.join(', ')}`);
        }

        return validTypes.length > 0 ? validTypes : null;
    }

    // ==========================================
    // MÉTODOS DE BÚSQUEDA PRINCIPALES
    // ==========================================

    /**
     * ✅ Búsqueda inteligente con detección automática de tipo
     */
    async searchByIntent(query) {
        const intent = this.detectQueryIntent(query);
        console.log(`🎯 Intent detectado: ${intent.type}`);

        const searchOptions = {
            limit: intent.limit,
            chunkTypes: intent.chunkTypes
        };

        return await this.searchCVInformation(query, searchOptions);
    }

    /**
     * ✅ Búsqueda con filtros por tipo de chunk y metadatos
     */
    async searchCVInformation(query, options = {}) {
        const {
            limit = this.searchConfig.defaultLimit,
            chunkTypes = null,
            includeMetadata = true
        } = options;

        console.log('🔧 DEBUG: Iniciando búsqueda RAG mejorada');
        console.log(`🔧 DEBUG: Query: "${query}"`);
        console.log(`🔧 DEBUG: Chunk types filter:`, chunkTypes);

        try {
            if (!this.validateConfiguration()) {
                throw new RAGError('RAG service not properly configured', 'CONFIG_ERROR');
            }

            // Crear embedding
            console.log('🔍 Creando embedding para la consulta...');
            const embedding = await this.createEmbedding(query);

            if (!embedding) {
                throw new RAGError('Failed to create embedding', 'EMBEDDING_ERROR');
            }

            // Búsqueda con filtros
            console.log('🔍 Buscando en Qdrant con filtros...');
            const searchResults = await this.searchWithFilters(embedding, {
                limit,
                chunkTypes,
                scoreThreshold: this.searchConfig.scoreThreshold
            });

            console.log(`📊 Encontrados ${searchResults.length} resultados`);

            if (searchResults.length === 0) {
                console.log('⚠️ No se encontraron resultados, intentando búsqueda fallback...');
                const fallbackResults = await this.searchWithFilters(embedding, {
                    limit: limit * 2,
                    chunkTypes: null, // Sin filtros en fallback
                    scoreThreshold: this.searchConfig.fallbackThreshold
                });
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
     * ✅ Búsqueda con filtros de metadatos (ÚNICA VERSIÓN)
     */
    async searchWithFilters(embedding, options = {}) {
        const { limit, chunkTypes, scoreThreshold } = options;

        // Validar chunk_types antes de usar
        const validChunkTypes = await this.validateChunkTypes(chunkTypes);

        // Construir filtros para Qdrant
        let filter = null;
        if (validChunkTypes && validChunkTypes.length > 0) {
            filter = {
                should: validChunkTypes.map(type => ({
                    key: "chunk_type",
                    match: { value: type }
                }))
            };
        }

        const searchPayload = {
            vector: embedding,
            limit: limit,
            with_payload: true,
            with_vector: false
        };

        // Añadir threshold y filtros si están definidos
        if (scoreThreshold) {
            searchPayload.score_threshold = scoreThreshold;
        }
        if (filter) {
            searchPayload.filter = filter;
        }

        console.log('🔧 DEBUG: Payload de búsqueda:', JSON.stringify(searchPayload, null, 2));

        return await this.executeQdrantSearch(searchPayload);
    }

    // ==========================================
    // MÉTODOS DE EMBEDDING Y COMUNICACIÓN
    // ==========================================

    /**
     * ✅ Crear embedding con retry y mejores configuraciones
     */
    async createEmbedding(text) {
        console.log('🔧 DEBUG: Iniciando createEmbedding');
        console.log(`🔧 DEBUG: Texto: "${text}" (${text?.length || 0} caracteres)`);

        try {
            const cleanText = this.preprocessText(text);
            if (!cleanText) {
                throw new RAGError('Empty or invalid text for embedding', 'INVALID_TEXT');
            }

            const requestBody = {
                model: this.embeddingModel,
                input: cleanText,
                encoding_format: 'float'
            };

            return await this.callWithRetry(async () => {
                const response = await fetch('https://api.openai.com/v1/embeddings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.openaiApiKey.trim()}`
                    },
                    body: JSON.stringify(requestBody)
                });

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
            });

        } catch (error) {
            console.error('❌ Error creando embedding:', error);
            throw error instanceof RAGError ? error : new RAGError(error.message, 'EMBEDDING_ERROR');
        }
    }

    /**
     * ✅ Llamada con retry y backoff exponencial
     */
    async callWithRetry(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Intento ${attempt}/${maxRetries} falló:`, error.message);

                if (attempt === maxRetries) break;

                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }

    /**
     * ✅ Ejecutar búsqueda en Qdrant
     */
    async executeQdrantSearch(searchPayload) {
        const searchUrl = `${this.qdrantConfig.url}/collections/${this.qdrantConfig.collectionName}/points/search`;

        console.log('🔧 DEBUG: URL de búsqueda:', searchUrl);
        console.log('🔧 DEBUG: Colección:', this.qdrantConfig.collectionName);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

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

            const results = data.result || [];

            if (results.length > 0) {
                this.logSearchResults(results);
            }

            return results;
        } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
        }
    }

    // ==========================================
    // MÉTODOS DE FORMATEO Y UTILIDADES
    // ==========================================

    /**
     * ✅ Formateo de contexto con metadatos enriquecidos
     */
    formatContextForClaude(searchResults) {
        if (!searchResults || searchResults.length === 0) {
            return '';
        }

        return searchResults
            .map((doc, index) => {
                const payload = doc.payload || {};
                const content = payload.content || '';
                const score = doc.score ? ` (${(doc.score * 100).toFixed(1)}% relevancia)` : '';

                let contextInfo = `[Info CV ${index + 1}${score}]`;

                // Añadir metadatos específicos según el tipo
                if (payload.chunk_type === 'work_experience' || payload.chunk_type === 'other_experience') {
                    if (payload.company && payload.position) {
                        contextInfo += ` [${payload.company} - ${payload.position}]`;
                    }
                    if (payload.dates) {
                        contextInfo += ` [${payload.dates}]`;
                    }
                } else if (payload.chunk_type === 'technical_skills') {
                    if (payload.skill_count) {
                        contextInfo += ` [${payload.skill_count} skills]`;
                    }
                } else if (payload.chunk_type === 'projects') {
                    if (payload.project_count) {
                        contextInfo += ` [${payload.project_count} proyectos]`;
                    }
                }

                return `${contextInfo}: ${content.trim()}`;
            })
            .join('\n\n');
    }

    /**
     * ✅ Formatear resultados de búsqueda
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
                    contexts.reduce((sum, doc) => sum + (doc.score || 0), 0) / contexts.length : 0,
                chunkTypes: [...new Set(contexts.map(c => c.payload?.chunk_type).filter(Boolean))]
            }
        };
    }

    /**
     * ✅ Logging de resultados con metadatos
     */
    logSearchResults(results) {
        const scores = results.map(r => r.score?.toFixed(3) || 'N/A').join(', ');
        console.log(`📈 Scores de relevancia: [${scores}]`);

        results.forEach((result, index) => {
            const payload = result.payload || {};
            console.log(`🔧 DEBUG: Resultado ${index + 1}:`, {
                score: result.score,
                chunkType: payload.chunk_type,
                section: payload.section,
                company: payload.company,
                skillCount: payload.skill_count,
                contentPreview: payload.content?.substring(0, 100) || 'No content'
            });
        });
    }

    // ==========================================
    // MÉTODOS DE ESTADÍSTICAS Y CONFIGURACIÓN
    // ==========================================

    /**
     * ✅ Estadísticas por chunk_type
     */
    async getChunkTypeStats() {
        try {
            const allChunkTypes = [
                'courses', 'other_experience', 'work_experience', 'languages',
                'profile', 'personal_interests', 'technical_skills', 'education',
                'projects', 'soft_skills', 'contact'
            ];

            const stats = {};

            for (const chunkType of allChunkTypes) {
                try {
                    const countUrl = `${this.qdrantConfig.url}/collections/${this.qdrantConfig.collectionName}/points/count`;

                    const response = await fetch(countUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'api-key': this.qdrantConfig.apiKey
                        },
                        body: JSON.stringify({
                            filter: {
                                must: [{
                                    key: "chunk_type",
                                    match: { value: chunkType }
                                }]
                            }
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        stats[chunkType] = data.result?.count || 0;
                    } else {
                        stats[chunkType] = 'Error';
                    }
                } catch (error) {
                    stats[chunkType] = 'Error';
                }
            }

            return {
                success: true,
                stats: stats,
                total: Object.values(stats).reduce((sum, count) =>
                    typeof count === 'number' ? sum + count : sum, 0)
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas por chunk_type:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * ✅ Estadísticas de la colección
     */
    async getCollectionStats() {
        try {
            const statsUrl = `${this.qdrantConfig.url}/collections/${this.qdrantConfig.collectionName}`;

            const response = await fetch(statsUrl, {
                method: 'GET',
                headers: {
                    'api-key': this.qdrantConfig.apiKey
                }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    stats: data.result
                };
            }
        } catch (error) {
            console.warn('⚠️ No se pudieron obtener estadísticas de la colección:', error.message);
        }

        return { success: false };
    }

    /**
     * ✅ Validar configuración
     */
    validateConfiguration() {
        const hasOpenAI = this.openaiApiKey && this.openaiApiKey.trim() !== '';
        const hasQdrant = this.qdrantConfig.apiKey && this.qdrantConfig.url;

        console.log(`🔧 DEBUG: OpenAI configurado: ${hasOpenAI}`);
        console.log(`🔧 DEBUG: Qdrant configurado: ${hasQdrant}`);
        console.log(`🔧 DEBUG: Colección: ${this.qdrantConfig.collectionName}`);

        return hasOpenAI && hasQdrant;
    }

    /**
     * ✅ Preprocesar texto
     */
    preprocessText(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }

        const cleaned = text.trim().substring(0, 8000);
        console.log(`🔧 DEBUG: Texto limpio: "${cleaned}" (${cleaned.length} caracteres)`);
        return cleaned.length > 0 ? cleaned : null;
    }

    /**
     * ✅ Validar respuesta de embedding
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
     * ✅ Manejar errores de OpenAI
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
     * ✅ Estadísticas de uso
     */
    getUsageStats() {
        return {
            service: 'RAG Enhanced',
            embeddingModel: this.embeddingModel,
            qdrantCollection: this.qdrantConfig.collectionName,
            configured: this.validateConfiguration(),
            qdrantUrl: this.qdrantConfig.url,
            searchConfig: this.searchConfig
        };
    }
}

/**
 * ✅ Clase de error personalizada para RAG
 */
export class RAGError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'RAGError';
        this.code = code;
    }
}

/**
 * ✅ Factory con validación de colección
 */
export async function createRAGService(openaiApiKey, qdrantConfig) {
    if (!openaiApiKey || !qdrantConfig.apiKey) {
        console.warn('⚠️ RAG Service creation skipped - missing required API keys');
        return null;
    }

    const ragService = new RAGService(openaiApiKey, qdrantConfig);

    // Verificar que la colección existe
    const stats = await ragService.getCollectionStats();
    if (stats.success) {
        console.log(`✅ RAG Service conectado a colección: ${qdrantConfig.collectionName}`);
        console.log(`📊 Vectores en colección: ${stats.stats?.vectors_count || 'N/A'}`);
    } else {
        console.warn(`⚠️ No se pudo verificar la colección: ${qdrantConfig.collectionName}`);
    }

    return ragService;
}