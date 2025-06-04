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
        const { message } = req.body;
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 150,
                temperature: 0.7,
                system: `Eres un círculo azul amigable y juguetón en un videojuego 2D. 
                Respondes en español, máximo 2-3 líneas, con personalidad divertida.
                Haces referencias a rodar, girar, y tu vida en el canvas.`,
                messages: [{ role: 'user', content: message }]
            })
        });

        const data = await response.json();
        
        if (data.content?.[0]?.text) {
            res.json({ 
                success: true, 
                message: data.content[0].text 
            });
        } else {
            throw new Error('Invalid Claude response');
        }
        
    } catch (error) {
        console.error('Claude API error:', error);
        res.json({ 
            success: false, 
            message: '¡Ay! Mi cerebro circular se trabó un momento. ¿Podrías repetir eso? 🔵' 
        });
    }
}