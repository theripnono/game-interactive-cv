export default async function handler(req, res) {
    // Habilitar CORS
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
        const { message, npcName, npcPersonality } = req.body;

        // Validar que el mensaje existe
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Validar que la información del NPC existe
        if (!npcName || !npcPersonality) {
            return res.status(400).json({
                success: false,
                error: 'NPC information is required'
            });
        }

        // Validar que la API key existe
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('ANTHROPIC_API_KEY not found in environment variables');
            return res.status(500).json({
                success: false,
                message: '¡Ay! Mi cerebro circular se trabó un momento. ¿Podrías repetir eso? 🔵'
            });
        }

        console.log(`Sending request to Claude API for ${npcName}...`);

        // Crear prompt del sistema personalizado según el NPC
        const systemPrompt = `Eres ${npcName} en un videojuego 2D. Tu personalidad es: ${npcPersonality}

Instrucciones importantes:
- Respondes en español, máximo 2-3 líneas
- Mantén tu personalidad única y consistente
- Haz referencias ocasionales a rodar, girar, y tu vida en el canvas
- Sé auténtico a tu personalidad: ${npcPersonality}
- Usa emojis ocasionalmente que representen tu color (🔵 para azul, 🟢 para verde)`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 1000,
                temperature: 0.8, // Aumentar un poco la creatividad para personalidades más distintas
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: message
                }]
            })
        });

        // Verificar si la respuesta HTTP es exitosa
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API HTTP Error:', response.status, errorText);

            // Manejo específico de errores comunes
            switch (response.status) {
                case 401:
                    throw new Error('API Key inválida o expirada');
                case 429:
                    throw new Error('Límite de rate exceeded');
                case 400:
                    throw new Error('Solicitud mal formada');
                default:
                    throw new Error(`Error HTTP: ${response.status}`);
            }
        }

        const data = await response.json();
        console.log(`Claude API Response for ${npcName}:`, JSON.stringify(data, null, 2));

        // Verificar estructura de respuesta
        if (data.content && Array.isArray(data.content) && data.content[0] && data.content[0].text) {
            res.json({
                success: true,
                message: data.content[0].text.trim()
            });
        } else {
            console.error('Invalid Claude response structure:', data);
            throw new Error('Estructura de respuesta inválida de Claude');
        }

    } catch (error) {
        console.error('Claude API error:', error.message);
        console.error('Error stack:', error.stack);

        // Mensaje de error personalizado según el NPC si está disponible
        let errorMessage = '¡Ay! Mi cerebro circular se trabó un momento. ¿Podrías repetir eso?';
        const { npcName } = req.body;
        
        if (npcName === 'Círculo Azul') {
            errorMessage += ' 🔵';
        } else if (npcName === 'Círculo Verde') {
            errorMessage += ' 🟢';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}