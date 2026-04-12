const axios = require('axios');
const { SYSTEM_INSTRUCTION } = require('./gemini');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const API_TIMEOUT = 60000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Gemini এর সাথে একই system prompt
const SYSTEM_PROMPT = {
    role: 'system',
    content: SYSTEM_INSTRUCTION
};

// ═══════════════════════════════════════
// OpenRouter API Call — text only
// ছবি এখানে আসে না, ai.js থেকে Gemini-তে পাঠানো হয়
// ═══════════════════════════════════════

async function getResponse(chatHistory, userText, model, retries = MAX_RETRIES) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not set');
    }

    const messages = [
        SYSTEM_PROMPT,
        ...chatHistory,
        { role: 'user', content: userText || 'হ্যালো!' }
    ];

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`🔄 [OpenRouter] Attempt ${attempt}/${retries} — ${model}`);

            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                { model, messages },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: API_TIMEOUT
                }
            );

            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) throw new Error('Empty response');

            console.log(`✅ [OpenRouter] Success on attempt ${attempt}`);
            return content;

        } catch (error) {
            const status = error.response?.status;
            const errMsg = error.response?.data?.error?.message || error.message;
            console.error(`❌ [OpenRouter] Attempt ${attempt}: [${status || 'N/A'}] ${errMsg}`);

            if (status === 401) throw error;

            if (attempt < retries) {
                const waitTime = RETRY_DELAY * attempt;
                console.log(`⏳ Waiting ${waitTime / 1000}s...`);
                await sleep(waitTime);
            } else {
                throw error;
            }
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { getResponse };
