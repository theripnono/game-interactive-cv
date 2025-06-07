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

        // Create custom system prompt based on NPC - AÑADIDO npcId aquí
        const systemPrompt = `You are ${npcName}, a ${npcId || 'character'} in a 2D farm world video game. Your personality is: ${npcPersonality}

        Important instructions:
        - Respond in the same language as user input, maximum 2-3 lines
        - Keep your unique and consistent personality as a ${npcId || 'character'}
        - Be authentic to your personality: ${npcPersonality}
        - Use occasional emojis that represent your animal type (🐄 for cow, 🐑 for sheep)
        - Make sounds appropriate to your animal type (moo/muuu for cow, baa/beee for sheep)
        - End your responses with "you must recruit my farmer`;

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
            res.json({
                success: true,
                message: claudeResponse.content[0].text.trim()
            });
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
 * Function to call Claude API with retry logic and overload handling
 */
async function callClaudeWithRetry(payload, maxRetries = 3, baseDelayMs = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Claude API attempt ${attempt}/${maxRetries}`);

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
                console.warn(`Claude API Overloaded (attempt ${attempt}):`, errorData);

                // If it's not the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    const retryAfter = response.headers.get('retry-after');
                    const delay = retryAfter ? parseInt(retryAfter) * 1000 :
                        baseDelayMs * Math.pow(2, attempt - 1); // exponential backoff

                    console.log(`Waiting ${delay}ms before retry...`);
                    await sleep(delay);
                    continue;
                }

                throw new Error(`Claude API overloaded after ${maxRetries} attempts`);
            }

            // Other HTTP errors
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Claude API HTTP Error:', response.status, errorText);

                switch (response.status) {
                    case 401:
                        throw new Error('Invalid or expired API Key');
                    case 429:
                        // Rate limit - also retry
                        if (attempt < maxRetries) {
                            const retryAfter = response.headers.get('retry-after') || 60;
                            console.log(`Rate limited, waiting ${retryAfter}s...`);
                            await sleep(parseInt(retryAfter) * 1000);
                            continue;
                        }
                        throw new Error('Rate limit exceeded');
                    case 400:
                        throw new Error('Malformed request');
                    case 503:
                        // Service unavailable - similar to 529
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

            // Successful response
            const data = await response.json();
            return data;

        } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed:`, error.message);

            // If it's the last attempt or a non-recoverable error, throw the error
            if (attempt === maxRetries ||
                error.message.includes('Invalid or expired API Key') ||
                error.message.includes('Malformed request')) {
                throw error;
            }

            // Wait before next attempt (only for network errors)
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                console.log(`Network error, waiting ${delay}ms before retry...`);
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
    const baseMessage = 'Oops! My circular brain got stuck for a moment. Could you repeat that?';

    switch (npcName) {
        case 'Blue Circle':
        case 'Círculo Azul':
            return baseMessage + ' 🔵';
        case 'Green Circle':
        case 'Círculo Verde':
            return baseMessage + ' 🟢';
        default:
            return baseMessage;
    }
}

/**
 * Specific messages for when the API is overloaded
 */
function getNPCRetryMessage(npcName) {
    const messages = {
        'Blue Circle': '🔵 Whoa! Too many people are talking to me. Give me a second to process everything...',
        'Círculo Azul': '🔵 Whoa! Too many people are talking to me. Give me a second to process everything...',
        'Green Circle': '🟢 Wow! Looks like all the circles are being very chatty today. Try again in a moment...',
        'Círculo Verde': '🟢 Wow! Looks like all the circles are being very chatty today. Try again in a moment...',
        default: 'There\'s a lot of activity in my circular world! Give me a few seconds and try again...'
    };

    return messages[npcName] || messages.default;
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

        // Clean old requests
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
 * Optional: Circuit breaker pattern for additional resilience
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