const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const API_TIMEOUT = 60000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// ═══════════════════════════════════════
// ★ সহজ System Prompt
// ═══════════════════════════════════════

const SYSTEM_INSTRUCTION = `You are a helpful AI assistant chatting via Facebook Messenger. You are created by Sifat.

Important:
- Messenger cannot render markdown properly
- Avoid using ** for bold, * for italic, # for headers
- Use plain text with line breaks
- For code: use triple backticks with language name
- For math: use Unicode symbols (×, ÷, π, √, ², ³) and write fractions as a/b
- Keep responses concise and helpful`;

// ═══════════════════════════════════════
// Chat History → Gemini Format
// ═══════════════════════════════════════

function buildContents(chatHistory, userText, base64Image) {
    const contents = [];

    // চ্যাট হিস্ট্রি
    for (const msg of chatHistory) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        const lastItem = contents[contents.length - 1];

        if (lastItem && lastItem.role === role) {
            lastItem.parts.push({ text: msg.content });
        } else {
            contents.push({
                role,
                parts: [{ text: msg.content }]
            });
        }
    }

    // বর্তমান মেসেজ
    const userParts = [];

    if (userText) {
        userParts.push({ text: userText });
    }

    if (base64Image) {
        if (!userText) {
            userParts.push({ text: "এই ছবিতে কী আছে বিস্তারিত বলো।" });
        }
        const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
            userParts.push({
                inline_data: {
                    mime_type: match[1],
                    data: match[2]
                }
            });
        }
    }

    if (userParts.length === 0) {
        userParts.push({ text: "Hello!" });
    }

    // Gemini র নিয়ম: user → model → user পর্যায়ক্রমে
    const lastItem = contents[contents.length - 1];
    if (lastItem && lastItem.role === 'user') {
        contents.push({ role: 'model', parts: [{ text: '.' }] });
    }

    contents.push({ role: 'user', parts: userParts });

    // প্রথম মেসেজ model হলে fix
    if (contents.length > 0 && contents[0].role === 'model') {
        contents.unshift({ role: 'user', parts: [{ text: '.' }] });
    }

    return contents;
}

// ═══════════════════════════════════════
// Gemini API Call (retry সহ)
// ═══════════════════════════════════════

async function getResponse(chatHistory, userText, base64Image, model, retries = MAX_RETRIES) {

    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const contents = buildContents(chatHistory, userText, base64Image);

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`🔄 [Gemini] Attempt ${attempt}/${retries} — ${model}`);

            const response = await axios.post(
                `${BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    system_instruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION }]
                    },
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                        topP: 0.95
                    }
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: API_TIMEOUT
                }
            );

            const candidate = response.data?.candidates?.[0];

            if (!candidate?.content?.parts) {
                const reason = candidate?.finishReason || 'UNKNOWN';
                throw new Error(`No content. Reason: ${reason}`);
            }

            // Thinking parts filter
            const textParts = candidate.content.parts
                .filter(p => !p.thought)
                .map(p => p.text)
                .filter(Boolean);

            const text = textParts.join('\n').trim();

            if (!text) {
                throw new Error('Empty response');
            }

            console.log(`✅ [Gemini] Success on attempt ${attempt}`);
            return text;

        } catch (error) {
            const status = error.response?.status;
            const errMsg = error.response?.data?.error?.message || error.message;
            console.error(`❌ [Gemini] Attempt ${attempt}: [${status || 'N/A'}] ${errMsg}`);

            if (status === 403 || status === 401) {
                throw error;
            }

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