require('dotenv').config();
const express = require('express');

const db = require('./database');
const utils = require('./utils');
const messenger = require('./messenger');
const ai = require('./ai');  // ★ openrouter এর বদলে ai router

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

db.connectDB();

// Render জাগিয়ে রাখা
if (process.env.RENDER_URL) {
    setInterval(async () => {
        try {
            const axios = require('axios');
            await axios.get(process.env.RENDER_URL);
            console.log('⏰ Self-ping OK');
        } catch (e) { }
    }, 13 * 60 * 1000);
}

// Health Check
app.get('/', (req, res) => {
    res.status(200).json({ status: 'alive', uptime: Math.floor(process.uptime()) + 's' });
});

// Webhook Verification
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Webhook Events
app.post('/webhook', async (req, res) => {
    const body = req.body;
    if (body.object !== 'page') return res.sendStatus(404);

    res.status(200).send('EVENT_RECEIVED');

    for (const entry of body.entry) {
        if (!entry.messaging || entry.messaging.length === 0) continue;
        const event = entry.messaging[0];
        const senderId = event.sender.id;

        if (process.env.ADMIN_SENDER_ID && senderId !== process.env.ADMIN_SENDER_ID) continue;

        try {
            if (event.message) {
                await handleMessage(senderId, event);
            } else if (event.postback) {
                await handlePostback(senderId, event.postback);
            }
        } catch (error) {
            console.error(`❌ Error:`, error.message);
            try {
                await messenger.sendTextMessage(senderId, '❌ সমস্যা হয়েছে। আবার চেষ্টা করুন।');
            } catch (e) { }
        }
    }
});

// ═══════════════════════════════════════
// ★ Message Handler
// ═══════════════════════════════════════

async function handleMessage(senderId, event) {
    // Quick Reply → Postback হিসেবে handle
    if (event.message.quick_reply) {
        await handlePostback(senderId, { payload: event.message.quick_reply.payload });
        return;
    }

    let userText = event.message.text || "";
    let base64Image = null;
    const command = userText.trim().toLowerCase();

    // ───── Commands ─────

    if (command === '/clear') {
        await db.clearHistory(senderId);
        await messenger.sendTextMessage(senderId, "✅ চ্যাট মেমরি মুছে ফেলা হয়েছে!");
        return;
    }

    if (command === '/help') {
        await messenger.sendButtonTemplate(senderId,
            "🤖 AI চ্যাটবট\n\nযেকোনো প্রশ্ন বা ছবি পাঠান!",
            [
                { type: "postback", title: "🗑️ মেমরি মুছুন", payload: "CMD_CLEAR" },
                { type: "postback", title: "🔄 মডেল বদলান", payload: "CMD_MODELS" },
                { type: "postback", title: "ℹ️ স্ট্যাটাস", payload: "CMD_STATUS" }
            ]
        );
        return;
    }

    if (command === '/model' || command === '/models') {
        const currentProvider = await db.getProvider(senderId);
        const currentModel = await db.getUserModel(senderId);

        await messenger.sendQuickReplies(senderId,
            `📍 বর্তমান:\n• Provider: ${currentProvider}\n• Model: ${currentModel || 'Default'}\n\nনতুন মডেল বেছে নিন:`,
            [
                { title: "⚡ Gemini 2.5 Flash", payload: "MODEL_google:gemini-2.5-flash" },
                { title: "🔥 Gemini 2.0 Flash", payload: "MODEL_google:gemini-2.0-flash" },
                { title: "💨 Gemini Flash Lite", payload: "MODEL_google:gemini-2.0-flash-lite" },
                { title: "🧠 DeepSeek R1", payload: "MODEL_openrouter:deepseek/deepseek-r1-0528:free" },
                { title: "🌀 Step Flash", payload: "MODEL_openrouter:stepfun/step-3.5-flash:free" },
                { title: "🎲 Auto (OR)", payload: "MODEL_openrouter:openrouter/free" }
            ]
        );
        return;
    }

    // ───── Attachments ─────

    if (event.message.attachments) {
        const attachment = event.message.attachments[0];
        if (attachment.type === 'image') {
            console.log('📷 Image received!');
            base64Image = await utils.imageUrlToBase64(attachment.payload.url);
            if (!base64Image) {
                await messenger.sendTextMessage(senderId, "⚠️ ছবি প্রসেস করতে পারিনি।");
                return;
            }
        } else if (attachment.type === 'audio') {
            await messenger.sendTextMessage(senderId, "🎤 ভয়েস মেসেজ এখনো সাপোর্ট করি না।");
            return;
        } else if (!userText) {
            await messenger.sendTextMessage(senderId, "⚠️ শুধু টেক্সট ও ছবি সাপোর্ট করি।");
            return;
        }
    }

    if (!userText && !base64Image) return;

    // ───── AI Response ─────

    await messenger.sendTypingOn(senderId);

    const provider = await db.getProvider(senderId);
    const model = await db.getUserModel(senderId);
    const chatHistory = await db.getChatHistory(senderId);

    // ★ ai.js রাউটার — provider অনুযায়ী সঠিক API কল করবে
    const aiReply = await ai.getAiResponse(
        chatHistory, userText, base64Image,
        senderId, provider, model
    );

    const cleanReply = utils.cleanText(aiReply);

    // DB তে সেভ
    if (userText && base64Image) {
        await db.saveMessage(senderId, 'user', userText + " [📷 ছবিসহ]");
    } else if (userText) {
        await db.saveMessage(senderId, 'user', userText);
    } else {
        await db.saveMessage(senderId, 'user', "[📷 ছবি]");
    }
    await db.saveMessage(senderId, 'assistant', cleanReply);

    await messenger.sendTypingOff(senderId);
    await messenger.sendTextMessage(senderId, cleanReply);
}

// ═══════════════════════════════════════
// ★ Postback Handler (বাটন + Quick Reply)
// ═══════════════════════════════════════

async function handlePostback(senderId, postback) {
    const payload = postback.payload;

    // মডেল সিলেক্ট: "MODEL_google:gemini-2.5-flash"
    if (payload.startsWith('MODEL_')) {
        const parts = payload.replace('MODEL_', '').split(':');
        const provider = parts[0];           // "google" বা "openrouter"
        const model = parts.slice(1).join(':'); // মডেল নাম (: থাকতে পারে)

        await db.setProvider(senderId, provider);
        await db.setUserModel(senderId, model);

        const providerEmoji = provider === 'google' ? '🟢 Google' : '🟠 OpenRouter';
        await messenger.sendTextMessage(senderId,
            `✅ পরিবর্তন সম্পন্ন!\n\n• Provider: ${providerEmoji}\n• Model: ${model}`
        );
        return;
    }

    switch (payload) {
        case 'CMD_CLEAR':
            await db.clearHistory(senderId);
            await messenger.sendTextMessage(senderId, "✅ মেমরি মুছে ফেলা হয়েছে!");
            break;

        case 'CMD_MODELS':
            await messenger.sendQuickReplies(senderId,
                "কোন মডেল ব্যবহার করবেন?",
                [
                    { title: "⚡ Gemini 2.5 Flash", payload: "MODEL_google:gemini-2.5-flash" },
                    { title: "🔥 Gemini 2.0 Flash", payload: "MODEL_google:gemini-2.0-flash" },
                    { title: "💨 Gemini Flash Lite", payload: "MODEL_google:gemini-2.0-flash-lite" },
                    { title: "🧠 DeepSeek R1", payload: "MODEL_openrouter:deepseek/deepseek-r1-0528:free" },
                    { title: "🌀 Step Flash", payload: "MODEL_openrouter:stepfun/step-3.5-flash:free" },
                    { title: "🎲 Auto (OR)", payload: "MODEL_openrouter:openrouter/free" }
                ]
            );
            break;

        case 'CMD_STATUS':
            const prov = await db.getProvider(senderId);
            const mod = await db.getUserModel(senderId);
            const hist = await db.getChatHistory(senderId);
            const provEmoji = prov === 'google' ? '🟢 Google' : '🟠 OpenRouter';

            await messenger.sendTextMessage(senderId,
                `📊 বট স্ট্যাটাস\n\n` +
                `• Provider: ${provEmoji}\n` +
                `• Model: ${mod || 'Default'}\n` +
                `• মেমরি: ${hist.length}টি মেসেজ\n` +
                `• আপটাইম: ${Math.floor(process.uptime())}s`
            );
            break;

        case 'GET_STARTED':
            await messenger.sendTextMessage(senderId,
                "👋 স্বাগতম!\n\n" +
                "আমি AI চ্যাটবট। যেকোনো প্রশ্ন করুন বা ছবি পাঠান!\n\n" +
                "📋 কমান্ড:\n" +
                "/help — সাহায্য\n" +
                "/model — মডেল বদলান\n" +
                "/clear — মেমরি মুছুন"
            );
            break;

        default:
            await messenger.sendTextMessage(senderId, "🤔 অপরিচিত কমান্ড। /help লিখুন।");
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});