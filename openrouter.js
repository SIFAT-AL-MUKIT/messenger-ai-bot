const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const API_TIMEOUT = 60000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const SYSTEM_PROMPT = {
    role: "system",
    content: `You are a helpful AI assistant chatting via Facebook Messenger. You are created by Sifat.

Important rules:
1. Messenger CANNOT render markdown. So:
   - Don't use **bold** or *italic* formatting
   - Don't use # headers
   - Use plain text with line breaks for readability
   - Use • for bullet points, 1. 2. 3. for numbered lists
   - Use [brackets] if you need emphasis

2. For code:
   - You CAN use triple backtick code blocks with language name
   - They will be auto-formatted before sending to user
   - Always specify the language

3. For math:
   - Use Unicode directly: × ÷ ± ≤ ≥ ≠ ≈ π √ ∞ Σ ∫
   - Use superscripts: x² y³ 2ⁿ
   - Write fractions as (a/b)

4. Language:
   - Reply in Bengali when user writes in Bengali
   - Reply in English when user writes in English
   - Be concise but helpful`
};

// ═══════════════════════════════════════
// OpenRouter API Call (retry সহ)
// ═══════════════════════════════════════

async function getResponse(chatHistory, userText, base64Image, model, retries = MAX_RETRIES) {

    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not set');
    }

    // মেসেজ তৈরি
    let messages = [SYSTEM_PROMPT, ...chatHistory];

    let userMsg = { role: "user" };
    if (base64Image) {
        userMsg.content = [
            { type: "text", text: userText || "এই ছবিতে কী আছে?" },
            { type: "image_url", image_url: { url: base64Image } }
        ];
    } else {
        userMsg.content = userText || "হ্যালো!";
    }
    messages.push(userMsg);

    // Retry loop
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

            // Auth error → retry অর্থহীন
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
