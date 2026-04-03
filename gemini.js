const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const API_TIMEOUT = 60000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Gemini models Messenger এর limitations ভালো বোঝে
// তাই prompt সংক্ষিপ্ত কিন্তু কার্যকর
const SYSTEM_INSTRUCTION = `You are a helpful AI assistant chatting via Facebook Messenger.

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
   - Be concise but helpful`;

// ═══════════════════════════════════════
// OpenAI-style history → Gemini format
// ═══════════════════════════════════════
// Gemini তে:
//   - "assistant" → "model"
//   - system prompt আলাদা (system_instruction)
//   - contents এ user/model পর্যায়ক্রমে আসতে হবে
//   - ছবি → inline_data (data URI নয়, raw base64)

function buildContents(chatHistory, userText, base64Image) {
    const contents = [];

    // চ্যাট হিস্ট্রি যোগ করা
    for (const msg of chatHistory) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        const lastItem = contents[contents.length - 1];

        // একই role পরপর থাকলে merge করা (Gemini এর নিয়ম: পর্যায়ক্রমে আসতে হবে)
        if (lastItem && lastItem.role === role) {
            lastItem.parts.push({ text: msg.content });
        } else {
            contents.push({
                role,
                parts: [{ text: msg.content }]
            });
        }
    }

    // বর্তমান ইউজার মেসেজ তৈরি
    const userParts = [];

    if (userText) {
        userParts.push({ text: userText });
    }

    if (base64Image) {
        if (!userText) {
            userParts.push({ text: "এই ছবিতে কী আছে বিস্তারিত বাংলায় বলো।" });
        }
        // data:image/jpeg;base64,xxxxx → আলাদা করা
        const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
            userParts.push({
                inline_data: {
                    mime_type: match[1],
                    data: match[2]  // raw base64, prefix ছাড়া
                }
            });
        }
    }

    if (userParts.length === 0) {
        userParts.push({ text: "হ্যালো!" });
    }

    // শেষ item ও "user" হলে, মাঝে একটা filler "model" দিতে হবে
    const lastItem = contents[contents.length - 1];
    if (lastItem && lastItem.role === 'user') {
        contents.push({ role: 'model', parts: [{ text: '.' }] });
    }

    contents.push({ role: 'user', parts: userParts });

    // প্রথম মেসেজ "model" হলে Gemini error দেয় — ঠিক করা
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

            // Response parse করা
            const candidate = response.data?.candidates?.[0];

            if (!candidate?.content?.parts) {
                // Safety filter বা অন্য কারণে block হতে পারে
                const reason = candidate?.finishReason || 'UNKNOWN';
                throw new Error(`No content. Finish reason: ${reason}`);
            }

            // ★ Thinking parts ফিল্টার করা
            // Gemini 2.5 Flash thinking mode এ thought parts আসতে পারে
            const textParts = candidate.content.parts
                .filter(p => !p.thought)     // thinking output বাদ
                .map(p => p.text)
                .filter(Boolean);

            const text = textParts.join('\n').trim();

            if (!text) {
                throw new Error('Empty text after filtering');
            }

            console.log(`✅ [Gemini] Success on attempt ${attempt}`);
            return text;

        } catch (error) {
            const status = error.response?.status;
            const errMsg = error.response?.data?.error?.message || error.message;
            console.error(`❌ [Gemini] Attempt ${attempt}: [${status || 'N/A'}] ${errMsg}`);

            // Auth error → retry করে লাভ নেই
            if (status === 403 || status === 401) {
                throw error;
            }

            // শেষ attempt না হলে wait
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