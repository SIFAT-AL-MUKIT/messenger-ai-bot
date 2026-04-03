const gemini = require('./gemini');
const openrouter = require('./openrouter');
const messenger = require('./messenger');

// ডিফল্ট মডেল
const DEFAULTS = {
    google: 'gemini-2.5-flash',
    openrouter: 'openrouter/free'
};

// ═══════════════════════════════════════
// ★ মূল AI Response ফাংশন
// ═══════════════════════════════════════
// provider ও model অনুযায়ী সঠিক API কল করে
// ব্যর্থ হলে অন্য provider এ fallback করে

async function getAiResponse(chatHistory, userText, base64Image, senderId, provider, model) {
    provider = provider || 'google';
    model = model || DEFAULTS[provider] || DEFAULTS.google;

    console.log(`\n🤖 Provider: ${provider} | Model: ${model}`);

    // ─────────────────────────────────
    // Google (Primary Default)
    // ─────────────────────────────────
    if (provider === 'google') {
        try {
            return await gemini.getResponse(chatHistory, userText, base64Image, model);

        } catch (error) {
            console.error(`❌ Google "${model}" failed. Trying OpenRouter fallback...`);

            if (senderId) {
                await messenger.sendTextMessage(senderId,
                    `⚠️ Google মডেল সমস্যা। OpenRouter ব্যাকআপ ব্যবহার করছি...`
                );
            }

            // OpenRouter fallback
            try {
                // ছবি থাকলে OpenRouter এ সমস্যা হতে পারে, তাই সরিয়ে দেওয়া
                const fallbackText = base64Image && !userText
                    ? "ছবি বিশ্লেষণ করতে পারিনি। অন্যভাবে সাহায্য করুন।"
                    : userText;

                return await openrouter.getResponse(
                    chatHistory,
                    fallbackText,
                    base64Image ? null : null,  // ছবি সরানো
                    DEFAULTS.openrouter,
                    2  // কম retry
                );
            } catch (e) {
                console.error(`❌ OpenRouter fallback also failed`);
                return "দুঃখিত, সব AI মডেল এখন সমস্যায় আছে। কিছুক্ষণ পর চেষ্টা করুন। 🙏";
            }
        }
    }

    // ─────────────────────────────────
    // OpenRouter
    // ─────────────────────────────────
    else {
        try {
            return await openrouter.getResponse(chatHistory, userText, base64Image, model);

        } catch (error) {
            console.error(`❌ OpenRouter "${model}" failed. Trying Google fallback...`);

            if (senderId) {
                await messenger.sendTextMessage(senderId,
                    `⚠️ OpenRouter সমস্যা। Google ব্যাকআপ ব্যবহার করছি...`
                );
            }

            // Google fallback — Gemini সব ছবি support করে
            try {
                return await gemini.getResponse(
                    chatHistory,
                    userText,
                    base64Image,
                    DEFAULTS.google,
                    2
                );
            } catch (e) {
                console.error(`❌ Google fallback also failed`);
                return "দুঃখিত, সব AI মডেল এখন সমস্যায় আছে। কিছুক্ষণ পর চেষ্টা করুন। 🙏";
            }
        }
    }
}

module.exports = { getAiResponse };