const gemini = require('./gemini');
const openrouter = require('./openrouter');
const messenger = require('./messenger');

const DEFAULTS = {
    google: 'gemini-2.5-flash',
    openrouter: 'openrouter/auto'
};

// OpenRouter provider-এ ছবি একবার process করার জন্য Gemini bridge model
const IMAGE_BRIDGE_MODEL = 'gemini-3-flash-preview';

// ═══════════════════════════════════════
// ★ মূল AI Response ফাংশন
// ═══════════════════════════════════════
//
// pendingImages: base64 array (DB থেকে আসে)
//
// Google provider:
//   → প্রতিটি message-এ সব pending images পাঠানো হয়
//   → images কখনো auto-clear হয় না, শুধু /clear তে মুছে যায়
//
// OpenRouter provider:
//   → ছবি থাকলে একবারের জন্য Gemini bridge model দিয়ে process
//   → তারপর images clear, এরপর থেকে OpenRouter text-only

async function getAiResponse(chatHistory, userText, pendingImages, senderId, provider, model) {
    provider = provider || 'google';
    model = model || DEFAULTS[provider] || DEFAULTS.google;
    pendingImages = pendingImages || [];

    console.log(`\n🤖 Provider: ${provider} | Model: ${model} | Images: ${pendingImages.length}`);

    // ─────────────────────────────────
    // Google Provider
    // ─────────────────────────────────
    if (provider === 'google') {
        try {
            // images প্রতিবারই পাঠানো হয়, clear না হওয়া পর্যন্ত
            return await gemini.getResponse(chatHistory, userText, pendingImages, model);

        } catch (error) {
            console.error(`❌ Google "${model}" failed. Trying OpenRouter fallback...`);

            if (senderId) {
                await messenger.sendTextMessage(senderId,
                    '⚠️ Google মডেল সমস্যা। OpenRouter ব্যাকআপ ব্যবহার করছি...'
                );
            }

            try {
                // Fallback: text-only OpenRouter
                return await openrouter.getResponse(chatHistory, userText, DEFAULTS.openrouter, 2);
            } catch (e) {
                console.error('❌ OpenRouter fallback also failed');
                return 'দুঃখিত, সব AI মডেল এখন সমস্যায় আছে। কিছুক্ষণ পর চেষ্টা করুন। 🙏';
            }
        }
    }

    // ─────────────────────────────────
    // OpenRouter Provider
    // ─────────────────────────────────
    else {
        // ছবি আছে → Gemini bridge দিয়ে একবার process
        if (pendingImages.length > 0) {
            console.log(`📷 Image bridge: ${IMAGE_BRIDGE_MODEL}`);
            try {
                return await gemini.getResponse(chatHistory, userText, pendingImages, IMAGE_BRIDGE_MODEL);
                // server.js এ response পাওয়ার পর pendingImages clear হবে
            } catch (error) {
                console.error(`❌ Image bridge failed: ${error.message}. Falling back to text-only...`);
                if (senderId) {
                    await messenger.sendTextMessage(senderId,
                        '⚠️ ছবি বিশ্লেষণে সমস্যা। টেক্সট উত্তর দিচ্ছি...'
                    );
                }
                // Bridge fail করলেও images clear হবে (server.js এ)
            }
        }

        // Text-only OpenRouter call
        try {
            return await openrouter.getResponse(chatHistory, userText, model);

        } catch (error) {
            console.error(`❌ OpenRouter "${model}" failed. Trying Google fallback...`);

            if (senderId) {
                await messenger.sendTextMessage(senderId,
                    '⚠️ OpenRouter সমস্যা। Google ব্যাকআপ ব্যবহার করছি...'
                );
            }

            try {
                return await gemini.getResponse(chatHistory, userText, [], DEFAULTS.google, 2);
            } catch (e) {
                console.error('❌ Google fallback also failed');
                return 'দুঃখিত, সব AI মডেল এখন সমস্যায় আছে। কিছুক্ষণ পর চেষ্টা করুন। 🙏';
            }
        }
    }
}

module.exports = { getAiResponse };
